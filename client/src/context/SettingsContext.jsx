import { createContext, useContext, useEffect, useState } from 'react';

// Display preferences, saved on this device (localStorage)
const KEY = 'mangao.settings';
const DEFAULTS = { theme: 'light', photos: true, reduceMotion: false, defaultMode: 'delivery', defaultTip: 0, notifOrder: true, notifPromo: true };

function load() {
  try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch { return DEFAULTS; }
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* storage blocked */ }
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-bs-theme', dark ? 'dark' : 'light');
      document.documentElement.classList.toggle('reduce-motion', settings.reduceMotion);
    };
    apply();
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, [settings]);

  const update = (key, value) => setSettings((s) => ({ ...s, [key]: value }));
  const reset = () => setSettings(DEFAULTS);
  return <SettingsContext.Provider value={{ settings, update, reset }}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
