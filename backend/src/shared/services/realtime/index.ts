import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { verifyAccessToken } from '../../../modules/identity/utils/token';
import prisma from '../../../db';
import { getRedisUrl, createRedisClient, probeRedis } from '../redis';

/**
 * Realtime layer (Socket.IO) — connected to the same HTTP server as Express.
 *
 * Rooms:
 *   user:<id>     — authenticated user (JWT `sub`). Personal events.
 *   staff         — every authenticated staff/admin socket. Booking/ops events.
 *   booking:<id>  — authorized watchers of one booking (customer or staff).
 *
 * Auth model:
 *   - Client passes the access token in `auth.token` on the handshake
 *     (same in-memory token the frontend already keeps; never stored).
 *   - Token optional: anonymous sockets (public booking tracking page) can
 *     still join a booking room AFTER proving knowledge of
 *     publicReference + trackingToken (or staff role + id).
 *   - Everything fails closed: bad token → socket rejected; unauthorized
 *     `booking:join` → ack error, room not joined.
 */

let io: Server | null = null;
let redisPub: ReturnType<typeof createRedisClient> | null = null;
let redisSub: ReturnType<typeof createRedisClient> | null = null;

const STAFF_ROLES = ['ADMIN', 'SUPER_ADMIN', 'MARKETING', 'MANAGER', 'DEVELOPER'];

/** Attach the Redis adapter so rooms/events broadcast across Fly machines. */
async function attachRedisAdapter(server: Server): Promise<void> {
    if (!getRedisUrl()) return;
    try {
        // Probe first. When Redis is unreachable we attach NOTHING: the
        // adapter's psubscribe rejects after 20 retries
        // (MaxRetriesPerRequestError) and an unhandled rejection there kills
        // the process — the crash-loop we saw on Fly. In-process broadcast
        // keeps the app serving (single-instance mode) until Redis recovers.
        const reachable = await probeRedis(2500);
        if (!reachable) {
            console.warn('⚠️ Realtime: Redis unreachable — using in-process broadcast (single-instance mode)');
            return;
        }
        const { createAdapter } = await import('@socket.io/redis-adapter');
        redisPub = createRedisClient();
        redisSub = createRedisClient();
        server.adapter(createAdapter(redisPub, redisSub));
        console.log('📡 Realtime using Redis adapter (multi-instance)');
    } catch (err) {
        console.warn('⚠️ Realtime Redis adapter unavailable — falling back to in-process broadcast:', (err as any)?.message || err);
        await Promise.allSettled([redisPub?.quit(), redisSub?.quit()]);
        redisPub = null;
        redisSub = null;
    }
}

export function initRealtime(server: HttpServer, origins: string[]): Server {
  if (io) return io;

  io = new Server(server, {
    path: '/socket.io',
    cors: { origin: origins, credentials: true },
  });

  // Fire-and-forget: adapter attach never blocks boot.
  attachRedisAdapter(io).catch(() => {});

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== 'string') {
      socket.data.auth = null;
      return next();
    }
    try {
      const payload: any = verifyAccessToken(token);
      if (!payload?.sub) throw new Error('missing sub');
      socket.data.auth = { sub: String(payload.sub), role: payload.role ? String(payload.role) : undefined };
      return next();
    } catch {
      return next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const auth = socket.data.auth as { sub: string; role?: string } | null;

    if (auth?.sub) {
      socket.join(`user:${auth.sub}`);
      if (auth.role && STAFF_ROLES.includes(auth.role)) {
        socket.join('staff');
      }
    }

    socket.on('booking:join', async (payload: any, ack?: (res: { ok: boolean; error?: string }) => void) => {
      const done = (res: { ok: boolean; error?: string }) => {
        if (typeof ack === 'function') ack(res);
      };
      try {
        const bookingId: string | undefined = payload?.bookingId;
        const reference: string | undefined = payload?.reference;
        const token: string | undefined = payload?.token;

        let booking: { id: string; assignedToId?: string | null } | null = null;

        if (bookingId && typeof bookingId === 'string') {
          if (!auth?.role) return done({ ok: false, error: 'authenticated_only' });
          booking = await prisma.orm.public.Booking
            .where({ id: bookingId })
            .select('id', 'assignedToId')
            .first();
          if (!booking) return done({ ok: false, error: 'not_found' });
          const canManageAll = ['ADMIN', 'SUPER_ADMIN', 'MARKETING', 'MANAGER'].includes(auth.role);
          if (!canManageAll && booking.assignedToId !== auth.sub) {
            return done({ ok: false, error: 'forbidden' });
          }
        } else if (typeof reference === 'string' && typeof token === 'string') {
          // Anonymous customer proves knowledge of the tracking token.
          booking = await prisma.orm.public.Booking
            .where({ publicReference: reference, trackingToken: token })
            .select('id')
            .first();
          if (!booking) return done({ ok: false, error: 'not_found' });
        } else {
          return done({ ok: false, error: 'invalid_payload' });
        }

        socket.join(`booking:${booking.id}`);
        return done({ ok: true });
      } catch (err) {
        console.error('booking:join error', (err as any)?.message || err);
        return done({ ok: false, error: 'error' });
      }
    });

    socket.on('booking:leave', (payload: any) => {
      const bookingId = payload?.bookingId;
      if (bookingId) socket.leave(`booking:${bookingId}`);
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function emitToStaff(event: string, payload: unknown): void {
  io?.to('staff').emit(event, payload);
}

export function emitToBooking(bookingId: string, event: string, payload: unknown): void {
  io?.to(`booking:${bookingId}`).emit(event, payload);
}

export function closeRealtime(): void {
  io?.close();
  io = null;
  if (redisPub || redisSub) {
    Promise.allSettled([redisPub?.quit(), redisSub?.quit()]);
    redisPub = null;
    redisSub = null;
  }
}