const rawApiUrl = import.meta.env.VITE_API_URL || '/api';
const API = rawApiUrl.includes('localhost') || rawApiUrl.includes('127.0.0.1') ? '/api' : rawApiUrl;

export const token = () => localStorage.getItem('token');

function isAuthError(message: string, status: number) {
  const normalized = message.toLowerCase();
  return status === 401 || normalized.includes('token inválido') || normalized.includes('token invalido') || normalized.includes('token ausente') || normalized.includes('jwt');
}

function resetSession(message = 'Sua sessão expirou. Faça login novamente.') {
  localStorage.removeItem('token');
  localStorage.setItem('auth:expired', message);
  if (!location.pathname.includes('login')) {
    setTimeout(() => location.reload(), 300);
  }
}

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
  let r: Response;

  try {
    r = await fetch(API + path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
        ...(init.headers || {}),
      },
    });
  } catch {
    throw new Error(`Não foi possível conectar na API em ${API + path}. Confira se o front está usando /api e se o backend está publicado no EasyPanel.`);
  }

  const body = await readBody(r);

  if (!r.ok) {
    const message = typeof body === 'object' && body?.message
      ? body.message
      : typeof body === 'string' && body
        ? `A rota ${API + path} não respondeu JSON da API. Resposta: ${body.slice(0, 180)}`
        : 'Erro na API';

    if (isAuthError(message, r.status)) {
      resetSession(message);
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    throw new Error(message);
  }

  if (typeof body === 'string' && body.trim().startsWith('<!DOCTYPE')) {
    throw new Error(`A rota ${API + path} retornou HTML em vez de JSON. Confira o proxy /api no EasyPanel.`);
  }

  return body;
}
