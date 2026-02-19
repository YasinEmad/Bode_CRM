# Bode CRM

Short documentation for the Bode CRM Next.js project. This repository contains a Next.js app that serves admin and sales interfaces plus various API routes and server-side utilities.

## Quick links
- Project setup: [docs/SETUP.md](docs/SETUP.md)
- Project structure: [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)
- API overview: [docs/API.md](docs/API.md)
- Contribution guide: [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)

## Prerequisites
- Node.js 18+
- npm or pnpm

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build & Start

```bash
npm run build
npm run start
```

## Environment

Create a `.env.local` file at the project root. See `src/lib/mongodb.ts` and `src/lib/push.ts` to identify required variables (DB URI, push keys, etc.).

## Where to look
- Pages and route handlers: src/app and src/api
- UI components: src/components
- Server helpers: src/lib
- Mongoose models: src/models
- Context and hooks: src/context, src/hooks

## Contributing
See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).
