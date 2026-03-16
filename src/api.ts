import type { PrayerConfig, PrayerNeed } from './types';
import { appendEventLog, toBasicAuth } from './utils';

const BASE_URL =
  'https://rmbhvsktnsrrzwiynajq.supabase.co/functions/v1/todays-needs';

async function callApi<T>(
  config: PrayerConfig,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers: HeadersInit = {
    ...(options.headers ?? {}),
    Authorization: toBasicAuth(config.apiEmail, config.apiPassword),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  appendEventLog(`result: ${JSON.stringify(await res.json())}`);
  return (await res.json()) as T;
}

export async function fetchTodayNeeds(
  config: PrayerConfig,
): Promise<PrayerNeed[]> {
  const raw = await callApi<any[]>(config, '/', { method: 'GET' });
  return raw.map((item) => ({
    id: String(item.id ?? item.prayer_id ?? ''),
    owner: String(item.owner ?? item.author ?? 'Unknown'),
    text: String(item.text ?? item.body ?? ''),
    prayedCount: typeof item.prayed_count === 'number' ? item.prayed_count : 0,
  }));
}

export async function markNeedPrayed(
  config: PrayerConfig,
  need: PrayerNeed,
): Promise<void> {
  await callApi(config, '/prayed', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prayer_id: need.id }),
  });
  appendEventLog(`Marked need as prayed: ${need.id}`);
}

