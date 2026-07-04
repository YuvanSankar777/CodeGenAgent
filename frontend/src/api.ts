// Typed client for the CodeGenAgent backend API.

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

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* ignore parse errors */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export async function generateCode(
  req: GenerateRequest
): Promise<GenerateResponse> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return handle<GenerateResponse>(res);
}

export async function fetchHistory(limit = 20): Promise<HistoryItem[]> {
  const res = await fetch(`/api/history?limit=${limit}`);
  return handle<HistoryItem[]>(res);
}

export async function deleteHistory(id: number): Promise<void> {
  await fetch(`/api/history/${id}`, { method: "DELETE" });
}

export async function fetchHealth(): Promise<Health> {
  const res = await fetch("/api/health");
  return handle<Health>(res);
}
