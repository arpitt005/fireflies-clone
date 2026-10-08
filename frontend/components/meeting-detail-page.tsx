"use client";

import {
  ArrowLeft,
  Check,
  Clock3,
  Download,
  Edit3,
  Ellipsis,
  FileText,
  ListChecks,
  MessageSquare,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Send,
  Share2,
  Sparkles,
  Tag,
  Trash2,
  Users,
  X,
} from "lucide-react";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "./app-shell";

import {
  addAction,
  deleteAction,
  deleteMeeting,
  getMeeting,
  updateAction,
  updateMeeting,
} from "@/lib/api";

import type { ActionItem, Meeting } from "@/lib/types";

function formatTime(total: number) {
  const seconds = Math.max(0, Math.floor(total));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function escapeHtml(text: string) {
  return text.replace(/[&<>]/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
    };

    return map[c] || c;
  });
}

function highlight(text: string, query: string) {
  if (!query.trim()) {
    return escapeHtml(text);
  }

  const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return escapeHtml(text).replace(
    new RegExp(`(${escapedQuery})`, "gi"),
    "<mark>$1</mark>"
  );
}

export default function MeetingDetailPage({ id }: { id: string }) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [search, setSearch] = useState("");
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const [tab, setTab] = useState<"summary" | "outline">("summary");
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(900);

  const [editingTitle, setEditingTitle] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [participantDraft, setParticipantDraft] = useState("");

  const [editingActionId, setEditingActionId] = useState<number | null>(null);
  const [actionEditDraft, setActionEditDraft] = useState("");

  const [titleValue, setTitleValue] = useState("");
  const [actionDraft, setActionDraft] = useState("");
  const [addingAction, setAddingAction] = useState(false);

  const [toast, setToast] = useState("");

  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const data = await getMeeting(id);

      setMeeting(data);
      setTitleValue(data.title);
      setParticipantDraft(data.participants.map((p) => p.name).join(", "));
      setDuration(Math.max(1, data.duration_seconds));
    } catch (err) {
      setToast(
        err instanceof Error ? err.message : "Unable to load meeting"
      );
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => setToast(""), 2800);

    return () => clearTimeout(timer);
  }, [toast]);

  const filteredSegments = useMemo(() => {
    if (!meeting) {
      return [];
    }

    if (!search.trim()) {
      return meeting.segments;
    }

    const q = search.trim().toLowerCase();

    return meeting.segments.filter((segment) =>
      `${segment.speaker} ${segment.text}`.toLowerCase().includes(q)
    );
  }, [meeting, search]);

  function seekTo(time: number) {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      audioRef.current.play().catch(() => {});
    }

    setCurrent(time);
    setPlaying(true);

    setActiveSegment(
      meeting?.segments.findIndex(
        (segment) =>
          time >= segment.start_time && time < segment.end_time
      ) ?? null
    );
  }

  function syncFromAudio() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    setCurrent(audio.currentTime);
    setPlaying(!audio.paused);

    if (meeting) {
      const index = meeting.segments.findIndex(
        (segment) =>
          audio.currentTime >= segment.start_time &&
          audio.currentTime < segment.end_time
      );

      setActiveSegment(index >= 0 ? index : null);
    }
  }

  useEffect(() => {
    const segment =
      activeSegment !== null
        ? meeting?.segments[activeSegment]
        : null;

    if (!segment || !transcriptRef.current) {
      return;
    }

    const element = transcriptRef.current.querySelector(
      `[data-segment-id="${segment.id}"]`
    ) as HTMLElement | null;

    if (element) {
      element.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [activeSegment, meeting]);

  async function saveTitle() {
    if (!meeting || !titleValue.trim()) {
      return;
    }

    try {
      const updated = await updateMeeting(meeting.id, {
        title: titleValue.trim(),
      });

      setMeeting(updated);
      setEditingTitle(false);
      setToast("Meeting title updated");
    } catch (err) {
      setToast(
        err instanceof Error ? err.message : "Failed to update title"
      );
    }
  }

  async function saveMetadata() {
    if (!meeting) {
      return;
    }

    try {
      const names = participantDraft
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);

      const updated = await updateMeeting(meeting.id, {
        title: titleValue.trim() || meeting.title,
        participants: names.map((name) => ({
          name,
          initials: name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase(),
        })),
      });

      setMeeting(updated);
      setEditOpen(false);
      setToast("Meeting details updated");
    } catch (err) {
      setToast(
        err instanceof Error
          ? err.message
          : "Failed to update meeting"
      );
    }
  }

  async function saveActionEdit(action: ActionItem) {
    if (!meeting || !actionEditDraft.trim()) {
      return;
    }

    try {
      const updated = await updateAction(action.id, {
        task: actionEditDraft.trim(),
      });

      setMeeting({
        ...meeting,
        action_items: meeting.action_items.map((item) =>
          item.id === updated.id ? updated : item
        ),
      });

      setEditingActionId(null);
      setToast("Action item updated");
    } catch (err) {
      setToast(
        err instanceof Error
          ? err.message
          : "Failed to update action item"
      );
    }
  }

  async function toggleAction(action: ActionItem) {
    if (!meeting) {
      return;
    }

    try {
      const updated = await updateAction(action.id, {
        completed: !action.completed,
      });

      setMeeting({
        ...meeting,
        action_items: meeting.action_items.map((item) =>
          item.id === updated.id ? updated : item
        ),
      });
    } catch (err) {
      setToast(
        err instanceof Error
          ? err.message
          : "Failed to update action item"
      );
    }
  }

  async function createAction() {
    if (!meeting || !actionDraft.trim()) {
      return;
    }

    try {
      const action = await addAction(meeting.id, {
        task: actionDraft.trim(),
        owner: "Arpit Kumar",
      });

      setMeeting({
        ...meeting,
        action_items: [...meeting.action_items, action],
      });

      setActionDraft("");
      setAddingAction(false);
      setToast("Action item added");
    } catch (err) {
      setToast(
        err instanceof Error
          ? err.message
          : "Failed to add action item"
      );
    }
  }

  async function removeAction(actionId: number) {
    if (!meeting) {
      return;
    }

    try {
      await deleteAction(actionId);

      setMeeting({
        ...meeting,
        action_items: meeting.action_items.filter(
          (item) => item.id !== actionId
        ),
      });

      setToast("Action item removed");
    } catch (err) {
      setToast(
        err instanceof Error
          ? err.message
          : "Failed to remove action item"
      );
    }
  }

  async function removeMeeting() {
    if (!meeting) {
      return;
    }

    try {
      await deleteMeeting(meeting.id);
      window.location.href = "/meetings";
    } catch (err) {
      setToast(
        err instanceof Error
          ? err.message
          : "Failed to delete meeting"
      );
    }
  }

  async function exportTxt() {
    if (!meeting) {
      return;
    }

    const content = `${meeting.title}
${formatDate(meeting.meeting_date)}

SUMMARY
${meeting.summary}

ACTION ITEMS
${meeting.action_items
  .map(
    (action) =>
      `- ${action.task}${action.owner ? ` (${action.owner})` : ""}`
  )
  .join("\n")}

TRANSCRIPT
${meeting.segments
  .map(
    (segment) =>
      `[${formatTime(segment.start_time)}] ${segment.speaker}: ${segment.text}`
  )
  .join("\n")}`;

    const blob = new Blob([content], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `${meeting.title
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase()}.txt`;

    anchor.click();
    URL.revokeObjectURL(url);

    setToast("Transcript exported");
  }

  if (!meeting) {
    return (
      <AppShell>
        <div className="grid min-h-[70vh] place-items-center">
          <div className="rounded-2xl border border-line bg-white px-8 py-7 shadow-soft">
            <div className="h-2 w-28 animate-pulse rounded-full bg-soft" />
            <div className="mt-3 h-2 w-48 animate-pulse rounded-full bg-soft" />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="border-b border-line bg-white px-5 py-4 md:px-8">
        <div className="mx-auto max-w-[1500px]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/meetings"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line text-muted hover:bg-soft"
              >
                <ArrowLeft size={17} />
              </Link>

              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                  Meetings / Notebook
                </div>

                {editingTitle ? (
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      value={titleValue}
                      onChange={(event) =>
                        setTitleValue(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          saveTitle();
                        }
                      }}
                      autoFocus
                      className="min-w-[240px] rounded-lg border border-[#cbbcf7] px-2.5 py-1.5 text-lg font-semibold outline-none"
                    />

                    <button
                      onClick={saveTitle}
                      className="rounded-lg bg-[#7c4dff] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Save
                    </button>

                    <button
                      onClick={() => {
                        setEditingTitle(false);
                        setTitleValue(meeting.title);
                      }}
                      className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingTitle(true)}
                    className="group mt-0.5 flex max-w-full items-center gap-2 text-left"
                  >
                    <h1 className="truncate text-lg font-semibold tracking-[-0.02em]">
                      {meeting.title}
                    </h1>

                    <Edit3
                      size={14}
                      className="text-muted opacity-0 group-hover:opacity-100"
                    />
                  </button>
                )}
              </div>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <button
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-line px-3.5 py-2.5 text-sm font-semibold text-[#59545e] hover:bg-soft"
              >
                <Edit3 size={16} />
                Edit
              </button>

              <button
                onClick={exportTxt}
                className="flex items-center gap-2 rounded-xl border border-line px-3.5 py-2.5 text-sm font-semibold text-[#59545e] hover:bg-soft"
              >
                <Download size={16} />
                Export
              </button>

              <button
                onClick={() =>
                  setToast("Share link copied (demo)")
                }
                className="flex items-center gap-2 rounded-xl border border-line px-3.5 py-2.5 text-sm font-semibold text-[#59545e] hover:bg-soft"
              >
                <Share2 size={16} />
                Share
              </button>

              <button
                onClick={removeMeeting}
                className="grid h-10 w-10 place-items-center rounded-xl border border-line text-muted hover:bg-red-50 hover:text-red-600"
                aria-label="Delete meeting"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <Clock3 size={14} />
              {formatDate(meeting.meeting_date)}
            </span>

            <span className="flex items-center gap-1.5">
              <FileText size={14} />
              {formatTime(meeting.duration_seconds)}
            </span>

            <span className="flex items-center gap-1.5">
              <MessageSquare size={14} />
              {meeting.segments.length} transcript moments
            </span>

            <div className="ml-auto flex -space-x-2">
              {meeting.participants.map((participant, index) => (
                <div
                  key={participant.id}
                  title={participant.name}
                  className={`grid h-7 w-7 place-items-center rounded-full border-2 border-white text-[9px] font-bold ${
                    [
                      "bg-[#eadbff] text-[#6941c6]",
                      "bg-[#dceeff] text-[#2f6fad]",
                      "bg-[#fce2ef] text-[#ae3d71]",
                      "bg-[#dcf5e7] text-[#1e7a4d]",
                    ][index % 4]
                  }`}
                >
                  {participant.initials}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1500px] px-5 py-5 md:px-8">
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
          <div className="relative h-[152px] bg-[#17151b]">
            <div
              className="absolute inset-0 opacity-70"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 30%, rgba(124,77,255,.28), transparent 32%), radial-gradient(circle at 80% 70%, rgba(226,207,255,.10), transparent 27%)",
              }}
            />

            <div className="relative flex h-full flex-col justify-between p-5">
              <div className="flex items-center justify-between">
                <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80">
                  Meeting recording · demo audio
                </div>

                <div className="text-xs text-white/50">
                  {formatTime(duration)}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    if (!audioRef.current) return;

                    if (audioRef.current.paused) {
                      audioRef.current.play().catch(() => {});
                    } else {
                      audioRef.current.pause();
                    }
                  }}
                  className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#201d24] shadow"
                  aria-label={
                    playing ? "Pause recording" : "Play recording"
                  }
                >
                  <Play
                    size={18}
                    fill="currentColor"
                    className={!playing ? "ml-0.5" : "hidden"}
                  />

                  <span
                    className={
                      playing
                        ? "text-lg leading-none"
                        : "hidden"
                    }
                  >
                    Ⅱ
                  </span>
                </button>

                <div className="flex-1">
                  <div className="relative h-1.5 rounded-full bg-white/20">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-[#b996ff]"
                      style={{
                        width: `${
                          duration > 0
                            ? Math.min(
                                100,
                                (current / duration) * 100
                              )
                            : 0
                        }%`,
                      }}
                    />

                    <input
                      aria-label="Seek recording"
                      type="range"
                      min="0"
                      max={duration}
                      step="0.1"
                      value={Math.min(duration, current)}
                      onChange={(event) =>
                        seekTo(Number(event.target.value))
                      }
                      className="absolute -top-2 h-5 w-full cursor-pointer opacity-0"
                    />
                  </div>

                  <div className="mt-2 flex justify-between text-[11px] text-white/50">
                    <span>{formatTime(current)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <button
                  className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/10 text-white/70"
                  aria-label="More recording options"
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>
            </div>

            <audio
              ref={audioRef}
              src="/sample-meeting.wav"
              onTimeUpdate={syncFromAudio}
              onLoadedMetadata={(event) => {
                const loadedDuration =
                  event.currentTarget.duration;

                if (Number.isFinite(loadedDuration) && loadedDuration > 0) {
                  setDuration(loadedDuration);
                }
              }}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
            />
          </div>

          <div className="grid min-h-[680px] grid-cols-1 lg:grid-cols-[minmax(360px,.95fr)_minmax(460px,1.25fr)]">
            <section className="border-b border-line lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between border-b border-line px-6 py-4">
                <div className="flex items-center gap-1 rounded-xl bg-soft p-1">
                  <button
                    onClick={() => setTab("summary")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      tab === "summary"
                        ? "bg-white text-[#2d2931] shadow-sm"
                        : "text-muted"
                    }`}
                  >
                    Summary
                  </button>

                  <button
                    onClick={() => setTab("outline")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      tab === "outline"
                        ? "bg-white text-[#2d2931] shadow-sm"
                        : "text-muted"
                    }`}
                  >
                    Outline
                  </button>
                </div>

                <button
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-soft"
                  aria-label="More summary options"
                >
                  <Ellipsis size={17} />
                </button>
              </div>

              {tab === "summary" ? (
                <div className="space-y-7 p-6">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Sparkles
                        size={16}
                        className="text-[#7c4dff]"
                      />
                      AI overview
                    </div>

                    <p className="mt-3 text-[14px] leading-7 text-[#5e5963]">
                      {meeting.summary}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <ListChecks
                          size={16}
                          className="text-[#7c4dff]"
                        />
                        Action items
                      </div>

                      <button
                        onClick={() => setAddingAction(true)}
                        className="flex items-center gap-1 text-xs font-semibold text-[#6840ce]"
                      >
                        <Plus size={14} />
                        Add
                      </button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {meeting.action_items.map((action) => (
                        <div
                          key={action.id}
                          className="group rounded-xl border border-line bg-[#fcfbfd] p-3.5"
                        >
                          <div className="flex gap-3">
                            <button
                              onClick={() => toggleAction(action)}
                              className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                                action.completed
                                  ? "border-[#7c4dff] bg-[#7c4dff] text-white"
                                  : "border-[#d5cfdb] bg-white"
                              }`}
                              aria-label={
                                action.completed
                                  ? "Mark action incomplete"
                                  : "Mark action complete"
                              }
                            >
                              {action.completed && (
                                <Check size={13} />
                              )}
                            </button>

                            <div className="min-w-0 flex-1">
                              {editingActionId === action.id ? (
                                <div>
                                  <input
                                    autoFocus
                                    value={actionEditDraft}
                                    onChange={(event) =>
                                      setActionEditDraft(
                                        event.target.value
                                      )
                                    }
                                    onKeyDown={(event) => {
                                      if (
                                        event.key === "Enter"
                                      ) {
                                        saveActionEdit(action);
                                      }
                                    }}
                                    className="w-full rounded-lg border border-[#ccbaf6] bg-white px-2.5 py-2 text-sm outline-none"
                                  />

                                  <div className="mt-2 flex gap-2">
                                    <button
                                      onClick={() =>
                                        setEditingActionId(null)
                                      }
                                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted"
                                    >
                                      Cancel
                                    </button>

                                    <button
                                      onClick={() =>
                                        saveActionEdit(action)
                                      }
                                      className="rounded-lg bg-[#7c4dff] px-2.5 py-1.5 text-xs font-semibold text-white"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingActionId(action.id);
                                      setActionEditDraft(
                                        action.task
                                      );
                                    }}
                                    className={`text-left text-sm leading-5 ${
                                      action.completed
                                        ? "text-muted line-through"
                                        : "text-[#4b4650]"
                                    }`}
                                  >
                                    {action.task}
                                  </button>

                                  <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
                                    <span className="rounded-md bg-soft px-2 py-1">
                                      {action.owner || "Unassigned"}
                                    </span>

                                    {action.due_date && (
                                      <span>
                                        Due{" "}
                                        {new Date(
                                          `${action.due_date}T12:00:00`
                                        ).toLocaleDateString(
                                          "en-US",
                                          {
                                            month: "short",
                                            day: "numeric",
                                          }
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>

                            <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                              <button
                                onClick={() => {
                                  setEditingActionId(action.id);
                                  setActionEditDraft(
                                    action.task
                                  );
                                }}
                                className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-soft"
                                aria-label="Edit action item"
                              >
                                <Edit3 size={14} />
                              </button>

                              <button
                                onClick={() =>
                                  removeAction(action.id)
                                }
                                className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-500"
                                aria-label="Delete action item"
                              >
                                <X size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {addingAction && (
                        <div className="rounded-xl border border-[#d9cdf7] bg-[#fbf9ff] p-3">
                          <input
                            autoFocus
                            value={actionDraft}
                            onChange={(event) =>
                              setActionDraft(event.target.value)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                createAction();
                              }
                            }}
                            placeholder="What needs to happen?"
                            className="w-full bg-transparent text-sm outline-none"
                          />

                          <div className="mt-3 flex justify-end gap-2">
                            <button
                              onClick={() => setAddingAction(false)}
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted"
                            >
                              Cancel
                            </button>

                            <button
                              onClick={createAction}
                              className="rounded-lg bg-[#7c4dff] px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              Add task
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Tag
                        size={16}
                        className="text-[#7c4dff]"
                      />
                      Key topics
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        "Product strategy",
                        "Activation",
                        "Collaboration",
                        "Analytics",
                        "Onboarding",
                        "Roadmap",
                      ].map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full border border-line bg-soft px-2.5 py-1.5 text-xs text-[#625d67]"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#f8f5ff] p-4">
                    <div className="text-xs font-semibold text-[#6748ad]">
                      Meeting note
                    </div>

                    <p className="mt-1.5 text-xs leading-5 text-[#75688e]">
                      The AI sections are seeded for this assignment.
                      The transcript and actions are persisted in
                      SQLite and update through the FastAPI API.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 p-6">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Tag
                        size={16}
                        className="text-[#7c4dff]"
                      />
                      Chapters
                    </div>

                    <div className="mt-3 space-y-2">
                      {[
                        [12, "Roadmap priorities"],
                        [121, "Activation and onboarding"],
                        [268, "Collaboration experience"],
                        [385, "Analytics and instrumentation"],
                        [472, "Launch plan and next steps"],
                      ].map(([time, label]) => (
                        <button
                          key={String(time)}
                          onClick={() => seekTo(Number(time))}
                          className="flex w-full items-center justify-between rounded-xl border border-line bg-[#fcfbfd] px-3.5 py-3 text-left hover:bg-soft"
                        >
                          <span className="text-sm font-medium text-[#4f4a55]">
                            {label}
                          </span>

                          <span className="ml-4 shrink-0 rounded-md bg-soft px-2 py-1 text-[11px] font-semibold text-[#7957bd]">
                            {formatTime(Number(time))}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <ListChecks
                        size={16}
                        className="text-[#7c4dff]"
                      />
                      Transcript outline
                    </div>

                    {meeting.segments
                      .filter((segment) => segment.start_time < 700)
                      .map((segment) => (
                        <button
                          key={segment.id}
                          onClick={() =>
                            seekTo(segment.start_time)
                          }
                          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-soft"
                        >
                          <span className="text-sm font-medium text-[#4f4a55]">
                            {segment.text.slice(0, 74)}
                            {segment.text.length > 74
                              ? "…"
                              : ""}
                          </span>

                          <span className="ml-4 shrink-0 text-[11px] font-semibold text-[#7957bd]">
                            {formatTime(segment.start_time)}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </section>

            <section className="min-w-0">
              <div className="flex items-center justify-between border-b border-line px-6 py-4">
                <div>
                  <div className="text-sm font-semibold">
                    Transcript
                  </div>

                  <div className="mt-0.5 text-xs text-muted">
                    Click any line to jump to that moment.
                  </div>
                </div>

                <div className="relative w-[210px]">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                  />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search transcript"
                    className="w-full rounded-lg border border-line bg-soft py-2 pl-9 pr-3 text-xs outline-none focus:border-[#c8baf6]"
                  />
                </div>
              </div>

              <div
                ref={transcriptRef}
                className="h-[620px] overflow-y-auto px-5 py-5 sm:px-8"
              >
                {filteredSegments.map((segment) => {
                  const originalIndex =
                    meeting.segments.findIndex(
                      (item) => item.id === segment.id
                    );

                  const active = originalIndex === activeSegment;

                  return (
                    <button
                      key={segment.id}
                      data-segment-id={segment.id}
                      onClick={() =>
                        seekTo(segment.start_time)
                      }
                      className={`transcript-row mb-1 flex w-full gap-4 rounded-xl px-3 py-3 text-left transition ${
                        active
                          ? "bg-[#f6f1ff] ring-1 ring-[#e8defd]"
                          : "hover:bg-[#fbfafc]"
                      }`}
                    >
                      <div className="w-14 shrink-0 pt-0.5 text-[11px] font-semibold text-[#7b6f8a]">
                        {formatTime(segment.start_time)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-xs font-semibold ${
                            active
                              ? "text-[#6740c6]"
                              : "text-[#49434e]"
                          }`}
                        >
                          {segment.speaker}
                        </div>

                        <div
                          className="mt-1.5 text-[14px] leading-7 text-[#5b5660]"
                          dangerouslySetInnerHTML={{
                            __html: highlight(
                              segment.text,
                              search
                            ),
                          }}
                        />
                      </div>
                    </button>
                  );
                })}

                {filteredSegments.length === 0 && (
                  <div className="grid h-full place-items-center text-center">
                    <div>
                      <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-soft">
                        <Search
                          size={17}
                          className="text-muted"
                        />
                      </div>

                      <div className="mt-3 text-sm font-semibold">
                        No matches
                      </div>

                      <div className="mt-1 text-xs text-muted">
                        Try another keyword.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-line bg-white px-5 py-3 text-xs text-muted">
          <div className="flex items-center gap-5">
            <span>Default workspace</span>
            <span>·</span>
            <span>Last edited just now</span>
          </div>

          <button
            onClick={() => setToast("Meeting saved")}
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-semibold text-[#6c43cf] hover:bg-[#f5f0ff]"
          >
            <Send size={13} />
            Save
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-[#26222b] px-4 py-3 text-sm font-medium text-white shadow-soft">
          {toast}
        </div>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17131d]/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[520px] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_70px_rgba(31,22,44,.22)]">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold">
                  <Users
                    size={17}
                    className="text-[#7c4dff]"
                  />
                  Edit meeting
                </div>

                <div className="mt-0.5 text-xs text-muted">
                  Update the meeting title and participants.
                </div>
              </div>

              <button
                onClick={() => setEditOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-soft"
                aria-label="Close edit meeting"
              >
                <X size={17} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <label>
                <span className="mb-1.5 block text-xs font-semibold text-[#5c5661]">
                  Title
                </span>

                <input
                  value={titleValue}
                  onChange={(event) =>
                    setTitleValue(event.target.value)
                  }
                  className="w-full rounded-xl border border-line bg-soft px-3.5 py-2.5 text-sm outline-none"
                />
              </label>

              <label>
                <span className="mb-1.5 block text-xs font-semibold text-[#5c5661]">
                  Participants
                </span>

                <input
                  value={participantDraft}
                  onChange={(event) =>
                    setParticipantDraft(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-line bg-soft px-3.5 py-2.5 text-sm outline-none"
                />

                <span className="mt-1.5 block text-[11px] text-muted">
                  Separate names with commas.
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-line bg-[#fcfbfd] px-6 py-4">
              <button
                onClick={() => setEditOpen(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted"
              >
                Cancel
              </button>

              <button
                onClick={saveMetadata}
                className="rounded-xl bg-[#7c4dff] px-4 py-2.5 text-sm font-semibold text-white"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}