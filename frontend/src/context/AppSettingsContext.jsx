import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { settingsAPI, getAuthToken } from '../utils/api';

const AppSettingsContext = createContext(null);

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    // Skip if not logged in
    if (!getAuthToken()) {
      setLoading(false);
      return;
    }
    try {
      const data = await settingsAPI.getCompany();
      setSettings(data);
    } catch {
      // silent — settings not critical for app function
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const language = settings.language || 'th';
  const theme = settings.theme || 'light';
  const dateFormat = settings.date_format || 'th-TH';
  const timezone = settings.timezone || 'Asia/Bangkok';
  const companyName = settings.company_name || '';
  const logoUrl = settings.logo_url || '';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const value = useMemo(() => ({
    settings, loading, language, theme, dateFormat, timezone,
    companyName, logoUrl, refreshSettings: loadSettings,
  }), [settings, loading, language, theme, dateFormat, timezone, companyName, logoUrl, loadSettings]);

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within AppSettingsProvider');
  return ctx;
}
