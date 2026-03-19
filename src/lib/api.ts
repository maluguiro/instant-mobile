type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
};

const rawBaseUrl = process.env.EXPO_PUBLIC_API_URL || '';
const baseUrl = rawBaseUrl.replace(/\/$/, '');

function buildUrl(path: string) {
  if (!baseUrl) {
    throw new Error('API_URL no configurada. Usá EXPO_PUBLIC_API_URL en el entorno.');
  }
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions) {
  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error('No pudimos conectar con el servidor. Revisá tu conexión.');
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const message =
      payload?.error || payload?.message || 'No pudimos completar la solicitud.';
    throw new Error(message);
  }

  return payload as T;
}
