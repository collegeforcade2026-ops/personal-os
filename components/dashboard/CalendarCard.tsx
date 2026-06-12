import { Panel } from "./Panel";
import { getCalendarEvents } from "@/lib/data/getCalendarEvents";

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function formatTime(date: Date, allDay: boolean) {
  if (allDay) return "All day";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatTimeRange(start: Date, end: Date, allDay: boolean) {
  if (allDay) return "All day";
  const s = formatTime(start, false);
  const e = formatTime(end, false);
  return `${s}–${e}`;
}

export async function CalendarCard() {
  const events = await getCalendarEvents(7);
  const today = new Date();

  // Build 7-day strip starting from today
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  // Today's + tomorrow's events (show up to 5)
  const upcoming = events.slice(0, 5);

  const monthLabel = today.toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase();

  return (
    <Panel
      label="CALENDAR"
      labelNum="04"
      action={<span className="text-[10px] font-mono text-[var(--ink-2)]">{monthLabel}</span>}
    >
      {/* Week strip */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {days.map((d, i) => {
          const isToday = i === 0;
          const hasEvent = events.some((e) => {
            const ed = new Date(e.start);
            return ed.getDate() === d.getDate() && ed.getMonth() === d.getMonth();
          });
          return (
            <div
              key={i}
              className={`flex flex-col items-center rounded-lg py-1.5 ${
                isToday ? "bg-[var(--ink-1)]/10 border border-[var(--ink-1)]/20" : ""
              }`}
            >
              <span className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest">
                {DAY_NAMES[d.getDay()]}
              </span>
              <span
                className={`text-sm font-mono tabular mt-0.5 ${
                  isToday ? "text-[var(--ink-0)]" : "text-[var(--ink-2)]"
                }`}
              >
                {String(d.getDate()).padStart(2, "0")}
              </span>
              {hasEvent && (
                <span className="w-1 h-1 rounded-full bg-[var(--accent)] mt-0.5" />
              )}
            </div>
          );
        })}
      </div>

      {/* Events */}
      <div className="flex flex-col gap-2">
        {upcoming.length === 0 ? (
          <p className="text-xs text-[var(--ink-3)] italic">No upcoming events.</p>
        ) : (
          upcoming.map((e) => {
            const isToday =
              e.start.getDate() === today.getDate() &&
              e.start.getMonth() === today.getMonth();
            return (
              <div key={e.id} className="flex items-start gap-3">
                <span className="text-[10px] font-mono text-[var(--ink-3)] w-20 shrink-0 tabular pt-0.5">
                  {formatTimeRange(e.start, e.end, e.allDay)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--ink-1)] truncate">{e.title}</p>
                  {e.location && (
                    <p className="text-[10px] text-[var(--ink-3)] truncate">{e.location}</p>
                  )}
                </div>
                {!isToday && (
                  <span className="text-[9px] font-mono border rounded px-1.5 py-0.5 shrink-0 text-[var(--ink-3)] border-[var(--border)]">
                    {e.start.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}
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
