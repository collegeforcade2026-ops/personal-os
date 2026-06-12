import { Panel } from "./Panel";
import { getCalendarEvents } from "@/lib/data/getCalendarEvents";

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function formatTimeRange(start: Date, end: Date, allDay: boolean) {
  if (allDay) return "ALL DAY";
  const fmt = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${fmt(start)} — ${fmt(end)}`;
}

export async function CalendarCard() {
  const events = await getCalendarEvents(7);
  const today = new Date();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  const upcoming = events.slice(0, 5);
  const monthLabel = today.toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase();

  return (
    <Panel label="CALENDAR" labelNum="04" action={
      <span className="text-[10px] font-mono text-[var(--ink-2)]">{monthLabel}</span>
    }>
      {/* Week strip */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {days.map((d, i) => {
          const isToday = i === 0;
          const hasEvent = events.some((e) =>
            e.start.getDate() === d.getDate() && e.start.getMonth() === d.getMonth()
          );
          return (
            <div
              key={i}
              className={`flex flex-col items-center rounded py-1.5 ${
                isToday
                  ? "bg-[var(--ink-0)]/8 border border-[var(--ink-2)]/20"
                  : ""
              }`}
            >
              <span className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest">
                {DAY_NAMES[d.getDay()]}
              </span>
              <span className={`text-sm font-mono tabular mt-0.5 ${isToday ? "text-[var(--ink-0)]" : "text-[var(--ink-2)]"}`}>
                {String(d.getDate()).padStart(2, "0")}
              </span>
              {hasEvent && (
                <span className="w-1 h-1 rounded-full bg-[var(--accent)] mt-0.5" />
              )}
            </div>
          );
        })}
      </div>

      {/* Event list */}
      <div className="flex flex-col gap-3">
        {upcoming.length === 0 ? (
          <p className="text-xs text-[var(--ink-3)] italic">No upcoming events.</p>
        ) : (
          upcoming.map((e) => {
            const isToday =
              e.start.getDate() === today.getDate() &&
              e.start.getMonth() === today.getMonth();
            const dayTag = !isToday
              ? e.start.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()
              : null;
            return (
              <div key={e.id} className="flex items-start gap-3">
                <div className="shrink-0 w-20">
                  <p className="text-[10px] font-mono text-[var(--ink-3)] tabular leading-snug">
                    {formatTimeRange(e.start, e.end, e.allDay)}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--ink-1)] truncate">{e.title}</p>
                  {e.location && (
                    <p className="text-[10px] text-[var(--ink-3)] truncate mt-0.5">{e.location}</p>
                  )}
                </div>
                {dayTag && (
                  <span className="text-[9px] font-mono border border-[var(--border)] rounded px-1.5 py-0.5 shrink-0 text-[var(--ink-3)]">
                    {dayTag}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </Panel>
  );
}
