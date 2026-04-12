# JobCatcher — AI Job Application Agent

An autonomous AI-powered job application platform that scans job boards, scores matches against your resume, tailors your resume for each role, and submits applications with your approval.

## Architecture

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** FastAPI (Python) + SQLAlchemy (async)
- **Database:** PostgreSQL 16
- **Cache/Queue:** Redis 7
- **Workers:** Celery with Redis broker
- **AI:** Anthropic Claude (primary) + OpenAI GPT-4o (fallback)
- **Email:** SendGrid
- **Browser Automation:** Playwright

## Project Structure

```
jobcatcher/
├── frontend/                   # Next.js 14 app
│   ├── src/
│   │   ├── app/               # App Router pages
│   │   │   ├── (auth)/        # Login, Register, Onboarding
│   │   │   └── (app)/         # Dashboard, Jobs, Applications, etc.
│   │   ├── components/        # React components
│   │   │   ├── ui/            # Base UI components
│   │   │   └── layout/        # Sidebar, Topbar, AppLayout
│   │   ├── lib/               # API client, utilities, store
│   │   └── types/             # TypeScript type definitions
│   └── package.json
│
├── backend/                    # FastAPI app
│   ├── app/
│   │   ├── api/               # Route handlers
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic (AI, Email, Auth)
│   │   └── core/              # Config, DB, Security
│   ├── workers/               # Celery workers
│   │   └── scrapers/          # Job board scrapers
│   ├── email_templates/       # Jinja2 HTML email templates
│   └── requirements.txt
│
├── docker-compose.yml
├── .env.example
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.12+
- Docker & Docker Compose (for PostgreSQL + Redis)

### 1. Clone and Configure

```bash
git clone <repo-url> && cd JobCatcher
cp .env.example .env
# Edit .env with your API keys and configuration
```

### 2. Start Infrastructure

```bash
docker compose up -d postgres redis
```

### 3. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
playwright install chromium

# Run database migrations
alembic upgrade head

# Start the API server
uvicorn app.main:app --reload --port 8000
```

### 4. Start Celery Workers (separate terminal)

```bash
cd backend
venv\Scripts\activate

# Worker
celery -A workers.celery_app worker --loglevel=info

# Beat scheduler (separate terminal)
celery -A workers.celery_app beat --loglevel=info
```

### 5. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Docker (Full Stack)

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `SECRET_KEY` | JWT signing key (min 32 chars) | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `ANTHROPIC_API_KEY` | Claude API key for AI features | Yes |
| `OPENAI_API_KEY` | GPT-4o fallback API key | No |
| `SENDGRID_API_KEY` | Email delivery service | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | No |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | No |
| `AWS_ACCESS_KEY_ID` | S3 storage access key | No |
| `AWS_SECRET_ACCESS_KEY` | S3 storage secret key | No |
| `AWS_S3_BUCKET` | S3 bucket name for resumes | No |

## API Documentation

Once the backend is running, interactive API docs are available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, get JWT tokens |
| GET | `/api/preferences` | Get user preferences |
| PUT | `/api/preferences` | Update preferences |
| POST | `/api/resumes/upload` | Upload resume (PDF/DOCX) |
| GET | `/api/jobs` | List matched jobs |
| GET | `/api/applications` | List applications |
| GET | `/api/applications/{id}/approve` | Approve via email link |
| GET | `/api/agent/status` | Agent status |
| POST | `/api/agent/run-now` | Trigger immediate scan |
| GET | `/api/analytics/summary` | Analytics dashboard data |

## Features

### Core Flow
1. **Sign Up** — Email/password or Google OAuth
2. **Set Preferences** — Multi-step onboarding wizard
3. **Upload Resume** — PDF/DOCX, AI-parsed into structured data
4. **AI Agent Activates** — Scans LinkedIn, Naukri, Indeed, Wellfound every 30 minutes
5. **Job Matching** — AI scores each job (0-100%) against your profile
6. **Resume Tailoring** — AI rewrites bullet points with JD keywords (never fabricates)
7. **Approval Email** — Clean email with match breakdown and one-click approve/reject
8. **Auto-Apply** — Playwright bot fills forms and submits your tailored resume
9. **Track Progress** — Kanban board, table, and timeline views

### Dashboard Features
- Application tracker with Kanban, Table, and Timeline views
- Real-time agent activity log
- Analytics with charts (applications over time, status distribution, top skills)
- Resume version management with diff view

## Tech Highlights

- **Dark-first design** with glassmorphism cards and gradient accents
- **Async throughout** — FastAPI async routes + SQLAlchemy async sessions
- **JWT auth** with 15-min access tokens and 30-day refresh tokens
- **Signed approval tokens** — 48-hour single-use JWTs for email approve/reject
- **Anti-detection scraping** — Rotating user agents, randomized delays, rate limiting
- **AI failover** — Claude primary, GPT-4o fallback with exponential backoff
- **Celery workers** — Parallel scraping, matching, tailoring, and application submission

## License

MIT
