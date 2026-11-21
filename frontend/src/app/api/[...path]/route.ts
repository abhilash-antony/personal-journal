import { NextResponse } from "next/server";

export const runtime = "edge";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function proxy(req: Request) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, "") || "/";
  const target = `${API}/api${path}${url.search}`;

  const headers: Record<string, string> = {};
  const auth = req.headers.get("authorization");
  if (auth) headers["authorization"] = auth;

  const method = req.method;
  let body: BodyInit | undefined;
  if (method !== "GET" && method !== "HEAD") {
    body = await req.text();
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(target, { method, headers, body, redirect: "manual" });
  const text = await res.text();

  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE };
