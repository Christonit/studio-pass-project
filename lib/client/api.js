// Fetch wrapper for the app's own API routes. The session cookie is sent automatically.
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Session gone (e.g. data was reset): go back to the sign-in page.
    if (res.status === 401 && !path.startsWith('/auth/') && typeof window !== 'undefined') window.location.href = '/';
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}
