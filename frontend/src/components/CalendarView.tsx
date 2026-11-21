"use client";
import { useState, useMemo } from "react";
import type { Entry } from "./Editor";

export default function CalendarView({
  entries,
  onEdit,
}: {
  entries: Entry[];
  onEdit: (e: Entry) => Promise<void>;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const daysWithEntries = useMemo(() => {
    const map = new Map<string, Entry[]>();
    entries.forEach((e) => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [entries]);

  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];

  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function prev() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function next() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }
  function goToday() { const t = new Date(); setYear(t.getFullYear()); setMonth(t.getMonth()); }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} className="p-2 rounded-lg hover:bg-border transition text-ink">←</button>
        <h2 className="text-lg font-semibold text-ink">
          {new Date(year, month).toLocaleString("en-US", { month: "long", year: "numeric" })}
        </h2>
        <div className="flex gap-2">
          <button onClick={goToday} className="px-3 py-1 rounded-lg border border-border text-sm hover:bg-border transition">Today</button>
          <button onClick={next} className="p-2 rounded-lg hover:bg-border transition text-ink">→</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dayNames.map((d) => (
          <div key={d} className="text-center text-xs text-muted font-medium py-2">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} className="aspect-square" />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const key = `${year}-${month}-${day}`;
          const hasEntries = daysWithEntries.has(key);
          const entryCount = daysWithEntries.get(key)?.length || 0;
          return (
            <button
              key={day}
              onClick={() => {
                const list = daysWithEntries.get(key);
                if (list && list.length > 0) onEdit(list[0]);
                else onEdit({ id: "", title: "", date: dateStr, mood: null, tags: [], preview: "", created_at: "", updated_at: "" });
              }}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition relative ${
                hasEntries
                  ? "bg-accent/10 text-accent font-medium hover:bg-accent/20"
                  : "text-muted hover:bg-border"
              }`}
            >
              <span>{day}</span>
              {hasEntries && (
                <span className="text-xs mt-0.5">📝{entryCount > 1 ? `×${entryCount}` : ""}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
