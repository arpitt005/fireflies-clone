from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field


class ParticipantBase(BaseModel):
    name: str
    email: str | None = None
    initials: str = "??"


class ParticipantOut(ParticipantBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class TranscriptSegmentBase(BaseModel):
    speaker: str
    start_time: float = Field(ge=0)
    end_time: float = Field(ge=0)
    text: str


class TranscriptSegmentOut(TranscriptSegmentBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class ActionItemCreate(BaseModel):
    task: str
    owner: str | None = None
    due_date: date | None = None


class ActionItemUpdate(BaseModel):
    task: str | None = None
    owner: str | None = None
    due_date: date | None = None
    completed: bool | None = None


class ActionItemOut(ActionItemCreate):
    id: int
    completed: bool
    model_config = ConfigDict(from_attributes=True)


class MeetingCreate(BaseModel):
    title: str
    meeting_date: date
    duration_seconds: int = 0
    summary: str = ""
    overview: str = ""
    participants: list[ParticipantBase] = []
    segments: list[TranscriptSegmentBase] = []


class MeetingUpdate(BaseModel):
    title: str | None = None
    meeting_date: date | None = None
    duration_seconds: int | None = None
    summary: str | None = None
    overview: str | None = None
    participants: list[ParticipantBase] | None = None


class MeetingListOut(BaseModel):
    id: int
    title: str
    meeting_date: date
    duration_seconds: int
    participant_count: int
    participants: list[ParticipantOut]
    model_config = ConfigDict(from_attributes=True)


class MeetingOut(MeetingListOut):
    summary: str
    overview: str
    action_items: list[ActionItemOut]
    segments: list[TranscriptSegmentOut]
    created_at: datetime
    updated_at: datetime
