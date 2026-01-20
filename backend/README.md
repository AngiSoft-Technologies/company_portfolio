AngiSoft Backend (Postgres + Prisma)

This backend is a production-ready scaffold using Node.js, Express, TypeScript, and Prisma (Postgres).

Quick start (local):

1. Copy `.env.example` to `.env` and set `DATABASE_URL`.
2. Install dependencies:

   npm install

3. Generate Prisma client and run migrations (create DB first):

   npx prisma generate
   npx prisma migrate dev --name init
   # After migrations, seed the database
   ADMIN_PASSWORD=YourStrongPass npm run prisma:seed

4. Run in dev:

   npm run dev


Tests and CI
------------

- Run tests locally:

   npm test

- CI will run `npx prisma generate` and `npm test`. Ensure `DATABASE_URL` is set in CI secrets if tests require access to a real DB.

