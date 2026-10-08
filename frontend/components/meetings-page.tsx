"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Filter, MoreHorizontal, Plus, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { AppShell, TopSearch } from "./app-shell";
import { getMeetings } from "@/lib/api";
import NewMeetingModal from "./new-meeting-modal";
import type { MeetingListItem } from "@/lib/types";

function initials(name: string) { return name.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase(); }
function formatDuration(sec: number) { const m = Math.floor(sec / 60); return `${m} min`; }
function formatDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function colorFor(i: number) { return ["bg-[#eadbff] text-[#6941c6]", "bg-[#dceeff] text-[#2f6fad]", "bg-[#fce2ef] text-[#ae3d71]", "bg-[#dcf5e7] text-[#1e7a4d]"][i % 4]; }

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [filterOpen, setFilterOpen] = useState(false);
  const [participant, setParticipant] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  async function load() {
    setLoading(true);
    try { setMeetings(await getMeetings({ q, participant, from_date: fromDate, to_date: toDate, sort })); }
    catch { setToast("Backend unavailable — start FastAPI on port 8000."); }
    finally { setLoading(false); }
  }

  useEffect(() => { const t = setTimeout(load, 220); return () => clearTimeout(t); }, [q, participant, fromDate, toDate, sort]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 3000); return () => clearTimeout(t); }, [toast]);

  const grouped = useMemo(() => {
    return meetings.reduce<Record<string, MeetingListItem[]>>((acc, meeting) => {
      const key = new Date(`${meeting.meeting_date}T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
      (acc[key] ||= []).push(meeting); return acc;
    }, {});
  }, [meetings]);

  return <AppShell onNewMeeting={() => setNewOpen(true)}>
    <header className="sticky top-0 z-20 border-b border-line bg-[#fbfafc]/95 px-5 py-4 backdrop-blur md:px-8">
      <div className="mx-auto max-w-[1400px]">
        <TopSearch value={q} onChange={setQ} onBell={() => setToast("You're all caught up.")} />
      </div>
    </header>

    <div className="mx-auto max-w-[1400px] px-5 py-7 md:px-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Workspace</p><h1 className="mt-1 text-[30px] font-semibold tracking-[-0.035em]">Meetings</h1><p className="mt-1 text-sm text-muted">Your conversations, notes, and follow-ups in one place.</p></div>
        <div className="flex gap-2">
          <button onClick={() => setFilterOpen(!filterOpen)} className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold ${filterOpen ? "border-[#cdbfff] bg-[#f6f1ff] text-[#6038c4]" : "border-line bg-white text-[#56515c] hover:bg-soft"}`}><SlidersHorizontal size={16}/>Filters</button>
          <button className="flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm font-semibold text-[#56515c] hover:bg-soft"><Filter size={16}/>All meetings<ChevronDown size={14}/></button>
        </div>
      </div>

      {filterOpen && <div className="mt-4 grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft sm:grid-cols-3">
        <div><div className="mb-1.5 text-xs font-semibold text-muted">Sort</div><select value={sort} onChange={e => setSort(e.target.value)} className="w-full rounded-xl border border-line bg-soft px-3 py-2.5 text-sm outline-none"><option value="recent">Most recent</option><option value="oldest">Oldest first</option><option value="title">Title</option></select></div>
        <div><div className="mb-1.5 text-xs font-semibold text-muted">Participant</div><div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/><input value={participant} onChange={e => setParticipant(e.target.value)} placeholder="Filter by participant" className="w-full rounded-xl border border-line bg-soft py-2.5 pl-9 pr-3 text-sm outline-none"/></div></div>
        <div className="grid grid-cols-2 gap-2"><label><span className="mb-1 block text-[11px] font-semibold text-muted">From</span><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full rounded-xl border border-line bg-soft px-2.5 py-2 text-xs outline-none"/></label><label><span className="mb-1 block text-[11px] font-semibold text-muted">To</span><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full rounded-xl border border-line bg-soft px-2.5 py-2 text-xs outline-none"/></label></div>
      </div>}

      <div className="mt-7 overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
        <div className="grid grid-cols-[minmax(280px,1.7fr)_180px_120px_220px_44px] gap-4 border-b border-line px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          <div>Meeting</div><div>Date</div><div>Duration</div><div>Participants</div><div></div>
        </div>
        {loading ? <div className="space-y-3 p-5"><div className="h-16 animate-pulse rounded-xl bg-soft"/><div className="h-16 animate-pulse rounded-xl bg-soft"/><div className="h-16 animate-pulse rounded-xl bg-soft"/></div> : Object.keys(grouped).length === 0 ? <div className="py-20 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-soft"><Search size={18} className="text-muted"/></div><h3 className="mt-3 font-semibold">No meetings found</h3><p className="mt-1 text-sm text-muted">Try a different title or participant name.</p></div> : Object.entries(grouped).map(([month, items]) => <div key={month}>
          <div className="bg-[#fbfafc] px-5 py-2 text-xs font-semibold text-muted">{month}</div>
          {items.map(meeting => <Link href={`/meetings/${meeting.id}`} key={meeting.id} className="grid grid-cols-[minmax(280px,1.7fr)_180px_120px_220px_44px] items-center gap-4 border-t border-line px-5 py-4 transition hover:bg-[#fcfbff]">
            <div className="min-w-0"><div className="flex items-center gap-2"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#f2ecff] text-[#6840ce]"><Sparkles size={16}/></div><div className="min-w-0"><div className="truncate text-sm font-semibold">{meeting.title}</div><div className="mt-0.5 text-xs text-muted">{meeting.participant_count} participants · notes ready</div></div></div></div>
            <div className="text-sm text-[#514d57]">{formatDate(meeting.meeting_date)}</div><div className="text-sm text-[#514d57]">{formatDuration(meeting.duration_seconds)}</div>
            <div className="flex items-center"><div className="flex -space-x-2">{meeting.participants.slice(0, 4).map((p, i) => <div key={p.id} title={p.name} className={`grid h-8 w-8 place-items-center rounded-full border-2 border-white text-[10px] font-bold ${colorFor(i)}`}>{p.initials || initials(p.name)}</div>)}</div><span className="ml-3 truncate text-xs text-muted">{meeting.participants.slice(0,2).map(p => p.name.split(" ")[0]).join(", ")}{meeting.participant_count > 2 ? ` +${meeting.participant_count - 2}` : ""}</span></div>
            <button onClick={e => e.preventDefault()} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-soft"><MoreHorizontal size={17}/></button>
          </Link>)}
        </div>)}
      </div>

      <div className="mt-5 flex items-center justify-between rounded-2xl border border-dashed border-[#d9d2e4] bg-white/70 px-5 py-4"><div><div className="text-sm font-semibold">Want to add a meeting?</div><div className="mt-0.5 text-xs text-muted">Paste a transcript or create one from scratch.</div></div><button onClick={() => setNewOpen(true)} className="flex items-center gap-2 rounded-xl bg-[#7c4dff] px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-[#6d3ff0]"><Plus size={16}/>New meeting</button></div>
    </div>
    {toast && <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-[#26222b] px-4 py-3 text-sm font-medium text-white shadow-soft">{toast}</div>}
    {newOpen && <NewMeetingModal onClose={() => setNewOpen(false)} onCreated={(id) => { setNewOpen(false); window.location.href = `/meetings/${id}`; }} />}
  </AppShell>;
}
