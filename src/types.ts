export type ViewName = 'main-menu' | 'needs-detail' | 'error';

export interface PrayerNeed {
  id: string;
  title: string;
  creation_date: string;
  description: string;
  user_id: string;
  answer: string;
  profile: {
    id: string;
    name: string;
  };
  priority: number;
  prayedCount: number;
  user_has_prayed: boolean;  
}

export interface PrayerConfig {
  apiEmail: string;
  apiPassword: string;
}

