# Contributing to AngiSoft Technologies

Thank you for your interest in contributing! This guide will help you get started.

## Getting Started

1. **Fork** the repository and clone your fork locally.
2. **Install dependencies** for both frontend and backend:

   ```bash
   cd frontend && npm install
   cd ../backend && npm install
   ```

3. **Set up environment variables** — copy `.env.example` to `.env` in the backend directory and configure your database connection.

4. **Run migrations and seed** (backend):

   ```bash
   npx prisma generate
   npx prisma migrate dev
   npm run prisma:seed
   ```

5. **Start dev servers**:

   ```bash
   # Terminal 1 — backend
   cd backend && npm run dev

   # Terminal 2 — frontend
   cd frontend && npm run dev
   ```

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
