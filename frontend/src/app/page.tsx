"use client";
import { useEffect, useState, useCallback } from "react";
import Header from "@/components/Header";
import Timeline from "@/components/Timeline";
import CalendarView from "@/components/CalendarView";
import Editor, { Entry } from "@/components/Editor";
import SearchBar from "@/components/SearchBar";

type View = "timeline" | "calendar";

const MOODS = ["😊 Happy", "😔 Sad", "😤 Angry", "😰 Anxious", "😌 Calm", "💪 Motivated", "😴 Tired", "🤔 Reflective", "❤️ Grateful", "😎 Confident", "😢 Overwhelmed", "✨ Inspired"];

export default function HomePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [view, setView] = useState<View>("timeline");
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  // Theme
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const dark = stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  }, []);

  const fetchEntries = useCallback(async () => {
    const params = new URLSearchParams();
    if (searchQ) params.set("q", searchQ);
    if (activeTag) params.set("tag", activeTag);
    if (activeMood) params.set("mood", activeMood);
    const token = localStorage.getItem("token") || "";
    const data = await fetch(`/api/entries?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } as Record<string, string> }).then(r => r.json());
    setEntries(data);
  }, [searchQ, activeTag, activeMood]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  function handleSave(entry: any) {
    fetchEntries();
    setEditingEntry(null);
    setIsCreating(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this entry permanently?")) return;
    const token = localStorage.getItem("token") || "";
    await fetch(`/api/entries/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } as Record<string, string> });
    fetchEntries();
  }

  const allTags = Array.from(new Set(entries.flatMap(e => e.tags)));

  async function fetchEntryBody(id: string): Promise<string> {
    try {
      const token = localStorage.getItem("token") || "";
      const data: { body: string } = await fetch(`/api/entries/${id}/body`, { headers: { Authorization: `Bearer ${token}` } as Record<string, string> }).then(r => r.json());
      return data.body || "";
    } catch { return ""; }
  }

  async function handleEdit(entry: Entry) {
    if (!entry.id) {
      setEditingEntry({ ...entry, body: "" });
      return;
    }
    const body = await fetchEntryBody(entry.id);
    setEditingEntry({ ...entry, body });
  }

  async function handleCreate() {
    setIsCreating(true);
  }

  if (isCreating) {
    return (
      <div className="min-h-screen">
        <Header title="New Entry" onBack={() => setIsCreating(false)} isDark={isDark} toggleTheme={toggleTheme} />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <Editor onSave={handleSave} onCancel={() => setIsCreating(false)} moods={MOODS} />
        </main>
      </div>
    );
  }

  if (editingEntry) {
    return (
      <div className="min-h-screen">
        <Header title="Edit Entry" onBack={() => setEditingEntry(null)} isDark={isDark} toggleTheme={toggleTheme} />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <Editor entry={editingEntry} onSave={handleSave} onCancel={() => setEditingEntry(null)} moods={MOODS} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        title="My Journal"
        showNew
        onNew={() => setIsCreating(true)}
        isDark={isDark}
        toggleTheme={toggleTheme}
      />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <SearchBar
          value={searchQ} onChange={setSearchQ}
          activeTag={activeTag} onTagChange={setActiveTag}
          activeMood={activeMood} onMoodChange={setActiveMood}
          tags={allTags}
        />

        {/* View toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setView("timeline")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              view === "timeline" ? "bg-accent text-white" : "border border-border text-muted hover:text-ink"
            }`}
          >
            Timeline
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              view === "calendar" ? "bg-accent text-white" : "border border-border text-muted hover:text-ink"
            }`}
          >
            Calendar
          </button>
        </div>

        {view === "timeline" && (
          <Timeline entries={entries} onEdit={handleEdit} onDelete={handleDelete} />
        )}
        {view === "calendar" && (
          <CalendarView entries={entries} onEdit={handleEdit} />
        )}
      </main>
    </div>
  );
}
