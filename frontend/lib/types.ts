export type Participant = {
  id: number;
  name: string;
  email?: string | null;
  initials: string;
};

export type Segment = {
  id: number;
  speaker: string;
  start_time: number;
  end_time: number;
  text: string;
};

export type ActionItem = {
  id: number;
  task: string;
  owner?: string | null;
  due_date?: string | null;
  completed: boolean;
};

export type Meeting = {
  id: number;
  title: string;
  meeting_date: string;
  duration_seconds: number;
  participant_count: number;
  participants: Participant[];
  summary: string;
  overview: string;
  action_items: ActionItem[];
  segments: Segment[];
  created_at: string;
  updated_at: string;
};

export type MeetingListItem = Pick<Meeting, "id" | "title" | "meeting_date" | "duration_seconds" | "participant_count" | "participants">;
