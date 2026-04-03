# Project Decision: Founding Full Stack Engineer Role

## Job Context

- **Role:** Founding Full Stack Engineer
- **Recruiter:** Yohannes Getachew (Veretin Recruitment)
- **Client:** Unnamed company building a **global AI data platform** used by leading AI companies
- **What they build:** Platform that processes data from **hundreds of thousands of contributors worldwide**
- **Compensation:** $80K-$100K/year + Founding Equity + Tokens
- **Tech Stack:** FastAPI (Python), React, PostgreSQL, Celery/RQ, Docker, S3, REST APIs

---

## All Suggestions Compared

### Claude's Suggestions

| # | Project | Core Tech | Job Relevance |
|---|---------|-----------|---------------|
| 1 | **AI Data Annotation & Pipeline Platform** | FastAPI, Celery+Redis, MinIO (S3), PostgreSQL, React dashboard, Docker Compose, WebSocket | Directly mirrors their product |
| 2 | Real-Time Log Analytics & Monitoring Dashboard | FastAPI, SSE/WebSocket, Celery, PostgreSQL partitioning, React charts | Shows data pipeline skills |
| 3 | Distributed File Processing Hub | FastAPI, Celery task chains, S3, PostgreSQL, React pipeline builder | Shows async processing |

**Claude's Pick:** #1 - "It's literally what the company builds"

---

### Gemini's Suggestions

| # | Project | Core Tech | Job Relevance |
|---|---------|-----------|---------------|
| 1 | Automated "Cold Outreach" Engine | FastAPI, Celery/RQ, PostgreSQL JSONB, Claude API, WebSocket, Next.js | AI integration but wrong domain |
| 2 | **Real-Time Log & Metric Intelligence Platform** | FastAPI, TimescaleDB, Redis buffer, TanStack Table, Recharts, Middleware | High-frequency data handling |
| 3 | Collaborative AI Video Annotator | S3 multipart uploads, Whisper transcription, FastAPI background tasks, RBAC, React video player | Media processing + annotation |

**Gemini's Pick:** #2 - "Proves you can handle hundreds of thousands of contributors"

---

### GPT's Suggestions

| # | Project | Core Tech | Job Relevance |
|---|---------|-----------|---------------|
| 1 | **AI Data Collection & Annotation Platform** | FastAPI, Celery+Redis, S3/MinIO, PostgreSQL, React dashboard, JWT auth | Closest to their actual product |
| 2 | Distributed Job Processing System | Celery, Redis/RabbitMQ, worker system, retry/failure handling, progress UI | Deep backend/system design |
| 3 | Real-time Analytics Dashboard | PostgreSQL aggregations, Redis caching, WebSocket, Recharts/D3, materialized views | Data-heavy UI skills |

**GPT's Pick:** Combine #1 + #2

---

## Cross-Analysis: What Each Suggestion Covers

### Job Requirements Coverage Matrix

| Requirement | Claude #1 | Gemini #2 | GPT #1+#2 | Gemini #3 |
|---|---|---|---|---|
| FastAPI APIs | Yes | Yes | Yes | Yes |
| React interfaces | Yes | Yes | Yes | Yes |
| PostgreSQL optimization | Yes | Yes (TimescaleDB) | Yes | Partial |
| Background jobs (Celery/RQ) | Yes | Partial (Redis buffer) | Yes | Yes |
| Docker + S3 storage | Yes | Docker only | Yes | Yes |
| REST API design | Yes | Yes | Yes | Yes |
| End-to-end ownership | Yes | Yes | Yes | Yes |
| Async pipelines (audio/image/video) | Yes | No (logs only) | Yes | Yes (video) |
| High-scale data handling | Yes | Yes | Yes | Partial |
| **Mirrors their actual product** | **Yes** | No | **Yes** | Partial |

---

## Strengths & Weaknesses

### Claude #1: AI Data Annotation & Pipeline Platform
- **Strengths:** Directly mirrors client's product. Covers ALL job requirements. Shows you understand their business domain.
- **Weaknesses:** Ambitious scope. Could take 2-3 weeks to build properly.

### Gemini #2: Real-Time Log & Metric Intelligence Platform
- **Strengths:** TimescaleDB is impressive. High-frequency data ingestion shows scale thinking. TDD approach is professional. Lighter scope.
- **Weaknesses:** Wrong domain (monitoring vs data annotation). No media/file processing. No S3. No Celery.

### GPT #1+#2: AI Data Platform + Distributed Processing (Combined)
- **Strengths:** Most comprehensive coverage. Combines domain relevance with deep system design.
- **Weaknesses:** Too large in scope. Risk of building something half-finished.

### Gemini #3: Collaborative AI Video Annotator
- **Strengths:** S3 multipart uploads, Whisper transcription, video processing — directly matches "async pipelines for audio, image, and video data."
- **Weaknesses:** Narrower scope (video only). Doesn't show general data pipeline architecture.

---

## Final Decision

### Build: **AnnotateFlow** — AI Data Annotation & Processing Platform
### (Claude #1 + GPT #1, scoped for 3-day delivery)

**Why this wins:**
1. It **directly mirrors what the client company builds** — the #1 differentiator
2. It covers every core JD requirement (FastAPI, React, PostgreSQL, Celery, S3, Docker)
3. It shows **product thinking** — you understood their business, not just their tech stack
4. Both Claude and GPT independently arrived at this as the top choice

**Framing (important):** Do NOT say "I built a mini version of your platform." Say: *"I built this because I'm drawn to data infrastructure problems — collection, processing, and delivery at scale."* The first sounds like interview prep. The second sounds like genuine engineering interest.

---

## Build Plan: 3 Days (April 3-6 Deadline)

### Shippable-At-Any-Point Strategy

Every day ends with a working, deployable system. If something goes wrong on Day 3, Day 2's output is still a complete demo.

### Day 1 (April 4): Backend Foundation + Database

**Morning — Project scaffold + Docker Compose:**
- Docker Compose: FastAPI app, PostgreSQL 16, Redis, MinIO, Celery worker
- FastAPI project structure with proper layering (routes/services/models)
- Alembic setup for migrations

**Afternoon — Core API + Database:**
- PostgreSQL schema: `users`, `projects`, `tasks`, `submissions` (with proper indexes from Day 1)
- JWT authentication (simple — admin and contributor roles only, no full RBAC)
- CRUD endpoints: create project, create tasks, list tasks, submit data
- File upload endpoint using MinIO with presigned URLs (boto3, configurable endpoint so it works with real S3 too)
- **5-8 Pytest tests** for core endpoints (write tests first for auth + task CRUD)

**Day 1 deliverable:** Working API you can hit with curl/Postman. Docker Compose up and running.

### Day 2 (April 5): Celery Pipeline + React Dashboard

**Morning — Async processing pipeline:**
- Celery worker: picks up uploaded files, processes them (image → thumbnail + metadata extraction, audio → file info)
- Job status tracking in PostgreSQL (pending/processing/completed/failed)
- API endpoint to check job status

**Afternoon — React frontend:**
- Vite + React 18 + TypeScript + TailwindCSS + TanStack Query
- Two views:
  1. **Task Board:** List tasks, upload files, see submission status
  2. **Pipeline Monitor:** See Celery jobs in real-time (polling, not WebSocket — simpler, works)
- Connect to FastAPI backend

**Day 2 deliverable:** Full working system — upload a file through React UI, watch it get processed by Celery, see status update.

### Day 3 (April 6): PostgreSQL Optimization + Polish + Ship

**Morning — Demonstrate SQL skills:**
- Write 2-3 meaningful complex queries (contributor stats, task completion rates, submission aggregations)
- Run EXPLAIN ANALYZE on them, document actual output in `docs/query-optimization.md`
- Add proper indexes and show before/after query plan comparison
- API endpoints for these analytics queries

**Afternoon — Polish + Ship:**
- README with architecture diagram (text-based), setup instructions, and API docs
- Ensure `docker compose up` works from clean clone
- Final Pytest pass — aim for 10-15 tests covering critical paths
- Push to GitHub, share with recruiter

---

## Minimum Viable Demo (If Time Runs Out)

If Day 3 goes badly, this is the **absolute minimum** to ship:

- FastAPI with 5+ endpoints (auth, task CRUD, file upload)
- PostgreSQL with indexed schema
- ONE working Celery job (file upload → process)
- React dashboard with task list + upload
- Docker Compose that runs everything
- README with setup instructions

This still hits: FastAPI, React, PostgreSQL, Celery, S3, Docker, end-to-end ownership.

---

## Stretch Goals (Only If Ahead of Schedule)

Add these ONLY if core is polished and tested. In priority order:

1. Recharts analytics view (contributor leaderboard chart)
2. More Pytest coverage (20+ tests)
3. WebSocket for real-time job status (replace polling)
4. Whisper audio transcription in Celery worker

Do NOT add these at the expense of core quality. A recruiter spending 5 minutes on your repo will notice broken Docker Compose or missing README far more than they'll notice a missing chart library.

---

## Tech Stack (Final)

| Layer | Technology | Why This, Not That |
|---|---|---|
| Frontend | **Vite + React 18**, TypeScript, TailwindCSS, TanStack Query | JD says "React" — Vite is faster to build than Next.js, shows pure React skills |
| Backend | FastAPI, Python 3.12, Pydantic v2, SQLAlchemy 2.0 (async), Alembic | Exact match to JD requirements |
| Database | PostgreSQL 16 (B-tree indexes, composite indexes, EXPLAIN ANALYZE docs) | JD emphasizes query optimization — demonstrate with real query plans |
| Queue | Celery + Redis | JD lists "Celery, RQ, SQS" — Celery is the most common |
| Storage | MinIO (S3-compatible, presigned URLs, boto3 with configurable endpoint) | JD says "S3-compatible" — MinIO for local, code works with real S3 |
| Infra | Docker Compose (API, Worker, Redis, MinIO, PostgreSQL) | JD requires Docker |
| Testing | Pytest | Backend is the focus — skip frontend test suite to save time |

### What Was Cut (And Why)

| Cut | Reason |
|---|---|
| Next.js 15 / React 19 | JD says React, not Next.js. SSR complexity not needed for a dashboard. Bleeding edge adds risk. |
| Vitest (frontend tests) | 3-day timeline. Backend tests matter more for this role. |
| Whisper integration | Nice-to-have, not core. Only add as stretch goal. |
| WebSocket | Polling works fine for a demo. Simpler = fewer bugs in 3 days. |
| RBAC (3 roles) | Simple admin/contributor auth demonstrates the skill without the overhead. |
| TanStack Table / Recharts | Stretch goals only. Core dashboard with TailwindCSS tables is sufficient. |
| Materialized views / window functions | Only add if a query naturally needs them. Don't force advanced SQL for show. |
| Multipart uploads | Regular presigned URL upload is sufficient for demo files. |

---

## Key Principles During Build

1. **Show, don't mention.** Don't write "I know EXPLAIN ANALYZE" in the README. Include actual EXPLAIN output in `docs/query-optimization.md` with before/after comparisons.

2. **Production patterns, demo scope.** Use proper project structure, error handling, and typing — but don't build features you won't finish.

3. **README is your pitch.** The recruiter will read the README before anything else. It should clearly state: what it is, how to run it, architecture overview, and what it demonstrates.

4. **`docker compose up` must work on first try.** Test from a clean clone. Nothing kills a demo faster than broken setup.

5. **Code quality > feature count.** Clean, typed, tested code with 5 endpoints beats sloppy code with 20 endpoints.

---

## What to Send the Recruiter on April 6

> Hi Yohannes,
>
> As promised, here's the AnnotateFlow repository: [GitHub link]
>
> It's a data annotation and processing platform built with FastAPI, React, and PostgreSQL. Contributors upload files, Celery workers process them asynchronously through a pipeline, and the dashboard tracks everything in real time. The entire system runs with a single `docker compose up`.
>
> A few highlights:
> - FastAPI backend with JWT auth, typed endpoints, and Pytest coverage
> - PostgreSQL with optimized queries (included EXPLAIN ANALYZE docs in the repo)
> - Celery + Redis pipeline for async file processing
> - React dashboard for task management and pipeline monitoring
> - S3-compatible storage via MinIO with presigned URLs
>
> Happy to walk through the architecture or do a live demo call anytime.

---

## Project Name

**AnnotateFlow**
