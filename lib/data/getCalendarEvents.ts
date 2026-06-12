export interface CalEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location?: string;
}

function parseICalDate(val: string): Date {
  // DATE: 20240115 or DATETIME: 20240115T090000Z or 20240115T090000
  const clean = val.replace(/[TZ]/g, "");
  const y = +clean.slice(0, 4);
  const mo = +clean.slice(4, 6) - 1;
  const d = +clean.slice(6, 8);
  const h = +clean.slice(8, 10) || 0;
  const mi = +clean.slice(10, 12) || 0;
  const s = +clean.slice(12, 14) || 0;

  if (val.endsWith("Z")) return new Date(Date.UTC(y, mo, d, h, mi, s));
  return new Date(y, mo, d, h, mi, s);
}

export async function getCalendarEvents(daysAhead = 7): Promise<CalEvent[]> {
  const url = process.env.GOOGLE_CALENDAR_ICAL_URL;
  if (!url) return [];

  let raw: string;
  try {
    const res = await fetch(url, { next: { revalidate: 300 } }); // cache 5 min
    if (!res.ok) return [];
    raw = await res.text();
  } catch {
    return [];
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() + daysAhead * 86400 * 1000);

  const events: CalEvent[] = [];
  const blocks = raw.split("BEGIN:VEVENT").slice(1);

  for (const block of blocks) {
    const get = (key: string) => {
      const match = block.match(new RegExp(`${key}(?:;[^:]*)?:(.+)`));
      return match?.[1]?.trim().replace(/\\n/g, "\n").replace(/\\,/g, ",") ?? "";
    };

    const title = get("SUMMARY") || "(No title)";
    const location = get("LOCATION") || undefined;
    const uid = get("UID") || Math.random().toString();

    const dtStartRaw = get("DTSTART");
    const dtEndRaw = get("DTEND") || get("DTSTART");
    const allDay = !dtStartRaw.includes("T");

    let start: Date, end: Date;
    try {
      start = parseICalDate(dtStartRaw);
      end = parseICalDate(dtEndRaw);
    } catch {
      continue;
    }

    // Only include events within range
    if (end < now || start > cutoff) continue;

    events.push({ id: uid, title, start, end, allDay, location });
  }

  events.sort((a, b) => a.start.getTime() - b.start.getTime());
  return events;
}
