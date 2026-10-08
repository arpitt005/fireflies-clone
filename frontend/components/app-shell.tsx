"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, ChevronDown, FileText, Folder, Headphones, Home, Plus, Search, Settings, Sparkles, Users } from "lucide-react";

const nav = [
  { href: "/meetings", label: "Meetings", icon: Home },
  { href: "/meetings", label: "My Meetings", icon: FileText },
];

export function AppShell({ children, onNewMeeting }: { children: React.ReactNode; onNewMeeting?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[#fbfafc] text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-[238px] border-r border-line bg-white md:flex md:flex-col">
        <div className="flex h-[70px] items-center gap-3 border-b border-line px-6">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#7c4dff] text-white shadow-soft">
            <Sparkles size={18} />
          </div>
          <div className="text-[18px] font-semibold tracking-[-0.02em]">fireflies</div>
        </div>

        <div className="px-4 pt-5">
          <button onClick={onNewMeeting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#26222b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black">
            <Plus size={17} />
            New meeting
          </button>
        </div>

        <nav className="px-3 pt-5">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Workspace</div>
          {nav.map(({ href, label, icon: Icon }, index) => {
            const active = pathname === href || (href !== "/meetings" && pathname.startsWith(href));
            return <Link key={`${label}-${index}`} href={href} className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active ? "bg-[#f3efff] text-[#5d36c6]" : "text-[#625d68] hover:bg-soft"}`}><Icon size={18} />{label}</Link>;
          })}
          {[
            { Icon: Users, label: "People" }, { Icon: Folder, label: "Channels" }, { Icon: CalendarDays, label: "Calendar" }, { Icon: Headphones, label: "Soundbites" }
          ].map(({ Icon, label }) => <button key={label} className="mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#625d68] hover:bg-soft"><Icon size={18} />{label}</button>)}
        </nav>

        <div className="mt-auto border-t border-line p-3">
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#625d68] hover:bg-soft"><Settings size={18} />Settings</button>
          <div className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#f1edf5] text-xs font-bold text-[#635e68]">AK</div>
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">Arpit Kumar</div><div className="truncate text-xs text-muted">My workspace</div></div>
            <ChevronDown size={16} className="text-muted" />
          </div>
        </div>
      </aside>

      <main className="md:ml-[238px]">{children}</main>
    </div>
  );
}

export function TopSearch({ value, onChange, onBell }: { value: string; onChange: (v: string) => void; onBell?: () => void }) {
  return <div className="flex items-center gap-3">
    <div className="relative flex-1">
      <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder="Search meetings or people" className="w-full rounded-xl border border-line bg-soft py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#c8baf6] focus:ring-2 focus:ring-[#7c4dff]/10" />
    </div>
    <button onClick={onBell} className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-white text-muted hover:bg-soft"><Bell size={17} /></button>
  </div>;
}
