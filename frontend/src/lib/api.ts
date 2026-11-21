const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function handle(res: Response) {
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error" }));
    throw new Error(err.detail || "Request failed");
  }
  return res;
}

export async function apiGet(path: string) {
  const res = await fetch(`${API}${path}`, { headers: authHeaders() });
  return handle(res).then(r => r.json());
}

export async function apiPost(path: string, body: any) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  return handle(res).then(r => r.json());
}

export async function apiPut(path: string, body: any) {
  const res = await fetch(`${API}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  return handle(res).then(r => r.json());
}

export async function apiDelete(path: string) {
  const res = await fetch(`${API}${path}`, { method: "DELETE", headers: authHeaders() });
  return handle(res).then(r => r.json());
}
