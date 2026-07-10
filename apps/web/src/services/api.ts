const API = import.meta.env.VITE_API_URL || '/api';

export const token = () => localStorage.getItem('token');

export async function api(path: string, init: RequestInit = {}) {
  const r = await fetch(API + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...(init.headers || {}),
    },
  });

  if (!r.ok) throw new Error((await r.json()).message || 'Erro');
  return r.headers.get('content-type')?.includes('json') ? r.json() : r.text();
}
