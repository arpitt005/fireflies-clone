from datetime import date, timedelta
from sqlalchemy import select
from db import Base, SessionLocal, engine
from models import ActionItem, Meeting, Participant, TranscriptSegment


MEETINGS = [
    {
        "title": "Q3 Product Strategy & Roadmap",
        "meeting_date": date(2026, 10, 8),
        "duration_seconds": 1820,
        "summary": "The team aligned on the Q3 roadmap, prioritizing activation, collaboration, and analytics. The biggest decision was to ship the new onboarding flow before investing in a larger redesign. Engineering will validate scope this week, while product will prepare launch messaging and success metrics.",
        "overview": "A focused roadmap discussion covering growth opportunities, product bets, delivery risks, and next-quarter success metrics.",
        "participants": [
            ("Maya Chen", "maya@northstar.io"), ("Arjun Mehta", "arjun@northstar.io"), ("Sofia Patel", "sofia@northstar.io"), ("Daniel Kim", "daniel@northstar.io")
        ],
        "segments": [
            ("Maya Chen", 12, 28, "Thanks everyone. The goal today is to leave with a clear Q3 roadmap and three measurable priorities."),
            ("Arjun Mehta", 31, 55, "From engineering, the main constraint is capacity. We can comfortably take two major bets, but a third needs to be scoped carefully."),
            ("Sofia Patel", 58, 83, "The strongest signal from customers is that onboarding is still slowing the first-value moment. That is where I would spend the first investment."),
            ("Daniel Kim", 87, 116, "That lines up with support data. Users who finish onboarding in the first day retain at a much higher rate."),
            ("Maya Chen", 121, 148, "Okay, so activation becomes priority one. What is the smallest version we can ship without reopening the entire information architecture?"),
            ("Arjun Mehta", 152, 189, "A guided checklist, prefilled workspace templates, and one clear first action. We can keep the current navigation untouched."),
            ("Sofia Patel", 195, 226, "I would also add an optional import step. Several customers told us they feel stuck when they have to start from an empty workspace."),
            ("Arjun Mehta", 231, 263, "Import is doable, but it pulls in permissions work. I can estimate it separately so we do not block the core onboarding release."),
            ("Maya Chen", 268, 301, "Great. Priority two should be team collaboration. The ask is comments and mentions on meeting notes, not a complete social layer."),
            ("Daniel Kim", 307, 338, "For go-to-market, collaboration gives us a much better story than another dashboard. It is easy to demo and easy to understand."),
            ("Sofia Patel", 344, 378, "Analytics is still important, but we should treat it as a lightweight insight layer: weekly usage, activation, and retention by workspace."),
            ("Arjun Mehta", 385, 424, "I can reuse the event pipeline for that. The risk is instrumentation quality, so we need agreed event names before the sprint starts."),
            ("Maya Chen", 430, 466, "Let's lock that. No new dashboard framework. Just the three metrics with enough drill-down to answer why a workspace is moving."),
            ("Sofia Patel", 472, 509, "For launch, marketing needs a target date, and I want the onboarding flow in beta with five design-partner accounts before broad release."),
            ("Daniel Kim", 515, 551, "I will line up the design partners and draft the customer announcement once the beta date is confirmed."),
            ("Arjun Mehta", 557, 596, "I will post the engineering estimate by Friday and flag anything that could move the beta beyond the second week of November."),
            ("Maya Chen", 603, 642, "Perfect. So we have activation first, collaboration second, analytics third, with design-partner beta as the validation gate."),
            ("Sofia Patel", 648, 681, "I'll document the success metrics and the research questions we want answered during beta."),
            ("Daniel Kim", 688, 721, "And I'll own the launch checklist plus the five customer interviews. Let's regroup next Thursday with those inputs."),
            ("Maya Chen", 728, 748, "Sounds good. Thanks everyone."),
        ],
        "actions": [
            ("Share engineering estimate and onboarding scope by Friday", "Arjun Mehta", date(2026, 10, 9)),
            ("Recruit five design-partner accounts for onboarding beta", "Daniel Kim", date(2026, 10, 16)),
            ("Document activation, collaboration, and retention success metrics", "Sofia Patel", date(2026, 10, 12)),
            ("Draft launch checklist and customer announcement", "Daniel Kim", date(2026, 10, 19)),
        ],
    },
    {
        "title": "Design Sprint: Meeting Workspace",
        "meeting_date": date(2026, 10, 7),
        "duration_seconds": 1260,
        "summary": "Design reviewed the meeting workspace and agreed to keep the information hierarchy intentionally simple. The left side should provide AI context while the transcript remains the primary reading surface. Search, action items, and clear timestamps were identified as the highest-value interactions.",
        "overview": "A design critique focused on hierarchy, search, transcript readability, and reducing interaction cost.",
        "participants": [
            ("Sofia Patel", "sofia@northstar.io"), ("Noah Williams", "noah@northstar.io"), ("Priya Shah", "priya@northstar.io")
        ],
        "segments": [
            ("Sofia Patel", 8, 35, "The main question is whether the summary should compete visually with the transcript. I think it should support it, not dominate it."),
            ("Noah Williams", 39, 68, "Agreed. I would make the transcript the strongest vertical surface and keep the summary more compact and scannable."),
            ("Priya Shah", 72, 101, "Search also needs to feel immediate. A user should be able to type a phrase and see matching transcript lines without opening another page."),
            ("Sofia Patel", 106, 141, "Let's keep search in the transcript header. It stays in context and it gives us room for match counts and previous-next controls."),
            ("Noah Williams", 147, 176, "What about timestamps? I think the timestamp should be clickable and the full row should seek the recording."),
            ("Priya Shah", 181, 209, "Yes, and the active line needs a subtle highlight so you always know where the playback is."),
            ("Sofia Patel", 216, 252, "Action items should be visible without leaving the meeting. A small checklist in the summary panel gives enough context."),
            ("Noah Williams", 258, 297, "We can also use status chips for completed items, but I would avoid introducing too many colors. The product should feel calm."),
            ("Priya Shah", 305, 337, "Let's keep the palette mostly warm neutrals with one accent. The current prototypes become noisy when every state gets a different color."),
            ("Sofia Patel", 344, 378, "Exactly. The hierarchy should come from spacing, typography, and alignment first."),
            ("Noah Williams", 386, 416, "I'll update the component spec tonight and annotate the empty, loading, and error states."),
            ("Priya Shah", 421, 450, "I'll test the transcript search interaction with five users and bring any friction back tomorrow."),
        ],
        "actions": [
            ("Update workspace component specification", "Noah Williams", date(2026, 10, 8)),
            ("Run five transcript-search usability tests", "Priya Shah", date(2026, 10, 9)),
        ],
    },
    {
        "title": "Customer Research: Onboarding Feedback",
        "meeting_date": date(2026, 10, 6),
        "duration_seconds": 2140,
        "summary": "Customer interviews consistently pointed to the same friction: users understand the value of meeting notes, but the first session feels like too much setup. The proposed response is a shorter onboarding path, clear sample content, and contextual nudges rather than more documentation.",
        "overview": "Research synthesis across customer interviews with emphasis on first-session friction and onboarding activation.",
        "participants": [
            ("Elena Rossi", "elena@northstar.io"), ("Maya Chen", "maya@northstar.io"), ("Daniel Kim", "daniel@northstar.io")
        ],
        "segments": [
            ("Elena Rossi", 16, 48, "Across all six interviews, users immediately understood the transcript once they saw it. The friction happened before that moment."),
            ("Maya Chen", 52, 84, "What are they doing instead? Are they skipping setup or leaving entirely?"),
            ("Elena Rossi", 89, 122, "Mostly skipping. They create an account, land in an empty workspace, and are not sure what to do next."),
            ("Daniel Kim", 128, 161, "That suggests we should show the finished experience before asking users to configure integrations."),
            ("Elena Rossi", 167, 202, "Exactly. One participant said the product made sense after seeing a seeded meeting, but they almost closed the app before finding one."),
            ("Maya Chen", 208, 239, "Let's test a sample meeting in the default workspace. It gives users something to explore without changing the product model."),
            ("Daniel Kim", 246, 281, "I can create a sample meeting with realistic notes, action items, and a transcript so the workspace feels alive."),
            ("Elena Rossi", 288, 321, "We should also make the first action obvious. The most successful tools in this category guide people to one small next step."),
            ("Maya Chen", 329, 363, "Could that be search? Search demonstrates the cross-meeting value immediately."),
            ("Elena Rossi", 369, 404, "Potentially, but I would start with opening a meeting and then use search as the second interaction."),
            ("Daniel Kim", 412, 448, "I'll draft a lightweight onboarding experiment around that flow and make sure we can measure completion."),
            ("Elena Rossi", 455, 490, "Great. We should not add a tutorial carousel. The interface itself should teach the workflow."),
        ],
        "actions": [
            ("Prototype a seeded sample meeting experience", "Daniel Kim", date(2026, 10, 10)),
            ("Define onboarding completion and first-value events", "Elena Rossi", date(2026, 10, 11)),
            ("Prepare experiment brief for shorter onboarding", "Maya Chen", date(2026, 10, 13)),
        ],
    },
    {
        "title": "Weekly Engineering Standup",
        "meeting_date": date(2026, 10, 5),
        "duration_seconds": 890,
        "summary": "Engineering is on track for the current sprint. The team called out one API dependency, agreed to tighten review turnaround, and confirmed ownership for the remaining bugs before Friday.",
        "overview": "Weekly delivery check-in covering blockers, ownership, and sprint progress.",
        "participants": [
            ("Arjun Mehta", "arjun@northstar.io"), ("Priya Shah", "priya@northstar.io"), ("Noah Williams", "noah@northstar.io"), ("Ishan Gupta", "ishan@northstar.io")
        ],
        "segments": [
            ("Arjun Mehta", 10, 32, "I'll start with the API migration. The new endpoint is ready, but I'm waiting for the auth changes to land."),
            ("Priya Shah", 36, 62, "Auth should be merged this afternoon. I have one review left and then I'll deploy to staging."),
            ("Noah Williams", 67, 94, "The transcript search UI is complete. I found one edge case with no results that I am fixing today."),
            ("Ishan Gupta", 101, 128, "I picked up the export flow. Markdown is done and I'm adding plain text next."),
            ("Arjun Mehta", 135, 166, "Good. Let's keep Friday as the cutoff for anything we consider sprint-critical."),
            ("Priya Shah", 171, 197, "I'll also add an API contract test so the frontend doesn't have to guess about error responses."),
            ("Noah Williams", 202, 229, "That would help. I can update the client wrapper once the response shape is final."),
            ("Ishan Gupta", 235, 261, "No blockers on export. The only question is whether we include timestamps by default."),
            ("Arjun Mehta", 268, 296, "Default should be yes. Users can remove them later, but timestamps are core meeting metadata."),
        ],
        "actions": [
            ("Merge auth update and deploy to staging", "Priya Shah", date(2026, 10, 5)),
            ("Fix transcript search empty-state edge case", "Noah Williams", date(2026, 10, 6)),
            ("Finish plain-text export with timestamps", "Ishan Gupta", date(2026, 10, 7)),
        ],
    },
]


def initials(name: str) -> str:
    parts = name.split()
    return "".join(p[0] for p in parts[:2]).upper()


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.scalar(select(Meeting.id).limit(1)):
            return
        for m in MEETINGS:
            meeting = Meeting(
                title=m["title"], meeting_date=m["meeting_date"], duration_seconds=m["duration_seconds"],
                summary=m["summary"], overview=m["overview"]
            )
            db.add(meeting)
            db.flush()
            for name, email in m["participants"]:
                db.add(Participant(meeting_id=meeting.id, name=name, email=email, initials=initials(name)))
            for speaker, start, end, text in m["segments"]:
                db.add(TranscriptSegment(meeting_id=meeting.id, speaker=speaker, start_time=start, end_time=end, text=text))
            for task, owner, due_date in m["actions"]:
                db.add(ActionItem(meeting_id=meeting.id, task=task, owner=owner, due_date=due_date))
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
