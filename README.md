# StudioPass

Credit-based class booking for independent fitness & yoga studios. CIS 9590 term project, Team 8.

Built with **Next.js 16** (App Router, React 19, plain JavaScript). The backend is **Next.js API routes** in `app/api/`, running on a **dummy JSON database**.

This build covers **weeks 1–4** of the timeline:

| Week | Deliverable | Where |
|------|-------------|-------|
| 1 | Requirements, ERD, Postgres schema | [`docs/requirements.md`](docs/requirements.md), [`docs/erd.md`](docs/erd.md), [`db/migrations/001_init.sql`](db/migrations/001_init.sql) |
| 2 | Database & core backend (accounts, classes) | `lib/server/` + `app/api/` |
| 3 | Booking, credits & proposals | `lib/server/services/bookings.js`, `credits.js`, `proposals.js` |
| 3–4 | Member, instructor & admin pages | `app/member/`, `app/instructor/`, `app/admin/` |

Week 5 reports are built: **Admin → Reports** (`app/admin/reports/`, `lib/server/services/reports.js`) shows revenue, class utilization, no-shows, studios, instructors and demand by member ZIP for the last 7/30/90 days or all time, and flags classes for a price change using the deck's pricing rule. The rule only suggests for now; applying it automatically, the real database, and demo prep are still to do.

## Run it

Requires Node 20.9+.

```bash
npm install
npm run dev      # http://localhost:3100
npm test         # business-rule tests (never touch your data)
npm run reset    # stop the dev server first, then rebuild data/db.json from the dummy seed
npm run db:seed-sql  # regenerate db/seed.sql (Postgres demo data) with fresh dates
```

Stop the dev server before `npm run reset`. Otherwise the running server keeps the old data in memory and writes it back on the next change.

## Accounts (prototype rules)

This is a student project, so accounts are deliberately simple:

- **Sign up** with name, email, password and ZIP, as a member or an instructor. The only check is that the email isn't already taken. There is no verification email: the account works immediately.
- **The email is the user's id.** It is the primary key of `users`, and everything an account creates points back to it: `bookings.member_email`, `credit_transactions.member_email`, `proposals.instructor_email`, `classes.instructor_email`, and `created_by` / `reviewed_by` for admin actions.
- **Passwords are stored as plain text** and compared directly.
- **Session** is an `sp_session` cookie holding the email. It is not signed, so it's fine for a demo but not for real users.
- **Admin accounts can't be created from sign-up**; use the seeded admin.

### Demo accounts

Every demo account uses the password **`studiopass`**. You can also click one on the sign-in page.

| Email | Role | Good for showing |
|-------|------|------------------|
| `taylor@example.test` | Member, ZIP 11211 | Upcoming bookings, change/cancel |
| `riley@example.test` | Member, 27 credits | Booking lots of classes |
| `morgan@example.test` | Member, 3 credits | Running low on credits |
| `casey@example.test` | Member, 0 credits | "Not enough credits", buying a package |
| `maya@studiopass.test` | Instructor | Rosters, attendance, a pending proposal |
| `jordan@studiopass.test` | Instructor | A rejected proposal with admin feedback |
| `admin@studiopass.test` | Admin | Approve proposals, manage sessions, ZIP tags |

## Dummy data

`lib/server/db/store.js` keeps every table in memory and saves it to `data/db.json` (git-ignored) after each change. `lib/server/db/seed.js` creates 4 NYC studios, 4 instructors, 16 members, 8 classes and about 40 sessions (five days back, nine days ahead) with realistic bookings. Dates are relative to the moment you seed, so run `npm run reset` if the demo data gets stale. Payments are simulated: buying a package just adds the credits.

## API routes

All routes live under `app/api/` and return JSON. Errors come back as `{ "error": "message" }` with a 4xx status.

| Area | Routes |
|------|--------|
| Auth | `POST /api/auth/signup` · `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` · `GET /api/auth/demo-users` |
| Catalog | `GET /api/meta` · `GET /api/credit-packages` · `GET /api/sessions?q=&discipline=&level=&zip=&days=&class_id=` · `GET /api/sessions/:id` |
| Member | `GET, POST /api/me/bookings` · `POST /api/me/bookings/:id/cancel` · `POST /api/me/bookings/:id/change` · `GET /api/me/credits` · `POST /api/me/credits/purchase` |
| Instructor | `GET, POST /api/instructor/proposals` · `GET /api/instructor/sessions` · `GET /api/instructor/sessions/:id/roster` · `POST /api/instructor/bookings/:id/attendance` |
| Admin | `GET /api/admin/proposals` · `POST /api/admin/proposals/:id/approve` · `.../reject` · `GET, POST /api/admin/classes` · `PATCH /api/admin/classes/:id` · `GET, POST /api/admin/classes/:id/sessions` · `PATCH /api/admin/sessions/:id` · `POST /api/admin/sessions/:id/cancel` · `GET /api/admin/sessions/:id/roster` · `GET, POST /api/admin/locations` · `PATCH /api/admin/locations/:id` · `GET /api/admin/instructors` · `PATCH /api/admin/instructors/:email` · `GET /api/admin/reports?days=7|30|90|all` |

Each route file is a few lines: it wraps a service function with `handler()` from `lib/server/http.js`, which reads the session cookie, checks the role, parses the JSON body and formats errors.

## Project layout

```
app/
  layout.js, globals.css      Fonts, toasts/dialogs provider, styles
  page.js                     Sign in / create account
  member/                     Find classes, My bookings, Credits
  instructor/                 Rosters & attendance, Class proposals
  admin/                      Proposals, Classes & sessions, Locations & ZIP tags, Reports
  api/                        Backend: Next.js route handlers
components/
  AppShell.js                 Header/nav for signed-in pages + useSession()
  AuthPanel.js                Sign-in and sign-up forms
  Providers.js                useToast(), useDialog(), useAttempt()
  ui.js                       Badges, capacity bar, empty states…
lib/
  client/                     Fetch helper and date/credit formatting
  server/
    config.js                 Disciplines, levels, business rules
    http.js                   Route-handler wrapper + session cookie
    session.js                Signed-in user for server layouts (role guards)
    db/                       Dummy JSON store + seed
    services/                 Business logic: auth, bookings, credits, proposals, admin, instructor, catalog, reports, pricing
test/api.test.js              23 tests
db/migrations/                Postgres schema (001_init.sql) and its undo
db/seed.sql                   Postgres demo data, generated from the dummy seed
scripts/                      reset.js, export-seed-sql.js
docs/                         Requirements, ERD
```

## Business rules (from the deck)

- Capacity is enforced at booking. A full class cannot be booked.
- Price = session override if set, otherwise the class price.
- Cancel ≥ 12 h before class → full refund. Later → no refund.
- Changing a booking refunds the old one and charges the new one, and is only allowed ≥ 12 h before class.
- An admin cancelling a session refunds everyone booked.
- Capacity cannot be lowered below the number already booked.
- A member's credit balance always equals the sum of their transaction ledger. The tests check this.

## Postgres database (Supabase or Railway)

The `db/` folder sets up a real, free Postgres database with the same tables and demo data as the dummy store:

| File | What it does |
|------|--------------|
| [`db/migrations/001_init.sql`](db/migrations/001_init.sql) | Creates all 8 tables, constraints, indexes and row level security. Run once on an empty database. |
| [`db/seed.sql`](db/seed.sql) | Optional demo data (the same accounts, classes and bookings as the app). Run after the migration. |
| [`db/migrations/001_init_down.sql`](db/migrations/001_init_down.sql) | Undo: **drops every StudioPass table and its data.** |

Both files run inside a transaction, so a failure leaves the database unchanged. They were tested on PostgreSQL 17.

**Supabase** (free tier): create a project → **SQL Editor** → **New query** → paste `001_init.sql` → **Run**. Then do the same with `seed.sql`.

**Railway**: don't paste the files into the **Data** tab's query box. It adds its own `LIMIT` to your query and fails with `syntax error at or near "LIMIT"`. Use the scripts instead. In your Postgres service open **Variables** and copy `DATABASE_PUBLIC_URL` (the one that works from your laptop), then:

```bash
export DATABASE_URL="paste-the-url-here"
npm run db:migrate   # create the tables
npm run db:seed      # load the demo data
```

`npm run db:reset` drops everything, re-creates the tables and re-seeds. `npm run db:down` drops everything. This works with Supabase too (use its connection string from **Connect**).

Notes:

- **Seed dates** are fixed when the file is generated. Run `npm run db:seed-sql` to regenerate `db/seed.sql` with fresh "five days back, nine days ahead" dates before a demo, then load it into an empty database (run the down + up migration first to clear it).
- **Row level security** is on with no policies. On Supabase this stops the public REST API (anon key) from reading the plain-text passwords. Connect the app with the database connection string instead; the owner role ignores RLS. It has no effect on Railway.
- **The app doesn't use Postgres yet.** It still reads `data/db.json`. To switch, rewrite the services in `lib/server/services/` to query Postgres (for example with the `postgres` npm package and `DATABASE_URL`) instead of `getDb()`. They're already `async`, so the API routes and pages don't change. Book, cancel and change should then run in one SQL transaction so the capacity and credit checks can't race.
