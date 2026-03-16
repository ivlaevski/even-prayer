export type ViewName = 'main-menu' | 'needs-detail' | 'error';

export interface PrayerNeed {
  id: string;
  owner: string;
  text: string;
  prayedCount: number;
}

export interface PrayerConfig {
  apiEmail: string;
  apiPassword: string;
}

