"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords don't match"); return; }
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Registration failed");
      }
      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <div className="w-full max-w-sm p-8 rounded-2xl border border-border bg-paper shadow-sm">
        <h1 className="text-3xl font-bold mb-2 text-center text-ink">Create Account</h1>
        <p className="text-muted text-center text-sm mb-8">Start your journal</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</p>}
          <input
            type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-transparent text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            required minLength={3} maxLength={32} pattern="[a-zA-Z0-9_]+"
          />
          <input
            type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-transparent text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            required minLength={6}
          />
          <input
            type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-transparent text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            required
          />
          <button type="submit" className="w-full py-2.5 rounded-lg bg-accent text-white font-medium hover:opacity-90 transition">
            Create Account
          </button>
        </form>
        <p className="text-center text-sm text-muted mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-accent hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
