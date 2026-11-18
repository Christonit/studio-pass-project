# StudioPass — Entity Relationship Diagram (Week 1)

GitHub and VS Code render this Mermaid diagram. The Postgres tables are created by [`db/migrations/001_init.sql`](../db/migrations/001_init.sql).

```mermaid
erDiagram
    USERS ||--o{ BOOKINGS : "member makes"
    USERS ||--o{ CREDIT_TRANSACTIONS : "member owns"
    USERS ||--o{ CLASSES : "instructor teaches"
    USERS ||--o{ PROPOSALS : "instructor submits"
    LOCATIONS ||--o{ CLASSES : hosts
    LOCATIONS ||--o{ PROPOSALS : "proposed at"
    CLASSES ||--o{ SESSIONS : "scheduled as"
    SESSIONS ||--o{ BOOKINGS : has
    CREDIT_PACKAGES ||--o{ CREDIT_TRANSACTIONS : "bought as"
    BOOKINGS ||--o{ CREDIT_TRANSACTIONS : "charged / refunded"
    PROPOSALS |o--o| CLASSES : "approved into"

    USERS {
        text email PK "the user's id"
        text password "plain text (prototype only)"
        text role "member | instructor | admin"
        text name
        char5 zip
        int credits "members only: current balance"
        text[] zip_tags "instructors: ZIPs they serve"
        text bio
        timestamptz created_at
    }
    LOCATIONS {
        int id PK
        text name
        text neighborhood
        text address
        char5 zip
        text[] zip_tags "nearby ZIPs this studio serves"
    }
    CLASSES {
        int id PK
        text title
        text discipline
        text level "Beginner | Intermediate | Advanced"
        text description
        text instructor_email FK
        int location_id FK
        int duration_min
        int capacity "default for new sessions"
        int credit_cost "base price"
        text status "active | archived"
        int proposal_id FK
        text created_by FK "admin email"
    }
    SESSIONS {
        int id PK
        int class_id FK
        timestamptz starts_at
        int capacity
        int credit_override "null = use class price"
        text status "scheduled | cancelled"
        text cancel_reason
    }
    BOOKINGS {
        int id PK
        int session_id FK
        text member_email FK
        text status "booked | cancelled | attended | no_show"
        int credits_spent
        int refunded_credits
        timestamptz created_at
        timestamptz cancelled_at
    }
    CREDIT_PACKAGES {
        int id PK
        text name
        int credits
        numeric price_usd
        bool active
    }
    CREDIT_TRANSACTIONS {
        int id PK
        text member_email FK
        int delta "+ purchase/refund, - booking"
        text type "purchase | booking | refund | adjustment"
        int package_id FK
        int booking_id FK
        numeric amount_usd
        text note
        timestamptz created_at
    }
    PROPOSALS {
        int id PK
        text instructor_email FK
        text title
        text discipline
        text level
        text description
        int location_id FK
        int duration_min
        int capacity
        int credit_cost
        timestamptz first_session_at
        int weekly_repeats
        text status "pending | approved | rejected"
        text admin_note
        text reviewed_by FK "admin email"
        timestamptz reviewed_at
        int class_id FK
    }
```

## Notes

- **Users are keyed by email.** `users.email` is the primary key, and everything a user creates or owns points back to it: `bookings.member_email`, `credit_transactions.member_email`, `proposals.instructor_email`, `classes.instructor_email`, and `created_by` / `reviewed_by` for admin actions.
- **Passwords are plain text** on purpose: it's a student prototype. Sign-up only checks the email isn't already taken.
- **Credits** are stored as a running balance on `users.credits` *and* as an append-only ledger in `credit_transactions`. The balance always equals the sum of the member's ledger deltas, and the tests check this.
- **Price** of a session is `coalesce(sessions.credit_override, classes.credit_cost)`. The rule-based dynamic pricing planned for week 5 will write to `credit_override`.
- **ZIP filtering**: a class matches a ZIP when its location's `zip` equals it or the location's `zip_tags` contain it.
