# Project Structure

High-level overview of the repository layout.

- `src/app` — Next.js app routes and page components. Contains top-level layout, auth pages, admin pages, and sales pages.
- `src/api` — Serverless API route handlers organized by feature (admin, attendance, auth, commissions, etc.).
- `src/components` — Reusable React components (Navbar, Toast, Modals, etc.).
- `src/context` — React context providers (Auth, Theme).
- `src/hooks` — Custom hooks (useAuth, useTheme, useProtectedRoute, etc.).
- `src/lib` — Server utilities and helpers (MongoDB connector, push, kpi calculator, export helpers).
- `src/models` — Mongoose model definitions (User, Attendance, Commission, etc.).
- `src/types` — Custom TypeScript declaration files.
- `public` — Static assets and service worker.
- `docs` — Project documentation (this folder).

Look at individual files for more details. When changing DB schemas, update corresponding models in `src/models` and any calculators in `src/lib`.
