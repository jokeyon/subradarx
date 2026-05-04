import Constants from 'expo-constants';

export function getApiBaseUrl(): string {
  const fromExtra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  return fromExtra?.apiUrl ?? 'http://localhost:8787';
}

// Cloud sync functions - DISABLED for local-only version
// export async function apiFetch<T>(
//   path: string,
//   init: RequestInit & { token?: string | null },
// ): Promise<T> {
//   const headers = new Headers(init.headers);
//   if (!headers.has('Content-Type') && init.body) {
//     headers.set('Content-Type', 'application/json');
//   }
//   if (init.token) {
//     headers.set('Authorization', `Bearer ${init.token}`);
//   }
//   const base = getApiBaseUrl().replace(/\/$/, '');
//   const res = await fetch(`${base}${path}`, { ...init, headers });
//   const text = await res.text();
//   const data = text ? (JSON.parse(text) as unknown) : null;
//   if (!res.ok) {
//     const err = data as { error?: string } | null;
//     throw new Error(err?.error ?? res.statusText ?? 'Request failed');
//   }
//   return data as T;
// }

// export async function authLogin(email: string, password: string): Promise<{ token: string }> {
//   return apiFetch<{ token: string }>('/v1/auth/login', {
//     method: 'POST',
//     body: JSON.stringify({ email, password }),
//   });
// }

// export async function authRegister(email: string, password: string): Promise<{ token: string }> {
//   return apiFetch<{ token: string }>('/v1/auth/register', {
//     method: 'POST',
//     body: JSON.stringify({ email, password }),
//   });
// }

// export async function syncRenewalsPush(token: string, renewals: Renewal[]): Promise<void> {
//   await apiFetch<{ ok: boolean }>('/v1/renewals/sync', {
//     method: 'PUT',
//     token,
//     body: JSON.stringify({ renewals }),
//   });
// }

// export async function syncRenewalsPull(token: string): Promise<Renewal[]> {
//   const data = await apiFetch<{ renewals: Renewal[] }>('/v1/renewals', {
//     method: 'GET',
//     token,
//   });
//   return data.renewals;
// }
