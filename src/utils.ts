const STATUS_ID = 'status';
const LOG_ID = 'event-log';

export function setStatus(message: string): void {
  // eslint-disable-next-line no-console
  console.log('[even-prayer:status]', message);
  const el = document.getElementById(STATUS_ID);
  if (el) {
    el.textContent = message;
  }
}

export function appendEventLog(message: string): void {
  // eslint-disable-next-line no-console
  console.log('[even-prayer:log]', message);
  const el = document.getElementById(LOG_ID);
  if (!el) return;
  const now = new Date();
  const ts = now.toISOString().split('T')[1]?.replace('Z', '') ?? '';
  el.textContent = `[${ts}] ${message}\n` + el.textContent;
}

export function loadConfigFromLocalStorage(): {
  apiEmail: string;
  apiPassword: string;
} {
  return {
    apiEmail: localStorage.getItem('even-prayer:api-email') ?? '',
    apiPassword: localStorage.getItem('even-prayer:api-password') ?? '',
  };
}

export function saveConfigToLocalStorage(config: {
  apiEmail: string;
  apiPassword: string;
}): void {
  localStorage.setItem('even-prayer:api-email', config.apiEmail.trim());
  localStorage.setItem('even-prayer:api-password', config.apiPassword.trim());
}

export function toBasicAuth(email: string, password: string): string {
  const token = btoa(`${email}:${password}`);
  return `Basic ${token}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

