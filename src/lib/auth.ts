// Client-side auth helpers for dashboard access

const SESSION_KEY = 'espionage_session';

export interface SessionData {
  participantId: string;
  name: string;
  email: string;
  isShortlisted: boolean;
  token: string;
}

export function getSession(): SessionData | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setSession(data: SessionData): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function isLoggedIn(): boolean {
  return getSession() !== null;
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}
