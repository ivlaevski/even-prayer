import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk';

import { EvenPrayerClient } from './even-client';
import {
  appendEventLog,
  loadConfigFromLocalStorage,
  saveConfigToLocalStorage,
  setStatus,
} from './utils';

function bootSettingsUi(): void {
  const config = loadConfigFromLocalStorage();

  const emailInput = document.getElementById('api-email') as HTMLInputElement | null;
  const passwordInput = document.getElementById('api-password') as HTMLInputElement | null;
  const saveBtn = document.getElementById('save-settings') as HTMLButtonElement | null;

  if (emailInput) emailInput.value = config.apiEmail;
  if (passwordInput) passwordInput.value = config.apiPassword;

  saveBtn?.addEventListener('click', () => {
    const next = {
      apiEmail: emailInput?.value ?? '',
      apiPassword: passwordInput?.value ?? '',
    };
    saveConfigToLocalStorage(next);
    appendEventLog('Settings saved.');
    setStatus('Settings saved. You can now open Today Needs from glasses.');
  });
}

async function main() {
  bootSettingsUi();
  setStatus('Waiting for Even bridge…');

  const connectBtn = document.getElementById('connectBtn') as HTMLButtonElement | null;

  let client: EvenPrayerClient | null = null;

  connectBtn?.addEventListener('click', async () => {
    if (client) {
      setStatus('Already connected.');
      return;
    }
    try {
      appendEventLog('Connecting to Even bridge…');
      const bridge = await waitForEvenAppBridge();
      client = new EvenPrayerClient(bridge);
      await client.init();
      setStatus('Connected. Use glasses main menu to open Today Needs.');
      appendEventLog('Bridge connected and EvenPrayerClient initialised.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Bridge not available: ${message}\n\nRunning in browser-only mode.`);
      appendEventLog(`Bridge connection failed: ${message}`);
    }
  });
}

void main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[even-prayer] boot failed', error);
  setStatus('App boot failed');
});

