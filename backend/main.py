origins = [
    x.strip()
    for x in getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,https://fireflies-clone-dusky.vercel.app",
    ).split(",")
    if x.strip()
]

from datetime import date
from os import getenv
from typing import Optional

from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from db import Base, engine, get_db
from models import ActionItem, Meeting, Participant, TranscriptSegment
from schemas import (
    ActionItemCreate,
    ActionItemOut,
    ActionItemUpdate,
    MeetingCreate,
    MeetingListOut,
    MeetingOut,
    MeetingUpdate,
)
from seed import seed

app = FastAPI(title="Fireflies Clone API", version="1.0.0")

origins = [
    item.strip()
    for item in getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if item.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)
seed()


def get_meeting_or_404(db: Session, meeting_id: int) -> Meeting:
    stmt = (
        select(Meeting)
        .options(
            selectinload(Meeting.participants),
            selectinload(Meeting.segments),
            selectinload(Meeting.action_items),
        )
        .where(Meeting.id == meeting_id)
    )
    meeting = db.scalar(stmt)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


def meeting_to_response(meeting: Meeting) -> MeetingOut:
    """Build the API response and include the computed participant count."""
    return MeetingOut(
        id=meeting.id,
        title=meeting.title,
        meeting_date=meeting.meeting_date,
        duration_seconds=meeting.duration_seconds,
        participant_count=len(meeting.participants),
        participants=meeting.participants,
        summary=meeting.summary,
        overview=meeting.overview,
        action_items=meeting.action_items,
        segments=meeting.segments,
        created_at=meeting.created_at,
        updated_at=meeting.updated_at,
    )


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/meetings", response_model=list[MeetingListOut])
def list_meetings(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(default=None),
    participant: Optional[str] = Query(default=None),
    from_date: Optional[date] = Query(default=None),
    to_date: Optional[date] = Query(default=None),
    sort: str = Query(default="recent"),
):
    stmt = select(Meeting).options(selectinload(Meeting.participants))

    if q and q.strip():
        needle = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Meeting.title.ilike(needle),
                Meeting.participants.any(Participant.name.ilike(needle)),
            )
        )

    if participant and participant.strip():
        stmt = stmt.where(
            Meeting.participants.any(
                Participant.name.ilike(f"%{participant.strip()}%")
            )
        )

    if from_date:
        stmt = stmt.where(Meeting.meeting_date >= from_date)
    if to_date:
        stmt = stmt.where(Meeting.meeting_date <= to_date)

    if sort == "oldest":
        stmt = stmt.order_by(Meeting.meeting_date.asc(), Meeting.id.asc())
    elif sort == "title":
        stmt = stmt.order_by(Meeting.title.asc())
    else:
        stmt = stmt.order_by(Meeting.meeting_date.desc(), Meeting.id.desc())

    meetings = db.scalars(stmt).all()
    return [
        MeetingListOut(
            id=meeting.id,
            title=meeting.title,
            meeting_date=meeting.meeting_date,
            duration_seconds=meeting.duration_seconds,
            participant_count=len(meeting.participants),
            participants=meeting.participants,
        )
        for meeting in meetings
    ]


# Required by the meeting detail page when it opens a meeting.
@app.get("/api/meetings/{meeting_id}", response_model=MeetingOut)
def get_meeting(meeting_id: int, db: Session = Depends(get_db)):
    return meeting_to_response(get_meeting_or_404(db, meeting_id))


# Required by the New Meeting form.
@app.post("/api/meetings", response_model=MeetingOut, status_code=201)
def create_meeting(payload: MeetingCreate, db: Session = Depends(get_db)):
    meeting = Meeting(
        title=payload.title,
        meeting_date=payload.meeting_date,
        duration_seconds=payload.duration_seconds,
        summary=payload.summary,
        overview=payload.overview,
    )
    db.add(meeting)
    db.flush()

    for person in payload.participants:
        db.add(
            Participant(
                meeting_id=meeting.id,
                name=person.name,
                email=person.email,
                initials=person.initials,
            )
        )

    for segment in payload.segments:
        db.add(
            TranscriptSegment(
                meeting_id=meeting.id,
                speaker=segment.speaker,
                start_time=segment.start_time,
                end_time=segment.end_time,
                text=segment.text,
            )
        )

    db.commit()
    return meeting_to_response(get_meeting_or_404(db, meeting.id))


@app.post(
    "/api/meetings/{meeting_id}/transcript-upload",
    response_model=MeetingOut,
)
async def upload_transcript(
    meeting_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    meeting = get_meeting_or_404(db, meeting_id)
    raw = await file.read()
    text = raw.decode("utf-8", errors="ignore")
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    start = 0.0
    for line in lines[:500]:
        speaker = "Speaker"
        content = line
        if ":" in line:
            speaker, content = [part.strip() for part in line.split(":", 1)]
        db.add(
            TranscriptSegment(
                meeting_id=meeting.id,
                speaker=speaker,
                start_time=start,
                end_time=start + 12,
                text=content,
            )
        )
        start += 12

    meeting.duration_seconds = int(max(meeting.duration_seconds, start))
    db.commit()
    return meeting_to_response(get_meeting_or_404(db, meeting_id))


@app.put("/api/meetings/{meeting_id}", response_model=MeetingOut)
def update_meeting(
    meeting_id: int,
    payload: MeetingUpdate,
    db: Session = Depends(get_db),
):
    meeting = get_meeting_or_404(db, meeting_id)
    changes = payload.model_dump(exclude_unset=True)
    participants = changes.pop("participants", None)

    for key, value in changes.items():
        setattr(meeting, key, value)

    if participants is not None:
        meeting.participants.clear()
        db.flush()
        for person in participants:
            name = person["name"]
            initials = person.get("initials") or "".join(
                part[0] for part in name.split()[:2]
            ).upper()
            meeting.participants.append(
                Participant(
                    name=name,
                    email=person.get("email"),
                    initials=initials,
                )
            )

    db.commit()
    return meeting_to_response(get_meeting_or_404(db, meeting_id))


@app.delete("/api/meetings/{meeting_id}", status_code=204)
def delete_meeting(meeting_id: int, db: Session = Depends(get_db)):
    meeting = get_meeting_or_404(db, meeting_id)
    db.delete(meeting)
    db.commit()
    return None


@app.post(
    "/api/meetings/{meeting_id}/actions",
    response_model=ActionItemOut,
    status_code=201,
)
def add_action(
    meeting_id: int,
    payload: ActionItemCreate,
    db: Session = Depends(get_db),
):
    get_meeting_or_404(db, meeting_id)
    action = ActionItem(meeting_id=meeting_id, **payload.model_dump())
    db.add(action)
    db.commit()
    db.refresh(action)
    return action


@app.put("/api/actions/{action_id}", response_model=ActionItemOut)
def update_action(
    action_id: int,
    payload: ActionItemUpdate,
    db: Session = Depends(get_db),
):
    action = db.get(ActionItem, action_id)
    if action is None:
        raise HTTPException(status_code=404, detail="Action item not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(action, key, value)
    db.commit()
    db.refresh(action)
    return action


@app.delete("/api/actions/{action_id}", status_code=204)
def delete_action(action_id: int, db: Session = Depends(get_db)):
    action = db.get(ActionItem, action_id)
    if action is None:
        raise HTTPException(status_code=404, detail="Action item not found")
    db.delete(action)
    db.commit()
    return None


@app.get("/api/search")
def global_search(q: str = Query(min_length=1), db: Session = Depends(get_db)):
    needle = f"%{q.strip()}%"
    stmt = (
        select(Meeting, TranscriptSegment)
        .join(TranscriptSegment, TranscriptSegment.meeting_id == Meeting.id)
        .where(TranscriptSegment.text.ilike(needle))
        .order_by(Meeting.meeting_date.desc(), TranscriptSegment.start_time.asc())
    )
    rows = db.execute(stmt).all()
    return [
        {
            "meeting_id": meeting.id,
            "meeting_title": meeting.title,
            "segment_id": segment.id,
            "speaker": segment.speaker,
            "timestamp": segment.start_time,
            "text": segment.text,
        }
        for meeting, segment in rows
    ]
