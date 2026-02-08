const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

async function request(path: string, options: RequestInit = {}, retry = true) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    },
    ...options
  });

  if (response.status === 401 && retry && !path.includes('/auth/refresh')) {
    const refreshed = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    if (refreshed.ok) {
      return request(path, options, false);
    }
  }

  return response;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await request(path, { method: 'GET' });
  if (!response.ok) {
    throw new Error((await response.json()).error ?? 'Request failed');
  }
  return response.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await request(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) {
    throw new Error((await response.json()).error ?? 'Request failed');
  }
  return response.json();
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const response = await request(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) {
    throw new Error((await response.json()).error ?? 'Request failed');
  }
  return response.json();
}
