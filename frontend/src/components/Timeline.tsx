"use client";
import { useState, useEffect } from "react";
import type { Entry } from "./Editor";

const MOOD_EMOJIS: Record<string, string> = {
  "😊 Happy": "😊", "😔 Sad": "😔", "😤 Angry": "😤", "😰 Anxious": "😰",
  "😌 Calm": "😌", "💪 Motivated": "💪", "😴 Tired": "😴", "🤔 Reflective": "🤔",
  "❤️ Grateful": "❤️", "😎 Confident": "😎", "😢 Overwhelmed": "😢", "✨ Inspired": "✨",
};

export default function Timeline({ entries, onEdit, onDelete }: { entries: Entry[]; onEdit: (e: Entry) => void; onDelete: (id: string) => void }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-20 text-muted">
        <p className="text-6xl mb-4">📔</p>
        <p className="text-lg">No entries yet. Start writing your first journal entry!</p>
      </div>
    );
  }

  // Group by date
  const groups: Record<string, Entry[]> = {};
  entries.forEach((e) => {
    const d = new Date(e.date);
    const key = d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });

  return (
    <div className="space-y-8">
      {Object.entries(groups).map(([date, dayEntries]) => (
        <div key={date}>
          <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">{date}</h2>
          <div className="space-y-3">
            {dayEntries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => onEdit(entry)}
                className="group p-5 rounded-xl border border-border bg-paper hover:border-muted transition cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-ink text-lg leading-tight flex-1">
                    {entry.title || "Untitled"}
                  </h3>
                  {entry.mood && (
                    <span className="text-2xl ml-3 shrink-0" title={entry.mood}>
                      {MOOD_EMOJIS[entry.mood] || entry.mood}
                    </span>
                  )}
                </div>
                <p className="text-muted text-sm leading-relaxed line-clamp-2">{entry.preview || "No content"}</p>
                <div className="flex items-center gap-2 mt-3">
                  {entry.tags.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-border text-muted">
                      {t}
                    </span>
                  ))}
                  <span className="text-xs text-muted ml-auto">
                    {entry.created_at ? new Date(entry.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : ""}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
                    className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition ml-2"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
