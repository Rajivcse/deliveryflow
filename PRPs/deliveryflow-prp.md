# PRP: DeliveryFlow

> Implementation blueprint for parallel agent execution

---

## METADATA

| Field | Value |
|-------|-------|
| **Product** | DeliveryFlow |
| **Type** | Internal Delivery Tracking System |
| **Version** | MVP 1.0 |
| **Created** | 2026-06-28 |
| **Complexity** | High |

---

## PRODUCT OVERVIEW

**Description:** An internal web application used by Delivery Managers and Product Managers to track the delivery progress of software-related work items — New Venue Implementations, Change Requests, and Product Updates.

**Problem Solved:** Replaces email threads, Excel sheets, and ad-hoc follow-ups with a single centralized dashboard that surfaces blocked, delayed, and attention-required items at a glance.

**MVP Scope:**
- [x] Google OAuth login with role-based access (Delivery Manager / Product Manager / Admin)
- [x] Venue Implementation Tracking — full CRUD + status workflow + comments
- [x] Change Request Tracking — full CRUD + status workflow + auto-delay rule
- [x] Product Update Tracking — full CRUD + status workflow + approaching-release rule
- [x] Dashboard — summary cards, blocked items, attention required, recent activity, in-app notifications
- [x] Global Search & Filters — by venue, product, assignee, status, type, date range
- [x] Reporting — export to Excel (.xlsx) and CSV for all 3 modules

---

## TECH STACK

| Layer | Technology | Skill Reference |
|-------|------------|-----------------|
| Backend | FastAPI + Python 3.11+ | skills/BACKEND.md |
| Frontend | Next.js 14 + TypeScript (App Router) | skills/FRONTEND.md |
| Database | PostgreSQL + SQLAlchemy (async) + Alembic | skills/DATABASE.md |
| Auth | Google OAuth 2.0 + JWT (HS256) | skills/BACKEND.md |
| UI | Tailwind CSS + shadcn/ui | skills/FRONTEND.md |
| Background Jobs | APScheduler (stale CR detection) | — |
| Reporting | openpyxl (Excel) + csv module | — |
| Testing | pytest + pytest-asyncio (backend), Vitest (frontend) | skills/TESTING.md |
| Deployment | Docker + docker-compose + GitHub Actions | skills/DEPLOYMENT.md |

---

## DATABASE MODELS

### User
```
id: int (PK)
email: str (unique, indexed)
full_name: str
avatar_url: str (nullable)
role: enum [delivery_manager, product_manager, admin]
is_active: bool (default true)
created_at: datetime
```
*Relationships:* one-to-many → VenueImplementation, ChangeRequest, ProductUpdate, Notification

### RefreshToken
```
id: int (PK)
user_id: int (FK → User, cascade delete)
token: str (hashed, indexed)
expires_at: datetime
revoked: bool (default false)
```

### VenueImplementation
```
id: int (PK)
iwo_number: str (unique, indexed)
venue_name: str (indexed)
product_name: str
assigned_to_id: int (FK → User)
created_by_id: int (FK → User)
start_date: date
target_date: date (indexed)
status: enum [not_started, in_progress, waiting_for_venue, waiting_for_internal_team, blocked, completed]
last_updated_at: datetime (indexed — drives stale detection)
created_at: datetime
```

### ImplementationComment
```
id: int (PK)
implementation_id: int (FK → VenueImplementation, cascade delete)
author_id: int (FK → User)
body: str
created_at: datetime
```

### ChangeRequest
```
id: int (PK)
cr_number: str (unique, indexed)
venue_name: str (indexed)
product: str (indexed)
request_title: str
requested_by: str
assigned_to_id: int (FK → User)
created_by_id: int (FK → User)
source: enum [venue_request, support_team_request]
priority: enum [high, medium, low]
status: enum [new, analysis, in_progress, testing, waiting_for_review, blocked, completed, delayed]
last_updated_at: datetime (indexed)
created_at: datetime
```

### ChangeRequestComment
```
id: int (PK)
change_request_id: int (FK → ChangeRequest, cascade delete)
author_id: int (FK → User)
body: str
created_at: datetime
```

### ProductUpdate
```
id: int (PK)
update_name: str
version_number: str
product: str (indexed)
assigned_to_id: int (FK → User)
created_by_id: int (FK → User)
start_date: date
planned_release_date: date (indexed)
status: enum [planned, development, testing, deployment, blocked, completed]
last_updated_at: datetime (indexed)
created_at: datetime
```

### ProductUpdateComment
```
id: int (PK)
product_update_id: int (FK → ProductUpdate, cascade delete)
author_id: int (FK → User)
body: str
created_at: datetime
```

### Notification
```
id: int (PK)
user_id: int (FK → User, cascade delete)
type: enum [new_assignment, item_blocked, item_delayed, target_date_exceeded]
item_type: enum [implementation, change_request, product_update]
item_id: int
message: str
is_read: bool (default false)
created_at: datetime
```

---

## MODULES

---

### Module 1: Authentication
**Agents:** DATABASE-AGENT + BACKEND-AGENT + FRONTEND-AGENT

**Backend Endpoints:**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /auth/google | None | Redirect to Google consent screen |
| GET | /auth/google/callback | None | Handle callback, issue JWT pair |
| POST | /auth/refresh | Refresh token | Issue new access token |
| POST | /auth/logout | Required | Revoke refresh token |
| GET | /auth/me | Required | Get current user |

**Implementation Notes:**
- On callback: look up user by email; if not found, create with `role=product_manager` (admin must promote)
- Access token: 30 min, HS256, payload includes `{sub: user_id, role: role}`
- Verify Google `state` param on callback to prevent CSRF
- `/auth/me` returns `UserResponse` (no token fields)

**Frontend Pages:**

| Route | Page | Components | Notes |
|-------|------|------------|-------|
| /login | LoginPage | GoogleSignInButton, Logo | Redirect to /dashboard if already authed |
| /profile | ProfilePage | ProfileCard, AvatarUpload | Show name, email, role |

---

### Module 2: Venue Implementation Tracking
**Agents:** BACKEND-AGENT + FRONTEND-AGENT

**Backend Endpoints:**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/v1/implementations | Required | List with filters |
| POST | /api/v1/implementations | DM only | Create |
| GET | /api/v1/implementations/{id} | Required | Get detail |
| PUT | /api/v1/implementations/{id} | DM only | Full update |
| PATCH | /api/v1/implementations/{id}/status | DM only | Status-only update |
| DELETE | /api/v1/implementations/{id} | Admin only | Delete |
| POST | /api/v1/implementations/{id}/comments | Required | Add comment |
| GET | /api/v1/implementations/{id}/comments | Required | List comments |

**Query Params (GET list):** `status`, `venue`, `assigned_to`, `date_from`, `date_to`, `q` (search), `page`, `per_page`

**Business Logic:**
- On every status change: set `last_updated_at = now()` + create Notification if assignee != actor
- If status → blocked: create `item_blocked` notification for assignee
- `attention_required` flag computed at query time: `last_updated_at < now() - STALE_DAYS_THRESHOLD`

**Frontend Pages:**

| Route | Page | Components |
|-------|------|------------|
| /implementations | ImplementationListPage | DataTable, FilterBar, StatusBadge, QuickStatusUpdate |
| /implementations/new | NewImplementationPage | ImplementationForm |
| /implementations/[id] | ImplementationDetailPage | DetailCard, StatusTimeline, CommentThread |
| /implementations/[id]/edit | EditImplementationPage | ImplementationForm (prefilled) |

---

### Module 3: Change Request Tracking
**Agents:** BACKEND-AGENT + FRONTEND-AGENT

**Backend Endpoints:**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/v1/change-requests | Required | List with filters |
| POST | /api/v1/change-requests | DM only | Create |
| GET | /api/v1/change-requests/{id} | Required | Get detail |
| PUT | /api/v1/change-requests/{id} | DM only | Full update |
| PATCH | /api/v1/change-requests/{id}/status | DM only | Status-only update |
| DELETE | /api/v1/change-requests/{id} | Admin only | Delete |
| POST | /api/v1/change-requests/{id}/comments | Required | Add comment |
| GET | /api/v1/change-requests/{id}/comments | Required | List comments |

**Query Params:** `status`, `priority`, `product`, `venue`, `source`, `assigned_to`, `date_from`, `date_to`, `q`, `page`, `per_page`

**Business Logic:**
- High priority CRs appear first in default sort
- Auto-delay job: daily APScheduler task marks CRs where `last_updated_at < now() - STALE_DAYS` and status NOT IN [completed, blocked, delayed] → status = delayed + create `item_delayed` notification

**Frontend Pages:**

| Route | Page | Components |
|-------|------|------------|
| /change-requests | ChangeRequestListPage | DataTable, FilterBar, PriorityBadge, StatusBadge, QuickStatusUpdate |
| /change-requests/new | NewChangeRequestPage | ChangeRequestForm |
| /change-requests/[id] | ChangeRequestDetailPage | DetailCard, StatusTimeline, CommentThread |
| /change-requests/[id]/edit | EditChangeRequestPage | ChangeRequestForm (prefilled) |

---

### Module 4: Product Update Tracking
**Agents:** BACKEND-AGENT + FRONTEND-AGENT

**Backend Endpoints:**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/v1/product-updates | Required | List with filters |
| POST | /api/v1/product-updates | DM only | Create |
| GET | /api/v1/product-updates/{id} | Required | Get detail |
| PUT | /api/v1/product-updates/{id} | DM only | Full update |
| PATCH | /api/v1/product-updates/{id}/status | DM only | Status-only update |
| DELETE | /api/v1/product-updates/{id} | Admin only | Delete |
| POST | /api/v1/product-updates/{id}/comments | Required | Add comment |
| GET | /api/v1/product-updates/{id}/comments | Required | List comments |

**Query Params:** `status`, `product`, `assigned_to`, `date_from`, `date_to`, `q`, `page`, `per_page`

**Business Logic:**
- "Approaching release" = `planned_release_date <= now() + 3 days` and status != `completed` → `approaching_release: true` in response
- On status → blocked: create `item_blocked` notification

**Frontend Pages:**

| Route | Page | Components |
|-------|------|------------|
| /product-updates | ProductUpdateListPage | DataTable, FilterBar, StatusBadge, ApproachingReleaseBanner |
| /product-updates/new | NewProductUpdatePage | ProductUpdateForm |
| /product-updates/[id] | ProductUpdateDetailPage | DetailCard, StatusTimeline, CommentThread |
| /product-updates/[id]/edit | EditProductUpdatePage | ProductUpdateForm (prefilled) |

---

### Module 5: Dashboard
**Agents:** BACKEND-AGENT + FRONTEND-AGENT

**Backend Endpoints:**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/v1/dashboard/summary | Required | Count cards |
| GET | /api/v1/dashboard/blocked | Required | All blocked items grouped by type |
| GET | /api/v1/dashboard/attention | Required | Stale + near-deadline + waiting items |
| GET | /api/v1/dashboard/recent | Required | Last 20 events across all modules |
| GET | /api/v1/notifications | Required | Current user's unread notifications |
| PATCH | /api/v1/notifications/{id}/read | Required | Mark notification read |
| POST | /api/v1/notifications/read-all | Required | Mark all read |

**Summary Response Shape:**
```json
{
  "active_implementations": 12,
  "active_change_requests": 8,
  "active_product_updates": 5,
  "blocked_items": 3,
  "delayed_items": 4,
  "completed_items": 27,
  "attention_required": 6
}
```

**Frontend Pages:**

| Route | Page | Components |
|-------|------|------------|
| / | DashboardPage | SummaryCards, BlockedItemsSection, AttentionRequiredSection, RecentActivityFeed, NotificationBell |

**Dashboard Layout:**
- Top row: 7 summary cards (counts, colour-coded — blocked=red, delayed=amber, attention=orange)
- Left column: Attention Required list (stale items + near-deadline)
- Right column: Blocked Items grouped by module
- Bottom: Recent Activity feed (timestamp + actor + action + item link)
- Header: NotificationBell with unread count badge

---

### Module 6: Search & Filters
**Agents:** BACKEND-AGENT + FRONTEND-AGENT

**Backend Endpoints:**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/v1/search | Required | Cross-module search |

**Query Params:** `q`, `type` (implementation/change_request/product_update), `status`, `venue`, `product`, `assigned_to`, `date_from`, `date_to`, `page`, `per_page`

**Response:** Paginated list of mixed results, each with `item_type` discriminator field.

**Frontend Pages:**

| Route | Page | Components |
|-------|------|------------|
| /search | SearchPage | SearchBar, FilterPanel, MixedResultsList |

---

### Module 7: Reporting
**Agents:** BACKEND-AGENT + FRONTEND-AGENT

**Backend Endpoints:**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/v1/reports/implementations | Required | Export implementations |
| GET | /api/v1/reports/change-requests | Required | Export change requests |
| GET | /api/v1/reports/product-updates | Required | Export product updates |

**Query Params:** `format` (xlsx\|csv), `status`, `venue`, `product`, `assigned_to`, `date_from`, `date_to`

**Response:** `StreamingResponse` with correct `Content-Type` and `Content-Disposition` headers.

**Libraries:** `openpyxl` for .xlsx, Python `csv` module for .csv

**Frontend Pages:**

| Route | Page | Components |
|-------|------|------------|
| /reports | ReportsPage | ModuleSelector, FilterPanel, ExportButton (Excel/CSV) |

---

## AGENT TASK ASSIGNMENTS

### DATABASE-AGENT
**Skill:** `skills/DATABASE.md`

**Tasks:**
1. Create `backend/app/database.py` — async SQLAlchemy engine, `AsyncSession`, `get_db` dependency
2. Create `backend/app/models/__init__.py` and all model files:
   - `models/user.py` — User, RefreshToken
   - `models/venue_implementation.py` — VenueImplementation, ImplementationComment
   - `models/change_request.py` — ChangeRequest, ChangeRequestComment
   - `models/product_update.py` — ProductUpdate, ProductUpdateComment
   - `models/notification.py` — Notification
3. Create `alembic/` setup and initial migration
4. Create seed script with sample users (1 admin, 1 delivery_manager, 1 product_manager)

**Output Files:**
- `backend/app/database.py`
- `backend/app/models/*.py`
- `backend/alembic/` (env.py, initial migration)
- `backend/seed.py`

---

### BACKEND-AGENT
**Skill:** `skills/BACKEND.md`

**Tasks:**
1. `backend/app/main.py` — FastAPI app, CORS, lifespan, router registration
2. `backend/app/config.py` — Pydantic Settings (all env vars)
3. `backend/app/auth/google_oauth.py` — OAuth flow, state verification
4. `backend/app/auth/jwt_handler.py` — create/decode access + refresh tokens
5. `backend/app/auth/dependencies.py` — `get_current_user`, `require_role` dependency
6. Schemas for all models in `backend/app/schemas/`
7. Routers and services for all 7 modules
8. `backend/app/jobs/stale_checker.py` — APScheduler daily job for CR auto-delay
9. Notification creation helpers used across services

**Output Files:**
- `backend/app/main.py`, `config.py`
- `backend/app/auth/*.py`
- `backend/app/schemas/*.py`
- `backend/app/routers/*.py`
- `backend/app/services/*.py`
- `backend/app/jobs/stale_checker.py`
- `backend/requirements.txt`

---

### FRONTEND-AGENT
**Skill:** `skills/FRONTEND.md`

**Tasks:**
1. `frontend/` — Next.js 14 App Router project (TypeScript, Tailwind, shadcn/ui)
2. `frontend/lib/api.ts` — Axios client with JWT Bearer interceptor + refresh logic
3. Auth context `frontend/lib/auth-context.tsx` — session state, role, logout
4. Route groups: `(auth)` (login) and `(protected)` (all app pages)
5. All pages and components for 7 modules
6. Shared components: `StatusBadge`, `PriorityBadge`, `DataTable`, `FilterBar`, `CommentThread`, `NotificationBell`
7. TypeScript interfaces for all API response shapes in `frontend/types/`

**Output Files:**
- `frontend/app/` (all pages)
- `frontend/components/` (all components)
- `frontend/lib/` (api.ts, auth-context.tsx, utils.ts)
- `frontend/types/index.ts`
- `frontend/package.json`, `tsconfig.json`, `tailwind.config.ts`

---

### DEVOPS-AGENT
**Skill:** `skills/DEPLOYMENT.md`

**Tasks:**
1. `backend/Dockerfile` — multi-stage Python 3.11 image
2. `frontend/Dockerfile` — multi-stage Node 20 image
3. `docker-compose.yml` — postgres, backend, frontend services with health checks
4. `docker-compose.override.yml` — dev overrides (hot reload, volume mounts)
5. `.env.example` — all required env vars documented
6. `.github/workflows/ci.yml` — lint + test + build on PR

**Output Files:**
- `backend/Dockerfile`, `frontend/Dockerfile`
- `docker-compose.yml`, `docker-compose.override.yml`
- `.env.example`
- `.github/workflows/ci.yml`

---

### TEST-AGENT
**Skill:** `skills/TESTING.md`

**Tasks:**
1. Backend: `pytest` + `pytest-asyncio` + `httpx` async test client
2. Test fixtures: DB session, authenticated test users per role
3. Tests for every router (CRUD + status update + auth enforcement + filters)
4. Test for stale checker job
5. Frontend: Vitest + React Testing Library
6. Component tests for StatusBadge, FilterBar, DataTable
7. Hook tests for auth context and API calls

**Target:** 80%+ backend coverage, key components covered in frontend

**Output Files:**
- `backend/tests/conftest.py`
- `backend/tests/test_auth.py`
- `backend/tests/test_implementations.py`
- `backend/tests/test_change_requests.py`
- `backend/tests/test_product_updates.py`
- `backend/tests/test_dashboard.py`
- `backend/tests/test_reports.py`
- `frontend/__tests__/` (component + hook tests)

---

### REVIEW-AGENT
**Tasks:**
1. Security audit: JWT handling, OAuth state verification, role enforcement, input sanitization
2. SQL injection check: confirm ORM usage throughout, no raw queries
3. Performance: confirm DB indexes on frequently filtered columns
4. Code quality: consistent error handling, no exposed stack traces
5. Business rule verification: stale detection, blocked prominence, approaching-release logic

---

## PHASE EXECUTION PLAN

### Phase 1: Foundation (4 agents in parallel)

| Agent | Task | Output |
|-------|------|--------|
| DATABASE-AGENT | All models + migrations + seed | `backend/app/models/`, `alembic/` |
| BACKEND-AGENT | `main.py`, `config.py`, auth module | `backend/app/auth/`, `backend/app/main.py` |
| FRONTEND-AGENT | Next.js scaffold, Tailwind, shadcn/ui, api.ts, auth context | `frontend/` base structure |
| DEVOPS-AGENT | Dockerfiles, docker-compose, .env.example | Infrastructure files |

**Validation Gate 1:**
```bash
cd backend && pip install -r requirements.txt && alembic upgrade head
cd frontend && npm install && npm run build
docker-compose config
```

---

### Phase 2: Modules (backend + frontend in parallel per module)

Run all module pairs concurrently:

| Pair | Backend | Frontend |
|------|---------|----------|
| Auth | Auth routers + services | Login page, auth context wiring |
| Implementations | implementations router + service | All 4 implementation pages + components |
| Change Requests | change_requests router + service | All 4 change request pages + components |
| Product Updates | product_updates router + service | All 4 product update pages + components |
| Dashboard | dashboard + notifications routers | Dashboard page + all dashboard components |
| Search | search router | Search page + filter panel |
| Reports | reports router (streaming Excel/CSV) | Reports page + export UI |

**Validation Gate 2:**
```bash
cd backend && ruff check app/ && python -m mypy app/ --ignore-missing-imports
cd frontend && npm run lint && npm run type-check
```

---

### Phase 3: Quality (3 agents in parallel)

| Agent | Task |
|-------|------|
| TEST-AGENT | Write + run all backend and frontend tests |
| REVIEW-AGENT | Security + code quality audit |
| DEVOPS-AGENT | CI/CD pipeline, GitHub Actions workflow |

**Final Validation:**
```bash
cd backend && pytest tests/ -v --cov=app --cov-fail-under=80
cd frontend && npm test
docker-compose up -d
curl http://localhost:8000/health
curl http://localhost:3000
```

---

## VALIDATION GATES

| Gate | Commands | Pass Condition |
|------|----------|----------------|
| 1 — Foundation | `alembic upgrade head` + `npm install` + `docker-compose config` | No errors |
| 2 — Modules | `ruff check` + `mypy` + `npm run type-check` + `npm run lint` | Zero errors |
| 3 — Tests | `pytest --cov-fail-under=80` + `npm test` | All pass, 80%+ coverage |
| Final | `docker-compose up -d` + health checks | Services running |

---

## ENVIRONMENT VARIABLES

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/deliveryflow

# Auth
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# Business Rules
STALE_DAYS_THRESHOLD=7

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## ACCEPTANCE CRITERIA CHECKLIST

### Authentication
- [ ] Sign in with Google works end-to-end
- [ ] Role assigned correctly (default: product_manager)
- [ ] JWT access token expires in 30 minutes
- [ ] Refresh token issues new access token correctly
- [ ] All protected routes redirect unauthenticated users to /login

### Venue Implementations
- [ ] DM can create, edit, and update status in < 30 seconds from list view
- [ ] Items not updated for STALE_DAYS_THRESHOLD days appear in "Attention Required"
- [ ] Blocked items appear immediately in dashboard Blocked section

### Change Requests
- [ ] CR created with priority and source fields
- [ ] Stale CRs auto-marked as Delayed by background job
- [ ] High priority CRs appear first in list

### Product Updates
- [ ] Updates within 3 days of planned_release_date are highlighted
- [ ] Blocked product updates appear in dashboard

### Dashboard
- [ ] PM can identify blocked, delayed, and completed items in one view
- [ ] Summary card counts are accurate
- [ ] In-app notification bell shows unread count

### Reporting
- [ ] Excel and CSV exports work for all 3 modules
- [ ] UI filters are applied in exported file

### Quality
- [ ] OpenAPI docs available at /docs
- [ ] Backend test coverage >= 80%
- [ ] TypeScript strict mode: zero `any` types
- [ ] Docker build succeeds for both services

---

## NEXT STEP

```bash
/execute-prp PRPs/deliveryflow-prp.md
```
