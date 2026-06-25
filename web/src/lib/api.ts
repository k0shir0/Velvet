import type {
  CliLine,
  LoginResponse,
  ModuleState,
  ModulesResponse,
  StatusResponse,
} from "@velvet/shared";

const TOKEN_KEY = "velvet_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401) {
    clearToken();
    window.location.reload();
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function login(password: string): Promise<string> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error("Invalid password");
  const data = (await res.json()) as LoginResponse;
  setToken(data.token);
  return data.token;
}

export const getModules = (): Promise<ModulesResponse> =>
  request<ModulesResponse>("/api/modules");

export const applyModules = (modules: ModuleState[]): Promise<ModulesResponse> =>
  request<ModulesResponse>("/api/modules/apply", {
    method: "POST",
    body: JSON.stringify({ modules }),
  });

export const runConsole = (command: string): Promise<{ lines: CliLine[] }> =>
  request<{ lines: CliLine[] }>("/api/console/run", {
    method: "POST",
    body: JSON.stringify({ command }),
  });

export const getStatus = (): Promise<StatusResponse> =>
  request<StatusResponse>("/api/status");
