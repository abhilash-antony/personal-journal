"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Header({
  title, showNew, onNew, onBack, isDark, toggleTheme,
}: {
  title: string;
  showNew?: boolean;
  onNew?: () => void;
  onBack?: () => void;
  isDark: boolean;
  toggleTheme: () => void;
}) {
  const [user, setUser] = useState("");
  const router = useRouter();

  useEffect(() => {
    try {
      const t = localStorage.getItem("token");
      if (t) {
        const payload = JSON.parse(atob(t.split(".")[1])) as { sub: string };
        setUser(payload.sub);
      }
    } catch {}
  }, []);

  function logout() {
    localStorage.removeItem("token");
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-paper/80 backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack ? (
            <button onClick={onBack} className="text-muted hover:text-ink transition text-xl">←</button>
          ) : (
            <span className="text-2xl">📔</span>
          )}
          <h1 className="text-xl font-bold text-ink">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {showNew && onNew && (
            <button
              onClick={onNew}
              className="px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition"
            >
              + New Entry
            </button>
          )}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-border hover:bg-border transition text-sm"
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? "☀️" : "🌙"}
          </button>
          <button
            onClick={logout}
            className="text-xs text-muted hover:text-ink px-2 py-1 rounded hover:bg-border transition"
          >
            Logout ({user})
          </button>
        </div>
      </div>
    </header>
  );
}
