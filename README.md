# JobCatcher

An AI-powered job application agent that searches job boards, scores matches against your resume, tailors your CV for each role, and submits applications on your behalf.

## How It Works

1. **Set preferences** -- job titles, locations, work mode, salary range, max daily applications
2. **Upload your resume** -- PDF or DOCX, parsed into structured data by AI
3. **Agent runs every 30 minutes** -- pulls jobs from LinkedIn, Indeed, Naukri, Wellfound via JSearch API
4. **AI scores each job** (0--100%) against your profile and flags gaps
5. **Resume tailoring** -- rewrites bullet points to match the job description (never fabricates skills)
6. **Approval email** -- match breakdown + tailored CV PDF + one-click approve/reject link
7. **Auto-apply** -- Playwright fills out forms and submits the tailored resume
8. **Track everything** -- Kanban board, table view, timeline, and analytics dashboard

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| UI | Radix UI, Recharts, react-beautiful-dnd |
| Backend | FastAPI, SQLAlchemy 2.0 (async), Pydantic |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7, Celery 5.4 |
| AI | Anthropic Claude (primary), OpenAI GPT-4o (fallback), Groq (fallback) |
| Job Data | RapidAPI JSearch |
| PDF | WeasyPrint, ReportLab, LaTeX |
| Email | SendGrid |
| Browser | Playwright |
| Auth | JWT (access + refresh tokens), Google OAuth |
| Infra | Docker Compose |

## Project Structure

```
JobCatcher/
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (auth)/              # Login, register, onboarding
│       │   └── (app)/               # Dashboard, jobs, applications, resumes, preferences
│       ├── components/              # UI components, layout
│       ├── lib/                     # API client, Zustand store, utils
│       └── types/                   # TypeScript interfaces
│
├── backend/
│   ├── app/
│   │   ├── api/                     # Route handlers (auth, jobs, applications, resumes, agent, analytics)
│   │   ├── models/                  # SQLAlchemy models
│   │   ├── schemas/                 # Pydantic request/response schemas
│   │   ├── services/                # AI, auth, email, job search, PDF generation
│   │   └── core/                    # Config, database, security
│   ├── workers/                     # Celery tasks (scan, match, tailor, notify, submit)
│   │   └── scrapers/                # JSearch API scraper
│   ├── alembic/                     # Database migrations
│   └── email_templates/             # Jinja2 HTML templates
│
├── docker-compose.yml
└── .env.example
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.12+
- Docker & Docker Compose

### 1. Clone and configure

```bash
git clone <repo-url> && cd JobCatcher
cp .env.example .env
# Fill in your API keys (see Environment Variables below)
```

### 2. Start infrastructure

```bash
docker compose up -d postgres redis
```

### 3. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

pip install -r requirements.txt

alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### 4. Celery workers (separate terminals)

```bash
cd backend && venv\Scripts\activate

# Worker (all queues)
celery -A workers.celery_app worker --loglevel=info -Q default,ai,email,scrapers,browser

# Beat scheduler
celery -A workers.celery_app beat --loglevel=info
```

### 5. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000.

### Full stack via Docker

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| API Docs (ReDoc) | http://localhost:8000/redoc |

## Environment Variables

Copy `.env.example` and fill in the values.

| Variable | Description | Required |
|---|---|---|
| `SECRET_KEY` | JWT signing key (min 32 chars) | Yes |
| `DATABASE_URL` | PostgreSQL connection string (`postgresql+asyncpg://...`) | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `ANTHROPIC_API_KEY` | Claude API key | Yes* |
| `OPENAI_API_KEY` | GPT-4o fallback | No |
| `GROQ_API_KEY` | Groq fallback | No |
| `RAPIDAPI_KEY` | JSearch API key ([get one here](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch)) | Yes |
| `SENDGRID_API_KEY` | SendGrid email delivery | Yes |
| `FROM_EMAIL` | Verified sender email in SendGrid | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth | No |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | No |
| `AWS_ACCESS_KEY_ID` | S3 resume storage | No |
| `AWS_SECRET_ACCESS_KEY` | S3 resume storage | No |
| `AWS_S3_BUCKET` | S3 bucket name | No |
| `SENTRY_DSN` | Error tracking | No |

*At least one AI key (Anthropic, OpenAI, or Groq) is required.

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register with email/password |
| POST | `/api/auth/login` | Login, returns JWT tokens |
| POST | `/api/auth/google` | Google OAuth login |
| POST | `/api/auth/refresh` | Refresh access token |

### Jobs
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/jobs` | Real-time job search with filters |
| GET | `/api/jobs/saved` | Saved jobs |
| POST | `/api/jobs/save` | Save a job |
| POST | `/api/jobs/{id}/tailor-and-email` | Tailor CV and email it |

### Applications
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/applications` | List applications (filterable, sortable) |
| POST | `/api/applications/{id}/approve` | Approve via email link |
| POST | `/api/applications/{id}/reject` | Reject via email link |
| GET | `/api/applications/{id}/download-tailored` | Download tailored resume PDF |

### Resumes
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/resumes/upload` | Upload base resume (PDF/DOCX) |
| POST | `/api/resumes/tailor-from-posting` | Tailor from a custom job description |
| GET | `/api/resumes/{id}/file` | Download resume file |

### Agent
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/agent/status` | Agent status |
| POST | `/api/agent/run-now` | Trigger immediate scan |
| POST | `/api/agent/pause` | Pause agent |
| POST | `/api/agent/resume` | Resume agent |
| GET | `/api/agent/logs` | Activity log (paginated) |
| WebSocket | `/ws/agent/logs` | Real-time log stream |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/summary` | Dashboard summary data |
| GET | `/api/analytics/daily-breakdown` | Daily statistics |

## License

MIT
