# StudioPass — Requirements (Week 1)

Credit-based class booking for independent fitness & yoga studios. Prototype scope: **one studio network with multiple locations** (placeholder data uses four NYC locations).

## Goal

Replace paper sign-ins, spreadsheets and generic calendars with one system for booking, scheduling and reporting.

## Users and capabilities

### Members
| ID | Requirement | Status |
|----|-------------|--------|
| M1 | Create an account (name, email, password, home ZIP); usable immediately | Done (no email verification) |
| M2 | Buy a credit package through a **simulated** purchase | Done |
| M3 | Search and filter classes by discipline, level (intensity), ZIP code and keyword | Done |
| M4 | Book a class with credits; capacity enforced at booking | Done |
| M5 | View upcoming and past reservations | Done |
| M6 | Change a reservation to another session | Done |
| M7 | Cancel a reservation (refund if ≥ 12 h before class) | Done |
| M8 | See credit balance and transaction history | Done |

### Instructors
| ID | Requirement | Status |
|----|-------------|--------|
| I0 | Create an instructor account (same sign-up form) | Done |
| I1 | Submit a class proposal (title, discipline, level, location, capacity, credits, first session, weekly repeats) | Done |
| I2 | Track proposal status: pending, approved, rejected (with admin note) | Done |
| I3 | View rosters for their sessions | Done |
| I4 | Mark attendance (attended / no-show) | Done |

### Admin
| ID | Requirement | Status |
|----|-------------|--------|
| A1 | Approve or reject proposals; approval creates the class and its sessions | Done |
| A2 | Add and edit classes (instructor, location, capacity, credit cost, active/archived) | Done |
| A3 | Add sessions; change time, capacity or price of a session | Done |
| A4 | Cancel a session; every booked member is refunded automatically | Done |
| A5 | Tag studios (locations) and instructors by ZIP code | Done |
| A6 | Override the credit price of a single session | Done |

### Planned for weeks 5–6 (not built yet)
- Utilization, revenue and ZIP-code reports / dashboards.
- Rule-based dynamic pricing. Example rule from the deck: if a class is more than 80% full for three sessions in a row, raise its price by one credit. The hook is `lib/server/services/pricing.js`.
- Real database (Supabase/Postgres) and real authentication (hashed passwords, signed sessions).
- Bug fixes, demo prep and final report.

## Business rules

- A session cannot take more bookings than its capacity. A spot is taken by a booking whose status is `booked`, `attended` or `no_show`.
- A member cannot book the same session twice, cannot book a session that has started, and needs enough credits.
- Price of a session = the session's credit override if set, otherwise the class's credit cost.
- Cancelling at least **12 hours** before class refunds the credits. A later cancellation keeps the credits (late cancel).
- Changing a booking is allowed only outside the 12-hour window. The old booking is refunded in full and the new one is charged.
- An admin cannot lower a session's capacity below the number of people already booked.
- Cancelling a session refunds every booked member in full.
- Price changes do not affect existing bookings. Members pay the price shown when they booked.
- Attendance can be marked from 60 minutes before class onward.

## Non-functional

- Runs locally with `npm run dev`; no paid services needed for the prototype.
- Works on phone and desktop browsers.
- Built with Next.js; the backend is Next.js API routes (`app/api/`).
- Data layer isolated in `lib/server/db/` so the dummy JSON store can be replaced by Supabase.
- Accounts are keyed by email. Sign-up rejects an email that is already taken; passwords are stored as plain text (prototype only).
