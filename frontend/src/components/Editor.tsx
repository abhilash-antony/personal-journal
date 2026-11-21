"use client";
import { useState, useEffect } from "react";

export type Entry = {
  id: string;
  title: string;
  date: string;
  mood: string | null;
  tags: string[];
  body?: string;
  preview: string;
  created_at: string;
  updated_at: string;
};

const MOODS = ["😊 Happy", "😔 Sad", "😤 Angry", "😰 Anxious", "😌 Calm", "💪 Motivated", "😴 Tired", "🤔 Reflective", "❤️ Grateful", "😎 Confident", "😢 Overwhelmed", "✨ Inspired"];

export default function Editor({ entry, onSave, onCancel, moods }: { entry?: Entry; onSave: (e: any) => void; onCancel: () => void; moods: string[] }) {
  const [title, setTitle] = useState(entry?.title || "");
  const dateStr = entry?.date ?? "";
  const [date, setDate] = useState(dateStr ? new Date(dateStr).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
  const [body, setBody] = useState(entry?.body || "");
  const [mood, setMood] = useState<string>(entry?.mood || "");
  const [tagsInput, setTagsInput] = useState(entry?.tags.join(", ") || "");
  const [saving, setSaving] = useState(false);
  const isNew = !entry?.id;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const payload = { title, body, date: new Date(date).toISOString(), mood: mood || null, tags };
    try {
      if (isNew) {
        const res = await fetch("/api/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to save");
        const data = await res.json();
        onSave(data);
      } else {
        const res = await fetch(`/api/entries/${entry.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update");
        onSave(await res.json());
      }
    } catch (err: any) {
      alert(err.message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Entry title..."
          className="w-full text-2xl font-bold bg-transparent border-b-2 border-border focus:border-accent focus:outline-none pb-2 text-ink placeholder:text-muted"
          required
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-xs text-muted mb-1">Date & Time</label>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-transparent text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Mood</label>
          <select
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-transparent text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Select mood...</option>
            {moods.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Tags</label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="work, personal, ideas..."
            className="px-3 py-1.5 rounded-lg border border-border bg-transparent text-ink text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Start writing your thoughts... (Markdown supported)"
          className="w-full h-96 p-4 rounded-xl border border-border bg-transparent text-ink placeholder:text-muted resize-y focus:outline-none focus:ring-2 focus:ring-accent leading-relaxed"
          required
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-accent text-white font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {saving ? "Saving..." : isNew ? "Save Entry" : "Update Entry"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 rounded-lg border border-border text-muted hover:text-ink transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
