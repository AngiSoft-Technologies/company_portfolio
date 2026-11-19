/**
 * Dev-only workaround: this environment has no IPv6 route, and Node's
 * autoSelectFamily happy-eyeballs stalls when a hostname resolves to both
 * A and AAAA records (Neon pooler endpoints do). Forcing dns.lookup to IPv4
 * keeps `pg`/Prisma connections working locally.
 *
 * Usage: NODE_OPTIONS="--require ./scripts/force-ipv4.cjs" npm run dev
 */
const dns = require('dns');

const original = dns.lookup;
dns.lookup = function lookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  const opts = { ...(options || {}) };
  // Never downgrade an explicit IPv6 request; only fill in when family is unset.
  if (opts.family !== 6) opts.family = 4;
  if (opts.all) {
    return original.call(dns, hostname, opts, (err, addresses) => {
      if (err) return callback(err);
      callback(null, addresses.filter((a) => a.family === 4));
    });
  }
  return original.call(dns, hostname, opts, callback);
};
