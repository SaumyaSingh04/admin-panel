# Admin panel

A standalone Next.js app for running the platform. It talks to the existing admin API in
`backend/marketing_backend` (`/api/v1/admin-panel/*`, `/api/v1/admin/*`, `/api/v1/ai/*`).
It has no database or server logic of its own.

## How it connects

- The browser only ever calls **this host**. `next.config.ts` rewrites `/api/v1/*` to
  `BACKEND_URL`, so the Better Auth session cookie is first-party to the admin host.
- Sign-in is Better Auth (`POST /api/v1/better-auth/sign-in/email`). The backend's
  `authenticateAdmin` middleware then requires `users.role` to be `ADMIN` or
  `SUPER_ADMIN`, the account to be active, and the email to be verified.
- Accounts created through the main app's legacy `/auth/register` can sign in here too:
  the backend copies their password into Better Auth on first sign-in.

## Local setup

1. **Backend** (`backend/marketing_backend/.env`):
   ```env
   BETTER_AUTH_ENABLED=true
   BETTER_AUTH_SECRET=<at least 32 random characters>
   # The admin origin must be listed, or sign-in fails with "CSRF: request origin not allowed".
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5000
   ```
   Then run `npm run dev` (port 5000).

2. **Create the first SUPER_ADMIN** (from `backend/marketing_backend`, with its `.env` pointing
   at the database):
   ```bash
   SUPERADMIN_PASSWORD='StrongPass123' npm run seed:superadmin -- --email=you@example.com --name="Your Name"
   ```
   - No account with that email: one is created, already verified.
   - Existing account: it is promoted. Its password is kept unless you add `--reset-password`.
   - The password is set for both the admin panel and the main app's login. Re-running is safe.

   Everyone after that is managed in the panel under **Super admin → Admins & roles**
   (promote an existing account to `ADMIN`/`SUPER_ADMIN`, or remove access).

3. **Admin panel:**
   ```bash
   cd admin-panel
   cp .env.example .env.local   # BACKEND_URL=http://localhost:5000
   npm install
   npm run dev                  # http://localhost:3001
   ```

## Production

```bash
docker build --build-arg BACKEND_URL=https://api.revcoraos.com -t admin-panel .
docker run -p 3000:3000 admin-panel
```

- `BACKEND_URL` is compiled into the build, so changing it means rebuilding.
- Add the admin's public origin (e.g. `https://admin.revcoraos.com`) to the backend's
  `ALLOWED_ORIGINS`.
- Serve it over HTTPS, and preferably restrict access by IP or VPN as well.

## What's in it

| Section | Route | Notes |
| --- | --- | --- |
| Dashboard | `/` | Overview counts, recent jobs, top models |
| Users | `/users`, `/users/:id` | Search/filter, ban/unban, credit adjustments and role changes (SUPER_ADMIN), cache clear |
| Support | `/support` | Ticket thread, reply, status, close |
| Generations / Jobs | `/generations`, `/jobs` | Filters, live queue and worker stats, cancel (SUPER_ADMIN) |
| Feature flags | `/feature-flags` | Toggle switches, create, delete |
| Cache & health | `/system` | Per-scope cache clearing, provider health |
| Everything else | `/manage/<resource>` | AI providers/models/endpoints, tool registry, plans, coupons, top-ups, payments, subscriptions, credit ledger, blogs, content, audit logs |

`/manage/*` pages are driven by `lib/resources.tsx`. To add a section, add an entry
(endpoint, columns, and optionally create/edit/delete/actions) and a link in
`components/admin-shell.tsx`. Create and edit use a JSON body editor that is checked by
the backend's validators, and any validation errors are shown inline.

Permissions are always enforced by the backend. The UI hides SUPER_ADMIN-only buttons
for ADMIN accounts, but it doesn't grant anything.
