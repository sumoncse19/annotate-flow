# Query Optimization — EXPLAIN ANALYZE

This document shows the actual PostgreSQL query plans for key queries used in AnnotateFlow. All queries were run with `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)`.

## Database Schema & Indexes

```sql
-- Indexes created by Alembic migration
CREATE INDEX ix_users_email ON users (email);                    -- Unique user lookup
CREATE INDEX ix_projects_name ON projects (name);                -- Project search
CREATE INDEX ix_projects_owner_id ON projects (owner_id);        -- Filter by owner
CREATE INDEX ix_tasks_project_id ON tasks (project_id);          -- Tasks per project
CREATE INDEX ix_tasks_status ON tasks (status);                  -- Filter by status
CREATE INDEX ix_submissions_task_id ON submissions (task_id);    -- Submissions per task
CREATE INDEX ix_submissions_contributor_id ON submissions (contributor_id);
CREATE INDEX ix_submissions_processing_status ON submissions (processing_status);
```

## Query 1: List Projects with Task Counts

**Used by:** `GET /api/projects/` — The main project listing page.

```sql
SELECT p.id, p.name, p.description, p.owner_id, p.created_at,
       count(t.id) as task_count
FROM projects p
LEFT OUTER JOIN tasks t ON t.project_id = p.id
GROUP BY p.id
ORDER BY p.created_at DESC
LIMIT 20 OFFSET 0
```

**Query Plan:**
```
Limit  (cost=29.86..29.91 rows=20 width=596) (actual time=0.038..0.039 rows=0 loops=1)
  Buffers: shared hit=3
  ->  Sort  (cost=29.86..30.19 rows=130 width=596) (actual time=0.037..0.038 rows=0 loops=1)
        Sort Key: p.created_at DESC
        Sort Method: quicksort  Memory: 25kB
        ->  HashAggregate  (cost=25.10..26.40 rows=130 width=596)
              Group Key: p.id
              ->  Hash Right Join  (cost=12.93..24.45 rows=130 width=604)
                    Hash Cond: (t.project_id = p.id)
Planning Time: 0.744 ms
Execution Time: 0.126 ms
```

**Analysis:** PostgreSQL uses a Hash Right Join to combine projects with task counts. The `ix_tasks_project_id` index supports the join condition. With LIMIT 20, this stays efficient even with thousands of projects.

**At scale:** If the projects table grows beyond 10K rows, adding an index on `projects(created_at DESC)` would allow an Index Scan instead of Sort + Seq Scan.

---

## Query 2: List Tasks with Submission Counts (Filtered by Project)

**Used by:** `GET /api/projects/:id/tasks/` — The task board view.

```sql
SELECT t.id, t.title, t.task_type, t.status, t.priority,
       count(s.id) as submission_count
FROM tasks t
LEFT OUTER JOIN submissions s ON s.task_id = t.id
WHERE t.project_id = $1
GROUP BY t.id
ORDER BY t.priority DESC, t.created_at DESC
LIMIT 20
```

**Query Plan:**
```
Limit  (cost=16.45..16.46 rows=1 width=560) (actual time=0.048..0.048 rows=0 loops=1)
  ->  Sort  (cost=16.37..16.37 rows=1 width=560)
        Sort Key: t.priority DESC, t.created_at DESC
        ->  GroupAggregate  (cost=16.34..16.36 rows=1 width=560)
              ->  Nested Loop Left Join  (cost=0.28..16.33 rows=1 width=568)
                    ->  Index Scan using ix_tasks_project_id on tasks t
                          Index Cond: (project_id = $0)
                    ->  Index Scan using ix_submissions_task_id on submissions s
                          Index Cond: (task_id = t.id)
Planning Time: 0.526 ms
Execution Time: 0.099 ms
```

**Analysis:** This is the optimal plan. PostgreSQL uses:
1. `ix_tasks_project_id` — Index Scan to find tasks for the given project
2. `ix_submissions_task_id` — Nested Loop Join to count submissions per task
3. No Seq Scans — fully index-driven

**At scale:** This query is already well-indexed. A composite index on `tasks(project_id, priority DESC, created_at DESC)` would eliminate the Sort step for large task lists.

---

## Query 3: Pipeline Status Aggregation

**Used by:** `GET /api/pipeline/status` — The pipeline monitor dashboard cards.

```sql
SELECT processing_status, count(id)
FROM submissions
GROUP BY processing_status
```

**Query Plan:**
```
HashAggregate  (cost=10.60..11.00 rows=40 width=12) (actual time=0.005..0.005 rows=0 loops=1)
  Group Key: processing_status
  ->  Seq Scan on submissions  (cost=0.00..10.40 rows=40 width=20)
Planning Time: 0.065 ms
Execution Time: 0.039 ms
```

**Analysis:** Full table scan is expected here — we need to count ALL submissions by status. The `ix_submissions_processing_status` index exists for filtered queries, but for full aggregation a Seq Scan is faster.

**At scale:** With 100K+ submissions, a materialized view refreshed periodically would serve the dashboard without re-scanning the table on every poll.

---

## Query 4: Recent Submissions (Pipeline Feed)

**Used by:** `GET /api/pipeline/recent` — The recent jobs list.

```sql
SELECT id, file_name, content_type, processing_status, processing_result, created_at
FROM submissions
ORDER BY created_at DESC
LIMIT 20
```

**Query Plan:**
```
Limit  (cost=11.46..11.51 rows=20 width=794) (actual time=0.008..0.008 rows=0 loops=1)
  ->  Sort  (cost=11.46..11.56 rows=40 width=794)
        Sort Key: created_at DESC
        Sort Method: quicksort  Memory: 25kB
        ->  Seq Scan on submissions
Planning Time: 0.025 ms
Execution Time: 0.018 ms
```

**Analysis:** Currently uses Seq Scan + Sort because the table is small. The planner correctly avoids index overhead for small datasets.

**At scale:** Adding an index on `submissions(created_at DESC)` would allow PostgreSQL to use an Index Scan Backward, returning the top 20 rows without sorting the entire table. This becomes critical at 100K+ rows.

---

## Index Strategy Summary

| Index | Purpose | Used By |
|---|---|---|
| `ix_users_email` (unique) | Login lookup, duplicate check | Auth endpoints |
| `ix_projects_owner_id` | Filter projects by owner | Project listing |
| `ix_tasks_project_id` | Tasks per project (JOIN) | Task board |
| `ix_tasks_status` | Filter tasks by workflow status | Task filtering |
| `ix_submissions_task_id` | Submissions per task (JOIN) | Submission list, task counts |
| `ix_submissions_processing_status` | Filter by processing state | Pipeline queries |
| `ix_submissions_contributor_id` | Submissions per user | Contributor analytics |

## Recommendations for Production Scale

1. **Add `submissions(created_at DESC)` index** — enables Index Scan for recent jobs query
2. **Add composite `tasks(project_id, priority DESC, created_at DESC)` index** — eliminates Sort for task board
3. **Consider materialized view for pipeline status** — avoids repeated full-table aggregation on every 3s poll
4. **Partition submissions by `created_at`** (monthly) — keeps recent data queries fast as table grows
