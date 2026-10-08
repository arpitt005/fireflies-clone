import type { ActionItem, Meeting, MeetingListItem, Participant, Segment } from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed with ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export function getMeetings(params: { q?: string; participant?: string; from_date?: string; to_date?: string; sort?: string } = {}) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.participant) search.set("participant", params.participant);
  if (params.from_date) search.set("from_date", params.from_date);
  if (params.to_date) search.set("to_date", params.to_date);
  if (params.sort) search.set("sort", params.sort);
  return request<MeetingListItem[]>(`/meetings?${search.toString()}`);
}


export function createMeeting(body: { title: string; meeting_date: string; duration_seconds: number; summary: string; overview: string; participants: Array<Pick<Participant, "name" | "email" | "initials">>; segments: Array<Pick<Segment, "speaker" | "start_time" | "end_time" | "text">> }) {
  return request<Meeting>(`/meetings`, { method: "POST", body: JSON.stringify(body) });
}

export function getMeeting(id: string | number) {
  return request<Meeting>(`/meetings/${id}`);
}

export function updateMeeting(id: number, body: Partial<Pick<Meeting, "title" | "meeting_date" | "duration_seconds" | "summary" | "overview">> & { participants?: Array<Pick<Participant, "name" | "email" | "initials">> }) {
  return request<Meeting>(`/meetings/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

export function deleteMeeting(id: number) {
  return request<void>(`/meetings/${id}`, { method: "DELETE" });
}

export function addAction(meetingId: number, body: { task: string; owner?: string; due_date?: string }) {
  return request<ActionItem>(`/meetings/${meetingId}/actions`, { method: "POST", body: JSON.stringify(body) });
}

export function updateAction(actionId: number, body: Partial<ActionItem>) {
  return request<ActionItem>(`/actions/${actionId}`, { method: "PUT", body: JSON.stringify(body) });
}

export function deleteAction(actionId: number) {
  return request<void>(`/actions/${actionId}`, { method: "DELETE" });
}

export function globalSearch(q: string) {
  return request<Array<{ meeting_id: number; meeting_title: string; segment_id: number; speaker: string; timestamp: number; text: string }>>(`/search?q=${encodeURIComponent(q)}`);
}
