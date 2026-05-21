# AngiSoft Technologies — Official Website

Full-stack corporate website and admin platform for [AngiSoft Technologies](https://angisoft.co.ke), a Kenyan software company delivering custom development, data analysis, and digital services.

## Architecture

```
robust-portfolio/
├── frontend/          React + Vite (Netlify)
├── backend/           Express + TypeScript (Railway)
│   └── prisma/        PostgreSQL schema & migrations
├── docs/              Architecture & testing guides
└── .github/           CI workflows, issue & PR templates
```

| Layer | Stack | Hosting |
|-------|-------|---------|
| Frontend | React 19, Vite 7, Tailwind CSS 4, MUI, Redux Toolkit | Netlify |
| Backend | Express, TypeScript, Prisma ORM, Neon PostgreSQL | Railway (Docker) |
| Storage | S3-compatible (AWS/R2) for uploads | Cloud |
| Payments | Stripe | — |
| AI | OpenAI / Hugging Face chatbot | — |
| Email | Zoho Mail SMTP | — |

## Quick Start

### Prerequisites

- Node.js >= 22
- PostgreSQL database (e.g. [Neon](https://neon.tech))

### 1. Backend

```bash
cd backend
cp .env.example .env          # fill in DATABASE_URL and secrets
npm install
npx prisma generate
npm run prisma:migrate:dev    # create tables
npm run prisma:seed           # seed sample data
npm run dev                   # API at http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                   # Vite at http://localhost:5173
```

The Vite dev server proxies `/api` and `/uploads` to the backend.

### 3. Run Tests

```bash
cd backend && npm test        # Vitest + Supertest
cd frontend && npm run lint   # ESLint
```

## Deployment

| Component | Platform | Trigger |
|-----------|----------|---------|
| Frontend | Netlify | Push to `main` (`.github/workflows/netlify-deploy.yml`) |
| Backend | Railway | Docker build from `backend/Dockerfile` |

## Key Features

- **Public site** — services, projects, staff profiles, blog, testimonials, AI chatbot
- **Admin CMS** — role-based dashboard (ADMIN, MARKETING, DEVELOPER) for managing all public content
- **Staff portal** — self-service profiles, client tracking, project management
- **Payments** — Stripe checkout for paid services
- **Blog** — org-authored posts with drafts and publish workflow

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, coding conventions, and PR guidelines.

## License

[MIT](LICENSE) — AngiSoft Technologies, 2026.
