# Contributing to AngiSoft Technologies

> **🛠 OPERATIONAL** — Update setup commands to monorepo (pnpm, turbo).<br>
> **Canonical plan:** `docs/ANGISOFT_DIGITAL_HQ_PLAN.md` §4 (Phased Delivery), §13 (Immediate Next Actions).

Thank you for your interest in contributing! This guide will help you get started.

## Getting Started (Monorepo)

1. **Fork** the repository and clone your fork locally.
2. **Install dependencies** (single command for all workspaces):

   ```bash
   pnpm install
   ```

3. **Set up environment variables** — edit `backend/.env` (gitignored, no `.env.example`) and configure your database connection.

4. **Run migrations and seed** (backend):

   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate dev
   npm run prisma:seed
   ```

5. **Start dev servers** (from repo root):

   ```bash
   # All dev servers (web:5173, admin:5174, backend:5000)
   pnpm dev

   # Or individually:
   pnpm dev:web
   pnpm dev:admin
   pnpm dev:backend
   ```

## Code Quality Gates (run before PR)

```bash
pnpm lint       # ESLint across all packages
pnpm typecheck  # TypeScript across all packages
pnpm test       # Vitest (backend only currently)
pnpm build      # Production build verification
```

CI will run these automatically; PRs failing any gate will be blocked.

## How to Contribute

### Reporting Bugs

- Search [existing issues](../../issues) first to avoid duplicates.
- Open a new issue using the **Bug report** template.
- Include steps to reproduce, expected behavior, and screenshots if applicable.

### Suggesting Features

- Open a new issue using the **Feature request** template.
- Describe the problem, proposed solution, and any alternatives considered.

### Submitting Changes

1. Create a new branch from `main`:

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. Make your changes, following the coding conventions below.
3. Test your changes:

   ```bash
   cd backend && npm test
   cd frontend && npm run lint
   ```

4. Commit using [Conventional Commits](https://www.conventionalcommits.org/):

   ```
   feat: add staff profile filtering
   fix(auth): correct token expiry check
   chore: update dependencies
   ```

5. Push your branch and open a Pull Request.

## Coding Conventions

- **Frontend**: React components use `PascalCase` filenames; hooks use `useX`. 2-space indentation with semicolons.
- **Backend**: Route files are lowercase or hyphenated (e.g., `staff-dashboard.ts`); exports use `camelCase`.
- Follow the existing style in the file you are editing — consistency over personal preference.

## Pull Request Guidelines

- Keep PRs focused on a single change.
- Include a clear description of what changed and why.
- Link related issues (e.g., `Closes #42`).
- Add screenshots for UI changes.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
