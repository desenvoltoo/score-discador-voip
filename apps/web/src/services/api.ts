const API = import.meta.env.VITE_API_URL || '/api';

export const token = () => localStorage.getItem('token');

async function readBody(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (contentType.includes('application/json')) {
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      throw new Error('A API respondeu JSON inválido. Verifique os logs do backend.');
    }
  }

  const cleaned = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned || text;
}

export async function api(path: string, init: RequestInit = {}) {
  const r = await fetch(API + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...(init.headers || {}),
    },
  });

  const body = await readBody(r);

  if (!r.ok) {
    const message = typeof body === 'object' && body?.message
      ? body.message
      : typeof body === 'string' && body
        ? `A rota ${API + path} não respondeu JSON da API. Resposta: ${body.slice(0, 180)}`
        : 'Erro na API';
    throw new Error(message);
  }

  if (typeof body === 'string' && body.trim().startsWith('<!DOCTYPE')) {
    throw new Error(`A rota ${API + path} retornou HTML em vez de JSON. Confira o proxy /api no EasyPanel.`);
  }

  return body;
}
