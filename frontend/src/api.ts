// Typed client for the CodeGenAgent backend API (with auth).

export interface GenerateRequest {
  requirement: string;
  language: string;
  include_tests: boolean;
}

export interface GenerateResponse {
  id: number | null;
  language: string;
  filename: string;
  code: string;
  explanation: string;
  dependencies: string[];
  model: string;
  persisted: boolean;
}

export interface HistoryItem {
  id: number;
  requirement: string;
  language: string;
  filename?: string;
  code: string;
  explanation?: string;
  dependencies: string[];
  model?: string;
  created_at?: string;
}

export interface Health {
  status: string;
  db_available: boolean;
  model: string;
}

export interface User {
  id: number;
  email: string;
  name?: string | null;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// --- Token storage ----------------------------------------------------------

const TOKEN_KEY = "cg_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* ignore parse errors */
    }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

// --- Auth -------------------------------------------------------------------

export async function signup(
  email: string,
  password: string,
  name?: string
): Promise<AuthResponse> {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  return handle<AuthResponse>(res);
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handle<AuthResponse>(res);
}

export async function fetchMe(): Promise<User> {
  const res = await fetch("/api/auth/me", { headers: authHeaders() });
  return handle<User>(res);
}

// --- Generation (authed) ----------------------------------------------------

export async function generateCode(
  req: GenerateRequest
): Promise<GenerateResponse> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(req),
  });
  return handle<GenerateResponse>(res);
}

export async function fetchHistory(limit = 20): Promise<HistoryItem[]> {
  const res = await fetch(`/api/history?limit=${limit}`, {
    headers: authHeaders(),
  });
  return handle<HistoryItem[]>(res);
}

export async function deleteHistory(id: number): Promise<void> {
  await fetch(`/api/history/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

export async function fetchHealth(): Promise<Health> {
  const res = await fetch("/api/health");
  return handle<Health>(res);
}
