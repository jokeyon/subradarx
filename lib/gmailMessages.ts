const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

function headerMap(payload: { headers?: { name?: string; value?: string }[] }): Record<string, string> {
  const out: Record<string, string> = {};
  for (const h of payload.headers ?? []) {
    if (h.name && h.value) out[h.name.toLowerCase()] = h.value;
  }
  return out;
}

export async function gmailListRecentMessageIds(accessToken: string, maxResults = 35): Promise<string[]> {
  const q = encodeURIComponent('newer_than:90d');
  const url = `${GMAIL_BASE}/messages?maxResults=${maxResults}&q=${q}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail list failed: ${res.status} ${err.slice(0, 200)}`);
  }
  const json = (await res.json()) as { messages?: { id: string }[] };
  return (json.messages ?? []).map((m) => m.id);
}

export type GmailSnippet = {
  id: string;
  subject: string;
  snippet: string;
  from?: string;
};

export async function gmailGetMessageSnippet(accessToken: string, id: string): Promise<GmailSnippet> {
  const url = `${GMAIL_BASE}/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail message ${id}: ${res.status} ${err.slice(0, 120)}`);
  }
  const json = (await res.json()) as {
    snippet?: string;
    payload?: { headers?: { name?: string; value?: string }[] };
  };
  const h = headerMap(json.payload ?? {});
  return {
    id,
    subject: h.subject ?? '(no subject)',
    snippet: json.snippet ?? '',
    from: h.from,
  };
}
