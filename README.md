# Fireflies Clone — Meeting Notes & Transcription Platform

An original full-stack implementation of a Fireflies-style meeting workspace for the SDE Fullstack assignment. It recreates the post-meeting workflow: meeting library, AI summary, action items, searchable timestamped transcript, playback controls, and meeting CRUD. Real speech-to-text is intentionally out of scope.

## Stack

- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS + lucide-react
- Backend: FastAPI + SQLAlchemy
- Database: SQLite
- Audio: local generated demo WAV (silent room-tone style placeholder)

The product follows the current Fireflies Notepad concept: a two-panel meeting workspace with AI notes/summary on one side and the timestamped transcript on the other. The implementation is original and does not copy Fireflies source code.

## Project structure

```text
fireflies-clone/
├── frontend/
│   ├── app/
│   │   ├── meetings/page.tsx
│   │   └── meetings/[id]/page.tsx
│   ├── components/
│   │   ├── app-shell.tsx
│   │   ├── meetings-page.tsx
│   │   ├── meeting-detail-page.tsx
│   │   └── new-meeting-modal.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   └── types.ts
│   └── public/sample-meeting.wav
└── backend/
    ├── main.py
    ├── db.py
    ├── models.py
    ├── schemas.py
    ├── seed.py
    ├── requirements.txt
    └── Dockerfile
```

## Architecture

The frontend is a client-heavy Next.js App Router UI. It talks to FastAPI over JSON HTTP. FastAPI uses SQLAlchemy ORM against SQLite. The database is automatically created and seeded on API startup.

### Data flow

```text
Next.js UI
   │
   │ HTTP / JSON
   ▼
FastAPI routes
   │
   │ SQLAlchemy ORM
   ▼
SQLite
   ├── meetings
   ├── participants
   ├── transcript_segments
   └── action_items
```

The transcript/player interaction is kept in the meeting detail client component. Clicking a transcript segment writes `audio.currentTime`; `timeupdate` reads the player position and marks the active transcript row.

## Database schema

### meetings

- `id` — primary key
- `title`
- `meeting_date`
- `duration_seconds`
- `summary`
- `overview`
- `created_at`
- `updated_at`

### participants

- `id` — primary key
- `meeting_id` — FK → meetings.id
- `name`
- `email`
- `initials`

### transcript_segments

- `id` — primary key
- `meeting_id` — FK → meetings.id
- `speaker`
- `start_time`
- `end_time`
- `text`

### action_items

- `id` — primary key
- `meeting_id` — FK → meetings.id
- `task`
- `owner`
- `due_date`
- `completed`

Relationships are intentionally normalized: a meeting has many participants, transcript segments, and action items. Deleting a meeting cascades to its dependent rows.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/meetings` | Search, filter, and sort meetings |
| GET | `/api/meetings/{id}` | Meeting detail |
| POST | `/api/meetings` | Create meeting with participants/transcript |
| POST | `/api/meetings/{id}/transcript-upload` | Upload plain transcript text |
| PUT | `/api/meetings/{id}` | Edit meeting metadata / participants |
| DELETE | `/api/meetings/{id}` | Delete meeting |
| GET | `/api/search?q=...` | Global transcript search |
| POST | `/api/meetings/{id}/actions` | Add action item |
| PUT | `/api/actions/{id}` | Edit/complete action item |
| DELETE | `/api/actions/{id}` | Delete action item |

## Local setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The first startup creates `backend/fireflies.db` and seeds four sample meetings.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

## Assignment workflow to demo

1. Open Meetings and search by a meeting title or participant.
2. Open a meeting to show Summary + Outline + Transcript.
3. Use the transcript search box and demonstrate highlighted matches.
4. Click transcript lines to seek the placeholder recording.
5. Let playback move and show the active transcript line tracking the current timestamp.
6. Add/complete/delete action items.
7. Rename a meeting.
8. Export the meeting to TXT.
9. Create a new meeting by pasting a transcript into the creation modal.
10. Delete a meeting and return to the library.

## Deployment notes

### Frontend

Deploy `frontend/` to Vercel or Netlify and set:

```text
NEXT_PUBLIC_API_URL=https://YOUR-BACKEND/api
```

### Backend

Deploy `backend/` to Render/Railway or another Python service using:

```text
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Set `ALLOWED_ORIGINS` to the deployed frontend origin, e.g.:

```text
ALLOWED_ORIGINS=https://your-frontend.example.com
```

### SQLite persistence

SQLite is part of the assignment requirement. For production deployment, use a persistent disk/volume for `fireflies.db`; otherwise a container redeploy can replace the database file.

## Assumptions

- Authentication is intentionally mocked; the UI assumes a logged-in default user.
- Speech-to-text is not implemented; transcript data is seeded or pasted by the user.
- The recording player uses a local placeholder audio file so the interaction can be demonstrated without external assets.
- AI summaries are seeded text for deterministic demo behavior.
- Integrations, live bots, collaboration, and real-time transcription are placeholders/out of scope.

## Original-work note

The UI and implementation were written specifically for this assignment. Fireflies was used only as a product/UX reference for high-level information architecture and interaction patterns.
