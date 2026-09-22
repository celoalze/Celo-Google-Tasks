import React, { useState, useRef, useEffect } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useI18nStore } from '../../store/useI18nStore';
import { ThemeMode, FontSizeLevel } from '../../contracts/theme.types';
import { LanguagePreference } from '../../contracts/i18n.types';
import { GoogleSignInButton } from '../auth/GoogleSignInButton';
import { M3Switch } from '../ui/M3Switch';
import { M3IconButton } from '../ui/M3IconButton';
import { M3Menu, M3MenuItem } from '../ui/M3Menu';
import { getActiveClientId, getActiveClientSecret } from '../../config/auth.config';
import {
  testDesktopNotification,
  areNotificationsEnabled,
  setNotificationsEnabled,
} from '../../core/notificationScheduler';

const themeOptions: { key: ThemeMode; labelKey: string; icon: string }[] = [
  { key: 'system', labelKey: 'settings.themeSystem', icon: 'devices' },
  { key: 'light', labelKey: 'settings.themeLight', icon: 'light_mode' },
  { key: 'dark', labelKey: 'settings.themeDark', icon: 'dark_mode' },
];

const fontSizeOptions: { key: FontSizeLevel; labelKey: string; indicator: string }[] = [
  { key: 'small', labelKey: 'settings.fontSmall', indicator: 'A-' },
  { key: 'normal', labelKey: 'settings.fontNormal', indicator: 'A' },
  { key: 'large', labelKey: 'settings.fontLarge', indicator: 'A+' },
];

const languageOptions: { key: LanguagePreference; labelKey: string }[] = [
  { key: 'system', labelKey: 'settings.langSystem' },
  { key: 'en', labelKey: 'settings.langEn' },
  { key: 'pt-BR', labelKey: 'settings.langPt' },
  { key: 'es', labelKey: 'settings.langEs' },
];

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    isGoogleConnected,
    disconnectGoogle,
    user,
    isSyncing,
    lastSyncedAt,
    syncTasks,
  } = useTaskStore();

  const { themeMode, setThemeMode, fontSizeLevel, setFontSizeLevel } = useThemeStore();
  const { preference, setLanguagePreference, t } = useI18nStore();

  const [clientId, setClientId] = useState(getActiveClientId);
  const [clientSecret, setClientSecret] = useState(() => getActiveClientSecret() || '');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testNotifStatus, setTestNotifStatus] = useState<string | null>(null);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabledState] = useState(() => areNotificationsEnabled());
  const [startOnBoot, setStartOnBoot] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((id) => clearTimeout(id));
      timeoutsRef.current = [];
    };
  }, []);

  const safeTimeout = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.getAutoLaunch) {
      window.electronAPI
        .getAutoLaunch()
        .then((enabled) => setStartOnBoot(enabled))
        .catch((err) => console.warn('[Settings] Falha ao ler auto-launch:', err));
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLangDropdownOpen(false);
      }
    };
    if (isLangDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLangDropdownOpen]);

  const handleToggleNotifications = (enabled: boolean) => {
    setNotificationsEnabledState(enabled);
    setNotificationsEnabled(enabled);
  };

  const handleToggleStartOnBoot = async (enabled: boolean) => {
    setStartOnBoot(enabled);
    if (typeof window !== 'undefined' && window.electronAPI?.setAutoLaunch) {
      try {
        const res = await window.electronAPI.setAutoLaunch(enabled);
        if (res.ok) {
          setStartOnBoot(res.enabled);
        }
      } catch (err) {
        console.warn('[Settings] Falha ao alternar auto-launch:', err);
      }
    }
  };

  if (!isSettingsOpen) return null;

  const handleSaveCustomKeys = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('google_client_id', clientId.trim());
    localStorage.setItem('google_client_secret', clientSecret.trim());
    setSavedSuccess(true);
    safeTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleDisconnect = async () => {
    await disconnectGoogle();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-m3-surface-container-high rounded-m3-2xl max-w-md w-full p-6 shadow-m3-3 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-rounded text-m3-primary text-[24px]">
              settings
            </span>
            <h2 className="text-base font-semibold text-m3-on-surface">
              {t('settings.title')}
            </h2>
          </div>
          <M3IconButton
            icon="close"
            size="md"
            title={t('common.close')}
            onClick={() => setIsSettingsOpen(false)}
          />
        </div>

        {/* Modal Body */}
        <div className="py-2 space-y-6">
          {/* 1. Appearance Section (Theme, Font Size & Language) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-rounded text-[20px] text-m3-primary">
                palette
              </span>
              <span className="text-xs font-semibold text-m3-on-surface">
                {t('settings.appearance')}
              </span>
            </div>

            {/* Theme Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-m3-on-surface-variant">
                {t('settings.theme')}
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-m3-surface-container">
                {themeOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setThemeMode(opt.key)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-medium transition-all select-none ${
                      themeMode === opt.key
                        ? 'bg-m3-primary-container text-m3-on-primary-container shadow-sm'
                        : 'text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-black/5 dark:hover:bg-[#292929]'
                    }`}
                  >
                    <span className="material-symbols-rounded text-[18px]">
                      {opt.icon}
                    </span>
                    <span>{t(opt.labelKey)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-m3-on-surface-variant">
                {t('settings.fontSize')}
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-m3-surface-container">
                {fontSizeOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setFontSizeLevel(opt.key)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-medium transition-all select-none ${
                      fontSizeLevel === opt.key
                        ? 'bg-m3-primary-container text-m3-on-primary-container shadow-sm'
                        : 'text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-black/5 dark:hover:bg-[#292929]'
                    }`}
                  >
                    <span className="font-bold text-[13px]">{opt.indicator}</span>
                    <span>{t(opt.labelKey)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Language Selector (Dropdown) */}
            <div className="space-y-1.5" ref={langDropdownRef}>
              <label className="text-[11px] font-medium text-m3-on-surface-variant">
                {t('settings.language')}
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                  aria-haspopup="listbox"
                  aria-expanded={isLangDropdownOpen}
                  className={`w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs font-medium transition-all select-none focus:outline-none focus:ring-2 focus:ring-m3-primary ${
                    isLangDropdownOpen
                      ? 'bg-m3-surface-container-highest text-m3-on-surface shadow-sm'
                      : 'bg-m3-surface-container text-m3-on-surface hover:bg-m3-surface-container-highest'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="material-symbols-rounded text-[18px] text-m3-primary flex-shrink-0">
                      {preference === 'system' ? 'tune' : 'translate'}
                    </span>
                    <span className="truncate">
                      {t(languageOptions.find((o) => o.key === preference)?.labelKey || 'settings.langSystem')}
                    </span>
                  </div>
                  <span
                    className={`material-symbols-rounded text-[20px] text-m3-outline transition-transform duration-200 flex-shrink-0 ${
                      isLangDropdownOpen ? 'rotate-180 text-m3-primary' : ''
                    }`}
                  >
                    expand_more
                  </span>
                </button>

                {/* Dropdown Options Menu */}
                {isLangDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-40">
                    <M3Menu width="w-full">
                      {languageOptions.map((opt) => {
                        const isSelected = preference === opt.key;
                        return (
                          <M3MenuItem
                            key={opt.key}
                            icon={opt.key === 'system' ? 'tune' : 'translate'}
                            label={t(opt.labelKey)}
                            onClick={() => {
                              setLanguagePreference(opt.key);
                              setIsLangDropdownOpen(false);
                            }}
                            trailing={
                              isSelected ? (
                                <span className="material-symbols-rounded text-[18px] text-m3-primary">
                                  check
                                </span>
                              ) : undefined
                            }
                          />
                        );
                      })}
                    </M3Menu>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Account & Connection Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-rounded text-[20px] text-m3-primary">
                account_circle
              </span>
              <span className="text-xs font-semibold text-m3-on-surface">
                {t('settings.account')}
              </span>
            </div>
          {/* Connected State */}
          {isGoogleConnected ? (
            <div className="space-y-4">
              <div className="p-4 rounded-m3-lg bg-m3-surface-container flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-m3-primary-container text-m3-on-primary-container flex items-center justify-center text-sm font-semibold overflow-hidden flex-shrink-0">
                  {user.photoUrl ? (
                    <img src={user.photoUrl} alt={user.displayName} className="w-full h-full object-cover" />
                  ) : (
                    user.displayName.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <span className="material-symbols-rounded text-[16px]">check_circle</span>
                    <span>{t('settings.connectedWithGoogle')}</span>
                  </div>
                  <h3 className="text-sm font-medium text-m3-on-surface truncate">
                    {user.displayName}
                  </h3>
                  <p className="text-xs text-m3-on-surface-variant/70 truncate">
                    {user.email}
                  </p>
                </div>
              </div>

              {/* Cloud Synchronization Card */}
              <div className="p-3.5 rounded-m3-lg bg-m3-surface-container space-y-2.5 border border-m3-outline/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-rounded text-[20px] text-m3-primary ${isSyncing ? 'animate-spin' : ''}`}>
                      sync
                    </span>
                    <span className="text-xs font-semibold text-m3-on-surface">
                      {t('settings.cloudSync')}
                    </span>
                  </div>
                  {isSyncing && (
                    <span className="text-[11px] text-m3-primary font-medium flex items-center gap-1">
                      {t('settings.syncing')}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-m3-on-surface-variant/80 leading-relaxed">
                  {t('settings.cloudSyncDesc')}
                </p>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-m3-on-surface-variant/70">
                    {lastSyncedAt
                      ? t('settings.lastSynced').replace('{time}', lastSyncedAt.toLocaleTimeString())
                      : t('settings.syncNever')}
                  </span>
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={async () => {
                      const res = await syncTasks({ silent: false });
                      if (res.ok) {
                        setSyncStatusMessage(t('settings.syncSuccess'));
                        safeTimeout(() => setSyncStatusMessage(null), 3000);
                      }
                    }}
                    className="py-1.5 px-3 rounded-full bg-m3-primary text-m3-on-primary hover:bg-m3-primary/90 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <span className={`material-symbols-rounded text-[16px] ${isSyncing ? 'animate-spin' : ''}`}>
                      sync
                    </span>
                    <span>{isSyncing ? t('settings.syncing') : t('settings.syncNow')}</span>
                  </button>
                </div>

                {syncStatusMessage && (
                  <div className="text-[11px] text-emerald-400 bg-emerald-950/30 p-2 rounded-lg text-center animate-in fade-in">
                    {syncStatusMessage}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleDisconnect}
                className="w-full py-2 px-4 rounded-full bg-m3-error/10 text-m3-error hover:bg-m3-error/20 text-xs font-medium transition-colors"
              >
                {t('settings.disconnectGoogle')}
              </button>
            </div>
          ) : (
            /* Disconnected State - 1-Click Login */
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <p className="text-sm text-m3-on-surface font-medium">
                  {t('settings.syncTitle')}
                </p>
                <p className="text-xs text-m3-on-surface-variant/70">
                  {t('settings.syncDesc')}
                </p>
              </div>

              {/* Official 1-Click Google Sign In Button */}
              <div className="pt-1">
                <GoogleSignInButton
                  onSuccess={() => setIsSettingsOpen(false)}
                  onError={(err) => setErrorMessage(err)}
                />
              </div>

              {errorMessage && (
                <div className="text-xs text-m3-error bg-m3-error/10 p-2.5 rounded-m3-sm text-center">
                  {errorMessage}
                </div>
              )}

              {/* Developer / Advanced Options Toggle */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  className="flex items-center justify-between w-full text-xs text-m3-on-surface-variant/70 hover:text-m3-on-surface transition-colors py-1"
                >
                  <span>{t('settings.cloudKeysAdvanced')}</span>
                  <span className={`material-symbols-rounded text-[18px] transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>

                {isAdvancedOpen && (
                  <form onSubmit={handleSaveCustomKeys} className="mt-3 space-y-2.5 text-left animate-in slide-in-from-top-2 duration-150">
                    <div>
                      <label className="block text-[11px] font-medium text-m3-on-surface-variant mb-1">
                        {t('settings.customClientId')}
                      </label>
                      <input
                        type="text"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder="123456789-abc.apps.googleusercontent.com"
                        className="w-full bg-m3-surface-container-highest px-2.5 py-1.5 rounded-m3-xs text-xs text-m3-on-surface focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-m3-on-surface-variant mb-1">
                        {t('settings.customClientSecret')}
                      </label>
                      <input
                        type="password"
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        placeholder="••••••••••••••••"
                        className="w-full bg-m3-surface-container-highest px-2.5 py-1.5 rounded-m3-xs text-xs text-m3-on-surface focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-emerald-400">
                        {savedSuccess && t('settings.keysSaved')}
                      </span>
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-m3-surface-container-highest hover:bg-m3-surface-bright rounded-m3-xs text-xs text-m3-on-surface font-medium transition-colors"
                      >
                        {t('settings.saveKeys')}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
          </div>

          {/* Desktop Notifications Section */}
          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-rounded text-[20px] text-m3-primary">
                  {notificationsEnabled ? 'notifications_active' : 'notifications_off'}
                </span>
                <span className="text-xs font-semibold text-m3-on-surface">
                  {t('settings.notificationsTitle')}
                </span>
              </div>
              <M3Switch
                checked={notificationsEnabled}
                onChange={handleToggleNotifications}
                ariaLabel={t('settings.notificationsTitle')}
              />
            </div>

            <p className="text-[11px] text-m3-on-surface-variant/80 leading-relaxed">
              {notificationsEnabled
                ? t('settings.notificationsEnabledDesc')
                : t('settings.notificationsDisabledDesc')}
            </p>

            <button
              type="button"
              disabled={!notificationsEnabled}
              onClick={async () => {
                const res = await testDesktopNotification();
                if (res.ok) {
                  setTestNotifStatus(t('settings.testNotificationSuccess'));
                  safeTimeout(() => setTestNotifStatus(null), 4000);
                } else {
                  setTestNotifStatus(`${t('common.error')}: ${res.error || ''}`);
                  safeTimeout(() => setTestNotifStatus(null), 4000);
                }
              }}
              className="w-full py-2 px-3 rounded-xl bg-m3-on-surface/[0.05] hover:bg-m3-on-surface/[0.1] text-xs text-m3-primary font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-rounded text-[18px]">
                campaign
              </span>
              <span>{t('settings.testNotificationBtn')}</span>
            </button>

            {testNotifStatus && (
              <div className="text-[11px] text-emerald-400 bg-emerald-950/30 p-2 rounded-lg text-center animate-in fade-in">
                {testNotifStatus}
              </div>
            )}
          </div>

          {/* System & Startup Section */}
          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-rounded text-[20px] text-m3-primary">
                  laptop_windows
                </span>
                <span className="text-xs font-semibold text-m3-on-surface">
                  {t('settings.systemTitle')}
                </span>
              </div>
              <M3Switch
                checked={startOnBoot}
                onChange={handleToggleStartOnBoot}
                ariaLabel={t('settings.startOnBootTitle')}
              />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-medium text-m3-on-surface">
                {t('settings.startOnBootTitle')}
              </span>
              <p className="text-[11px] text-m3-on-surface-variant/80 leading-relaxed">
                {t('settings.startOnBootDesc')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
