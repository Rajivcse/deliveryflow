# CLAUDE.md - DeliveryFlow Project Rules

> Project-specific rules for Claude Code. Read automatically every conversation.

---

## Project Overview

**Product:** DeliveryFlow
**Type:** Internal Delivery Tracking System (MVP 1.0)
**Users:** Delivery Managers (create/update items) and Product Managers (monitor/review)
**Stack:** FastAPI + Next.js + PostgreSQL + Google OAuth + Tailwind + shadcn/ui

---

## Tech Stack

- **Backend:** FastAPI + Python 3.11+
- **Frontend:** Next.js 14 + TypeScript (App Router)
- **Database:** PostgreSQL + SQLAlchemy + Alembic
- **Auth:** Google OAuth only (no email/password)
- **UI:** Tailwind CSS + shadcn/ui
- **Payments:** None

---

## Project Structure

```
deliveryflow/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── venue_implementation.py
│   │   │   ├── change_request.py
│   │   │   └── product_update.py
│   │   ├── schemas/
│   │   │   ├── user.py
│   │   │   ├── venue_implementation.py
│   │   │   ├── change_request.py
│   │   │   └── product_update.py
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── implementations.py
│   │   │   ├── change_requests.py
│   │   │   ├── product_updates.py
│   │   │   ├── dashboard.py
│   │   │   ├── search.py
│   │   │   └── reports.py
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── implementation_service.py
│   │   │   ├── change_request_service.py
│   │   │   ├── product_update_service.py
│   │   │   ├── dashboard_service.py
│   │   │   └── report_service.py
│   │   ├── auth/
│   │   │   ├── google_oauth.py
│   │   │   └── jwt_handler.py
│   │   └── jobs/
│   │       └── stale_checker.py
│   ├── alembic/
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (protected)/
│   │   │   ├── page.tsx                     # Dashboard
│   │   │   ├── implementations/
│   │   │   ├── change-requests/
│   │   │   ├── product-updates/
│   │   │   ├── search/page.tsx
│   │   │   └── reports/page.tsx
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                              # shadcn/ui components
│   │   ├── dashboard/
│   │   ├── implementations/
│   │   ├── change-requests/
│   │   └── product-updates/
│   ├── lib/
│   │   ├── api.ts
│   │   └── utils.ts
│   ├── hooks/
│   ├── types/
│   └── package.json
├── skills/
├── agents/
└── .claude/commands/
```

---

## Code Standards

### Python (Backend)
```python
# ALWAYS use type hints
async def get_implementation(db: AsyncSession, item_id: int) -> VenueImplementation:
    pass

# ALWAYS use async endpoints
@router.get("/implementations/{id}")
async def get_implementation(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ImplementationResponse:
    pass

# ALWAYS update last_updated_at on status change
async def update_status(db: AsyncSession, item_id: int, new_status: str) -> None:
    item.status = new_status
    item.last_updated_at = datetime.utcnow()
```

### TypeScript (Frontend)
```typescript
// ALWAYS define interfaces — NO any types
interface VenueImplementation {
  id: number;
  iwoNumber: string;
  venueName: string;
  status: ImplementationStatus;
  lastUpdatedAt: string;
}

// Use shadcn/ui components, never build primitives from scratch
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
```

---

## Forbidden Patterns

### Backend
- `print()` — use `logging` module
- Hardcoded secrets — use env vars via `config.py`
- `SELECT *` — specify columns in SQLAlchemy queries
- Skipping input validation — all endpoints use Pydantic schemas
- Exposing internal errors — wrap in HTTPException with safe messages

### Frontend
- `any` type — always define proper interfaces in `types/`
- `console.log` left in committed code
- Inline styles — use Tailwind classes
- Direct fetch calls — always use the `lib/api.ts` client
- Skipping loading/error states in async components

---

## Module-Specific Rules

### All Work Item Modules (Implementations, CRs, Product Updates)
- Every work item has `assigned_to_id` and `created_by_id` FK to User
- `last_updated_at` **must** be set to `datetime.utcnow()` on every status change — this field drives the Attention Required logic
- Status transitions are validated server-side; invalid transitions return 400
- Only `admin` role can delete items; delivery_manager can update, product_manager is read-only

### Dashboard Rules
- Blocked items (status = `blocked`) must appear in the Blocked Items section immediately — no cache
- Attention Required threshold is read from `STALE_DAYS_THRESHOLD` env var (default: 7 days)
- "Approaching release" for ProductUpdates = `planned_release_date` within 3 days and status != `completed`

### Change Request Auto-Delay Job
- `jobs/stale_checker.py` runs daily via APScheduler
- Marks CRs as `delayed` when `last_updated_at` < now - `STALE_DAYS_THRESHOLD` days and status not in [completed, blocked]

### Reporting
- Use `openpyxl` for Excel exports, built-in `csv` module for CSV
- All active filters in the UI must be passed as query params to the report endpoint
- Response uses `StreamingResponse` with correct content-type headers

---

## API Conventions

- All endpoints prefixed with `/api/v1/`
- Plural nouns for resources: `/implementations`, `/change-requests`, `/product-updates`
- Status-only updates use PATCH: `PATCH /api/v1/implementations/{id}/status`
- HTTP status codes:
  - 200: Success (GET, PUT, PATCH)
  - 201: Created (POST)
  - 204: No Content (DELETE)
  - 400: Validation / bad request
  - 401: Unauthenticated
  - 403: Forbidden (wrong role)
  - 404: Not Found
  - 409: Conflict (duplicate IWO/CR number)

---

## Authentication

- **Google OAuth 2.0 only** — no email/password registration
- JWT access token: 30-minute expiry, signed with SECRET_KEY (HS256)
- JWT refresh token: 7-day expiry, stored hashed in database
- Role (`delivery_manager`, `product_manager`, `admin`) stored in JWT claims
- State parameter verified on OAuth callback to prevent CSRF
- All routes except `/login` and `/auth/*` require a valid access token

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/deliveryflow

# Auth
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# Business Rules
STALE_DAYS_THRESHOLD=7

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Development Commands

```bash
# Backend
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev

# Docker
docker-compose up -d

# Tests
cd backend && pytest tests/ -v --cov=app --cov-report=term-missing
cd frontend && npm run test

# Linting
cd backend && ruff check app/
cd frontend && npm run lint && npm run type-check
```

---

## Commit Message Format

```
feat(auth): add Google OAuth callback handler
fix(dashboard): correct blocked items count query
feat(implementations): add comment thread to detail page
fix(jobs): prevent duplicate delayed status writes
```

---

## Skills Reference

| Task | Skill |
|------|-------|
| FastAPI endpoints + auth | `skills/BACKEND.md` |
| Next.js pages + shadcn/ui | `skills/FRONTEND.md` |
| SQLAlchemy models + Alembic | `skills/DATABASE.md` |
| pytest + Vitest tests | `skills/TESTING.md` |
| Docker + CI/CD | `skills/DEPLOYMENT.md` |

---

## Agent Coordination

| Agent | Builds |
|-------|--------|
| DATABASE-AGENT | All SQLAlchemy models and Alembic migrations |
| BACKEND-AGENT | FastAPI routers, services, schemas, background job |
| FRONTEND-AGENT | Next.js App Router pages and shadcn/ui components |
| TEST-AGENT | pytest (backend) + Vitest (frontend) |
| REVIEW-AGENT | Security and code quality audit |
| DEVOPS-AGENT | Docker, docker-compose, environment setup |

---

## Workflow

```
1. INITIAL.md is complete — product fully defined
2. /generate-prp INITIAL.md  →  creates PRPs/deliveryflow-prp.md
3. /execute-prp PRPs/deliveryflow-prp.md  →  agents build full stack
```
