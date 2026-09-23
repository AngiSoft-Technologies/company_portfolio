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


## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, coding conventions, and PR guidelines.

## License

[MIT](LICENSE) — AngiSoft Technologies, 2026.
