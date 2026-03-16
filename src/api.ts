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
 
  return (await res.json()) as T;
}

export async function fetchTodayNeeds(
  config: PrayerConfig,
): Promise<PrayerNeed[]> {
  const raw = await callApi<any[]>(config, '/', { method: 'GET' });
  return raw.map((item) => ({
    id: String(item.id ?? ''),
    profile: {
      id: String(item.profile.id ?? ''),
      name: String(item.profile.name ?? 'Unknown'),
    },
    title: String(item.title ?? 'Unknown'),
    description: String(item.description ?? 'Unknown'),
    creation_date: String(item.creation_date ?? 'Unknown'),
    user_id: String(item.user_id ?? 'Unknown'),
    answer: String(item.answer ?? 'Unknown'),
    priority: Number(item.priority ?? 0),
    user_has_prayed: Boolean(item.user_has_prayed ?? false),
    prayedCount: typeof item.prayed_count === 'number' ? item.prayed_count : 0,
  })).sort((a, b) => a.priority - b.priority);
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

