import { io } from 'socket.io-client';

// Tom sträng = same origin. I dev proxar Vite /api, /uploads och /socket.io
// vidare till backend; i drift gör Nginx samma sak. Enda fallet som behöver en
// absolut adress är Capacitor-bygget, som laddas från file:// och därför inte
// har någon origin att vara "same" med -- det sätter VITE_API_URL.
export const API_URL = import.meta.env.VITE_API_URL || '';

const TOKEN_KEY = 'player_token';
const ADMIN_TOKEN_KEY = 'admin_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const getAdminToken = () => localStorage.getItem(ADMIN_TOKEN_KEY);
export const setAdminToken = (token: string) => localStorage.setItem(ADMIN_TOKEN_KEY, token);
export const clearAdminToken = () => localStorage.removeItem(ADMIN_TOKEN_KEY);

type ApiInit = RequestInit & { admin?: boolean };

export async function apiFetch(path: string, init: ApiInit = {}): Promise<Response> {
  const { admin, ...rest } = init;
  const headers = new Headers(rest.headers);

  const token = admin ? getAdminToken() : getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  // FormData sätter sin egen Content-Type med multipart-boundary.
  if (rest.body && !(rest.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`${API_URL}${path}`, { ...rest, headers });
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiJson<T>(path: string, init: ApiInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error || `Serverfel (${res.status})`, res.status);
  }
  return data as T;
}

// En delad anslutning för hela appen. Tidigare öppnade Map, Feed och Lobby var
// sin egen, vilket gav tre parallella anslutningar per spelare.
export const socket = API_URL ? io(API_URL) : io();
