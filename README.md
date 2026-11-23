# AngiSoft Technologies — Official Website

> **🛠 OPERATIONAL** — Current monorepo reference; release gates remain in `docs/PRODUCTION_READINESS.md`.<br>
> **Canonical plan:** `docs/ANGISOFT_DIGITAL_HQ_PLAN.md`

Full-stack corporate website and admin platform for [AngiSoft Technologies](https://angisoft.co.ke), a Kenyan software company delivering custom development, data analysis, and digital services.

## Architecture (Current Monorepo)

```
robust-portfolio/
├── frontend/web/      angisoft-web — React 19 + Vite 8.3.8 (`@vitejs/plugin-react` 6.3.0) + TS + Tailwind 4 (Netlify)
├── frontend/admin/    angisoft-admin — React 19 + Vite 8.3.8 (`@vitejs/plugin-react` 6.3.0) + TS + Tailwind 4 (Netlify)
├── backend/           Express + TypeScript + Prisma 8 (Fly.io via Docker)
│   └── src/modules/   15 domain modules + shared/
├── packages/          10 shared TS libs (@angisoft/ui, api-client, auth, realtime, offline, ai, config, i18n, types, utils)
├── infrastructure/    docker/Dockerfile, netlify/
├── docs/              Architecture & testing guides (canonical: ANGISOFT_DIGITAL_HQ_PLAN.md)
└── .github/           CI workflows, issue & PR templates
```

| Layer | Stack | Hosting |
|-------|-------|---------|
| Frontend (web) | React 19, Vite 8.3.8 (`@vitejs/plugin-react` 6.3.0), Tailwind CSS 4, MUI 7 | Netlify (`angisoft.co.ke`) |
| Frontend (admin) | React 19, Vite 8.3.8 (`@vitejs/plugin-react` 6.3.0), Tailwind CSS 4, MUI 7 | Netlify (`admin.angisoft.co.ke`) |
| Backend | Express, TypeScript, Prisma 8 ORM, Neon PostgreSQL | Fly.io (Docker, `company-portfolio`) |
| Storage | Tigris (S3-compatible) `my-company-portfolio` bucket | `cdn.angisoft.co.ke` |
| Payments | Stripe, PayPal, PayHero/Daraja and Paystack integrations (live credentials/provisioning pending) | — |
| AI | Neon AI Gateway (OpenAI, Anthropic, Gemini, etc.) | — |
| Email | Zoho Mail SMTP | — |
| Queue/Cache | BullMQ + Upstash Redis | — |
| Realtime | Socket.IO + Redis adapter | — |


## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, coding conventions, and PR guidelines.

## License

[MIT](LICENSE) — AngiSoft Technologies, 2026.
