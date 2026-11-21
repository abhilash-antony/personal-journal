"use client";
import { useState, useEffect } from "react";

export default function SearchBar({
  value, onChange, activeTag, onTagChange, activeMood, onMoodChange, tags,
}: {
  value: string;
  onChange: (v: string) => void;
  activeTag: string | null;
  onTagChange: (t: string | null) => void;
  activeMood: string | null;
  onMoodChange: (m: string | null) => void;
  tags: string[];
}) {
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => onChange(value), 300);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="space-y-3 mb-4">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search entries..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-transparent text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <span className="absolute left-3 top-3 text-muted">🔍</span>
        {value && (
          <button onClick={() => onChange("")} className="absolute right-3 top-3 text-muted hover:text-ink">×</button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-3 py-1 rounded-lg border border-border text-sm text-muted hover:text-ink transition"
        >
          Filters {showFilters ? "▲" : "▼"}
        </button>
        {(activeTag || activeMood) && (
          <button onClick={() => { onTagChange(null); onMoodChange(null); }} className="text-xs text-red-400 hover:text-red-600">
            Clear filters
          </button>
        )}
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => onTagChange(activeTag === t ? null : t)}
            className={`px-3 py-1 rounded-full text-xs transition ${
              activeTag === t ? "bg-accent text-white" : "border border-border text-muted hover:text-ink"
            }`}
          >
            #{t}
          </button>
        ))}
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border">
          <span className="text-xs text-muted self-center mr-2">Mood:</span>
          {["😊 Happy", "😔 Sad", "😤 Angry", "😰 Anxious", "😌 Calm", "💪 Motivated", "😴 Tired", "🤔 Reflective", "❤️ Grateful", "✨ Inspired"].map((m) => {
            const emoji = m.split(" ")[0];
            return (
              <button
                key={m}
                onClick={() => onMoodChange(activeMood === m ? null : m)}
                className={`px-2 py-1 rounded-lg text-lg transition ${activeMood === m ? "bg-accent/20 ring-1 ring-accent" : "hover:bg-border"}`}
                title={m.split(" ").slice(1).join(" ")}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
