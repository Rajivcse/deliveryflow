# INITIAL.md - DeliveryFlow Product Definition

> Internal Delivery Tracking System — MVP 1.0
> Run `/generate-prp INITIAL.md` when ready.

---

## PRODUCT

**Name:** DeliveryFlow

**Description:** An internal web application used by Delivery Managers and Product Managers to track the delivery progress of software-related work items — including New Venue Implementations, Change Requests, and Product Updates. Replaces tracking via emails, Excel sheets, and ad-hoc follow-ups with a single source of truth.

**Type:** Internal Tool (no public signup, no payments)

**Target Users:**
- **Delivery Manager** — creates work items, updates status, adds comments, marks completion
- **Product Manager** — monitors progress, tracks delays, reviews blocked items

---

## TECH STACK

| Layer | Choice |
|-------|--------|
| Backend | FastAPI + Python 3.11+ |
| Frontend | Next.js 14 + TypeScript (App Router) |
| Database | PostgreSQL + SQLAlchemy + Alembic |
| Auth | Google OAuth only (no email/password) |
| UI | Tailwind CSS + shadcn/ui |
| Payments | None |

---

## MODULES

---

### Module 1: Authentication

**Description:** Google OAuth 2.0 login with role-based access (Delivery Manager / Product Manager). No self-registration — users must be invited or pre-seeded by admin.

**Models:**
```
User:
  - id: int (PK)
  - email: str (unique)
  - full_name: str
  - avatar_url: str (nullable)
  - role: enum [delivery_manager, product_manager, admin]
  - is_active: bool (default true)
  - created_at: datetime

RefreshToken:
  - id: int (PK)
  - user_id: int (FK → User)
  - token: str (hashed)
  - expires_at: datetime
  - revoked: bool
```

**Endpoints:**
```
GET  /auth/google              - Redirect to Google consent
GET  /auth/google/callback     - Handle OAuth callback, issue JWT
POST /auth/refresh             - Refresh access token
POST /auth/logout              - Revoke refresh token
GET  /auth/me                  - Get current user profile
```

**Pages:**
```
/login    - Google Sign-In button (unauthenticated only)
/profile  - View/edit own profile (name, avatar)
```

---

### Module 2: Venue Implementation Tracking

**Description:** Track new venue onboarding projects such as Golf Club, Bowling, and Gaming venue setups. Each implementation has its own IWO number, lifecycle status, and assignee.

**Models:**
```
VenueImplementation:
  - id: int (PK)
  - iwo_number: str (unique)
  - venue_name: str
  - product_name: str
  - assigned_to_id: int (FK → User)
  - created_by_id: int (FK → User)
  - start_date: date
  - target_date: date
  - status: enum [not_started, in_progress, waiting_for_venue,
                  waiting_for_internal_team, blocked, completed]
  - last_updated_at: datetime (updated on every status change)
  - created_at: datetime

ImplementationComment:
  - id: int (PK)
  - implementation_id: int (FK → VenueImplementation)
  - author_id: int (FK → User)
  - body: str
  - created_at: datetime
```

**Status Values:** Not Started → In Progress → Waiting for Venue / Waiting for Internal Team → Blocked → Completed

**Business Rules:**
- If `last_updated_at` has not changed within `STALE_DAYS_THRESHOLD` days → surface as "Attention Required" on dashboard
- If status = Blocked → display prominently in the Blocked Items dashboard section

**Endpoints:**
```
GET    /api/v1/implementations          - List (filter: status, assigned_to, venue, date range)
POST   /api/v1/implementations          - Create
GET    /api/v1/implementations/{id}     - Get detail
PUT    /api/v1/implementations/{id}     - Update fields
PATCH  /api/v1/implementations/{id}/status  - Update status only (quick action)
DELETE /api/v1/implementations/{id}     - Delete (admin only)
POST   /api/v1/implementations/{id}/comments  - Add comment
GET    /api/v1/implementations/{id}/comments  - List comments
```

**Pages:**
```
/implementations              - List with filters + search
/implementations/new          - Create form
/implementations/[id]         - Detail view + comment thread
/implementations/[id]/edit    - Edit form
```

---

### Module 3: Change Request Tracking

**Description:** Track feature requests and modifications sourced from venues or the support team. Each CR has a priority, lifecycle status, and can be delayed automatically if not updated.

**Models:**
```
ChangeRequest:
  - id: int (PK)
  - cr_number: str (unique)
  - venue_name: str
  - product: str
  - request_title: str
  - requested_by: str
  - assigned_to_id: int (FK → User)
  - created_by_id: int (FK → User)
  - source: enum [venue_request, support_team_request]
  - priority: enum [high, medium, low]
  - status: enum [new, analysis, in_progress, testing,
                  waiting_for_review, blocked, completed, delayed]
  - last_updated_at: datetime
  - created_at: datetime

ChangeRequestComment:
  - id: int (PK)
  - change_request_id: int (FK → ChangeRequest)
  - author_id: int (FK → User)
  - body: str
  - created_at: datetime
```

**Status Values:** New → Analysis → In Progress → Testing → Waiting for Review → Blocked / Delayed → Completed

**Business Rules:**
- If no status update for `STALE_DAYS_THRESHOLD` days → automatically set status to Delayed (background job)
- Priority High items always appear first in list view

**Endpoints:**
```
GET    /api/v1/change-requests              - List (filter: status, priority, product, assigned_to)
POST   /api/v1/change-requests              - Create
GET    /api/v1/change-requests/{id}         - Get detail
PUT    /api/v1/change-requests/{id}         - Update fields
PATCH  /api/v1/change-requests/{id}/status  - Update status only
DELETE /api/v1/change-requests/{id}         - Delete (admin only)
POST   /api/v1/change-requests/{id}/comments  - Add comment
GET    /api/v1/change-requests/{id}/comments  - List comments
```

**Pages:**
```
/change-requests              - List with filters + search
/change-requests/new          - Create form
/change-requests/[id]         - Detail view + comment thread
/change-requests/[id]/edit    - Edit form
```

---

### Module 4: Product Update Tracking

**Description:** Track rollout of software updates across products (Member Services, Rewards Management, Android App, iOS App). Highlights updates nearing release date that are not yet complete.

**Models:**
```
ProductUpdate:
  - id: int (PK)
  - update_name: str
  - version_number: str
  - product: str
  - assigned_to_id: int (FK → User)
  - created_by_id: int (FK → User)
  - start_date: date
  - planned_release_date: date
  - status: enum [planned, development, testing, deployment, blocked, completed]
  - last_updated_at: datetime
  - created_at: datetime

ProductUpdateComment:
  - id: int (PK)
  - product_update_id: int (FK → ProductUpdate)
  - author_id: int (FK → User)
  - body: str
  - created_at: datetime
```

**Status Values:** Planned → Development → Testing → Deployment → Blocked → Completed

**Business Rules:**
- Highlight updates where `planned_release_date` is within 3 days and status != completed
- If status = Blocked → surface on dashboard Blocked Items section

**Endpoints:**
```
GET    /api/v1/product-updates              - List (filter: status, product, assigned_to)
POST   /api/v1/product-updates              - Create
GET    /api/v1/product-updates/{id}         - Get detail
PUT    /api/v1/product-updates/{id}         - Update fields
PATCH  /api/v1/product-updates/{id}/status  - Update status only
DELETE /api/v1/product-updates/{id}         - Delete (admin only)
POST   /api/v1/product-updates/{id}/comments  - Add comment
GET    /api/v1/product-updates/{id}/comments  - List comments
```

**Pages:**
```
/product-updates              - List with filters + search
/product-updates/new          - Create form
/product-updates/[id]         - Detail view + comment thread
/product-updates/[id]/edit    - Edit form
```

---

### Module 5: Dashboard

**Description:** The home screen — gives Product Managers a single-view summary of all delivery health across all modules.

**Endpoints:**
```
GET /api/v1/dashboard/summary      - Summary card counts
GET /api/v1/dashboard/blocked      - All blocked items (grouped by type)
GET /api/v1/dashboard/attention    - Items needing attention (stale / near deadline)
GET /api/v1/dashboard/recent       - Recent activity feed (last 20 events)
GET /api/v1/notifications          - Current user's notifications
PATCH /api/v1/notifications/{id}/read  - Mark notification as read
```

**Dashboard Sections:**
- **Summary Cards:** Active Implementations, Active CRs, Active Product Updates, Blocked Items, Delayed Items, Completed Items, Attention Required
- **Attention Required:** Items not updated for X days, near target date, waiting on action
- **Blocked Items:** All items with status = Blocked, grouped by module type
- **Recent Activity:** Latest status changes and comments across all modules

**In-App Notifications (dashboard only, no email for MVP):**
- New item assigned to you
- Item you own becomes Blocked
- Item you own becomes Delayed
- Target date exceeded on your item

**Pages:**
```
/    - Dashboard (root, protected — redirect here after login)
```

---

### Module 6: Search & Filters

**Description:** Cross-module filtering and search, accessible from every list view and a global search bar.

**Endpoints:**
```
GET /api/v1/search?q=&type=&status=&venue=&product=&assigned_to=&date_from=&date_to=
```

**Filter Dimensions:** Venue, Product, Assigned User, Status, Type (implementation/cr/product-update), Date Range

**Pages:**
```
/search   - Global search results page
```

---

### Module 7: Reporting

**Description:** Generate and export delivery reports for each module.

**Endpoints:**
```
GET /api/v1/reports/implementations?format=xlsx|csv&[filters]
GET /api/v1/reports/change-requests?format=xlsx|csv&[filters]
GET /api/v1/reports/product-updates?format=xlsx|csv&[filters]
```

**Export Formats:** Excel (.xlsx), CSV

**Pages:**
```
/reports   - Report builder UI — select module, apply filters, export
```

---

## MVP SCOPE

### Must Have (MVP 1.0)
- [x] Google OAuth login with role assignment
- [x] Venue Implementation CRUD + status tracking
- [x] Change Request CRUD + status tracking
- [x] Product Update CRUD + status tracking
- [x] Dashboard with summary cards, blocked items, attention required, recent activity
- [x] In-app notifications (dashboard only)
- [x] Search & filters across all modules
- [x] Export to Excel and CSV

### Nice to Have (Post-MVP)
- [ ] Email notifications
- [ ] Analytics charts (velocity, SLA compliance, blocked rate trends)
- [ ] Bulk status updates
- [ ] Audit log / history timeline per item

---

## ACCEPTANCE CRITERIA

### Authentication
- [ ] User can sign in with Google
- [ ] User role (delivery_manager / product_manager) is assigned and enforced
- [ ] JWT access token expires in 30 minutes; refresh token in 7 days
- [ ] Protected routes redirect unauthenticated users to /login

### Venue Implementations
- [ ] Delivery Manager can create an implementation with all required fields
- [ ] Status can be updated in < 30 seconds from the list view
- [ ] Items not updated for STALE_DAYS_THRESHOLD days appear in Attention Required
- [ ] Blocked items appear in the dashboard Blocked section immediately

### Change Requests
- [ ] CR can be created with source (venue / support team) and priority
- [ ] Items with no update for STALE_DAYS_THRESHOLD days are auto-marked Delayed
- [ ] High priority CRs appear at the top of the list

### Product Updates
- [ ] Updates approaching planned_release_date (within 3 days) are visually highlighted
- [ ] Blocked product updates appear in dashboard Blocked section

### Dashboard
- [ ] Product Manager can see delayed, blocked, and completed items in one view
- [ ] Summary card counts are accurate and real-time
- [ ] Recent activity feed shows latest 20 events across all modules

### Reporting
- [ ] Excel and CSV export works for all 3 modules
- [ ] Filters applied in UI are respected in the export

### Quality
- [ ] All API endpoints documented in OpenAPI (/docs)
- [ ] Backend test coverage 80%+
- [ ] TypeScript strict mode passes (no `any`)
- [ ] Docker builds and runs successfully

---

## SPECIAL REQUIREMENTS

### Security
- [x] Google OAuth CSRF state parameter verified
- [x] Rate limiting on auth endpoints
- [x] Input validation on all endpoints (Pydantic)
- [x] SQL injection prevention (SQLAlchemy ORM)
- [x] Role-based access: only admin can delete items

### Business Logic
- [x] `last_updated_at` updated automatically on every status change
- [x] `STALE_DAYS_THRESHOLD` is configurable via environment variable (default: 7)
- [x] Background job (APScheduler or Celery) runs daily to mark stale CRs as Delayed

### No External Integrations for MVP
- No email provider
- No file upload storage
- No payment provider

---

## AGENTS

| Agent | Role | Works On |
|-------|------|----------|
| DATABASE-AGENT | Creates all models and Alembic migrations | All 3 tracking modules + User |
| BACKEND-AGENT | Builds FastAPI routers, services, schemas | All modules |
| FRONTEND-AGENT | Creates Next.js pages and shadcn/ui components | All pages |
| DEVOPS-AGENT | Docker, docker-compose, environment setup | Infrastructure |
| TEST-AGENT | Writes pytest and Vitest tests | All code |
| REVIEW-AGENT | Security and code quality audit | All code |

---

## RUN

```bash
/generate-prp INITIAL.md
/execute-prp PRPs/deliveryflow-prp.md
```
