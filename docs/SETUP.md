# Setup

Steps to get the project running locally.

1. Install dependencies

```bash
npm install
```

2. Create environment file

Create `.env.local` in the project root with at least:

- `MONGODB_URI` — connection string for MongoDB
- Any push or third-party keys used by `src/lib/push.ts`

3. Development server

```bash
npm run dev
```

4. Build for production

```bash
npm run build
npm run start
```

5. Useful scripts

- `npm run lint` — run linter (if configured)
- `npm test` — run tests (if present)
