"use client";

import { useMemo, useState } from "react";
import { Calendar, FileText, Sparkles, Upload, X } from "lucide-react";
import { createMeeting } from "@/lib/api";

function parseTranscript(raw: string) {
  const lines = raw.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  return lines.map((line, i) => {
    const match = line.match(/^\[?(\d{1,2}:\d{2})\]?\s*[-–]?\s*([^:]+):\s*(.+)$/);
    const start = i * 12;
    if (match) {
      const [mm, ss] = match[1].split(":").map(Number);
      return { speaker: match[2].trim(), start_time: mm * 60 + ss, end_time: mm * 60 + ss + 11, text: match[3].trim() };
    }
    return { speaker: "Speaker", start_time: start, end_time: start + 11, text: line };
  });
}

export default function NewMeetingModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const [title, setTitle] = useState("New meeting");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [participants, setParticipants] = useState("Arpit Kumar");
  const [summary, setSummary] = useState("A meeting created from the transcript import workflow.");
  const [transcript, setTranscript] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const parsed = useMemo(() => parseTranscript(transcript), [transcript]);

  async function submit() {
    if (!title.trim() || parsed.length === 0) { setError("Add a title and at least one transcript line."); return; }
    setBusy(true); setError("");
    try {
      const names = participants.split(",").map(x => x.trim()).filter(Boolean);
      const meeting = await createMeeting({
        title: title.trim(), meeting_date: date, duration_seconds: Math.max(60, parsed.at(-1)?.end_time || 60),
        summary, overview: "Imported transcript with seeded AI notes.",
        participants: names.map(name => ({ name, initials: name.split(" ").map(x => x[0]).join("").slice(0,2).toUpperCase() })),
        segments: parsed,
      });
      onCreated(meeting.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create meeting"); }
    finally { setBusy(false); }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17131d]/35 p-4 backdrop-blur-sm">
    <div className="flex max-h-[90vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_70px_rgba(31,22,44,.22)]">
      <div className="flex items-center justify-between border-b border-line px-6 py-4"><div><div className="flex items-center gap-2 text-base font-semibold"><Sparkles size={17} className="text-[#7c4dff]"/>Create meeting</div><div className="mt-0.5 text-xs text-muted">Paste a transcript, seed notes, and add it to your workspace.</div></div><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-soft"><X size={17}/></button></div>
      <div className="min-h-0 flex-1 overflow-y-auto grid gap-4 p-6 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-[#5c5661]">Meeting title</span><input value={title} onChange={e=>setTitle(e.target.value)} className="w-full rounded-xl border border-line bg-soft px-3.5 py-2.5 text-sm outline-none focus:border-[#c8baf6]"/></label>
        <label><span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#5c5661]"><Calendar size={13}/>Date</span><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full rounded-xl border border-line bg-soft px-3.5 py-2.5 text-sm outline-none"/></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-[#5c5661]">Participants</span><input value={participants} onChange={e=>setParticipants(e.target.value)} placeholder="Comma-separated names" className="w-full rounded-xl border border-line bg-soft px-3.5 py-2.5 text-sm outline-none"/></label>
        <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-[#5c5661]">AI summary</span><textarea value={summary} onChange={e=>setSummary(e.target.value)} rows={3} className="w-full resize-none rounded-xl border border-line bg-soft px-3.5 py-2.5 text-sm leading-6 outline-none"/></label>
        <label className="sm:col-span-2"><span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#5c5661]"><FileText size={13}/>Transcript</span><textarea value={transcript} onChange={e=>setTranscript(e.target.value)} rows={10} placeholder={'Example:\n[0:08] Maya: Thanks everyone...\n[0:25] Arjun: I agree...\n\nSpeaker names and timestamps are parsed when present.'} className="w-full resize-none rounded-xl border border-[#d9d2e3] bg-[#fcfbfd] px-3.5 py-3 font-mono text-xs leading-6 outline-none focus:border-[#bba9ed]"/></label>
        <div className="sm:col-span-2 rounded-xl bg-[#f8f5ff] px-3.5 py-3 text-xs leading-5 text-[#6e6290]"><Upload size={13} className="mr-1 inline"/>{parsed.length} transcript lines parsed. Timestamp format is optional; plain lines will be spaced every 12 seconds.</div>
        {error && <div className="sm:col-span-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">{error}</div>}
      </div>
      <div className="flex justify-end gap-2 border-t border-line bg-[#fcfbfd] px-6 py-4"><button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-soft">Cancel</button><button disabled={busy} onClick={submit} className="rounded-xl bg-[#7c4dff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6e3ff0] disabled:cursor-not-allowed disabled:opacity-60">{busy ? "Creating…" : "Create meeting"}</button></div>
    </div>
  </div>;
}
