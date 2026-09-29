import React, { useState } from 'react';
import { GoogleSignInButton } from './GoogleSignInButton';
import { useTaskStore } from '../../store/useTaskStore';
import { useI18nStore } from '../../store/useI18nStore';
import { assetUrl } from '../../utils/assetUrl';

export const LoginScreen: React.FC = () => {
  const setIsSettingsOpen = useTaskStore((s) => s.setIsSettingsOpen);
  const t = useI18nStore((state) => state.t);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 relative select-none animate-in fade-in duration-300">
      {/* Central Content Card */}
      <div className="flex flex-col items-center text-center max-w-md w-full px-4">
        {/* Google Tasks Official Icon */}
        <div className="relative mb-5 group">
          <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-m3-primary/30 to-m3-primary/10 blur-lg opacity-70 group-hover:opacity-100 transition-opacity" />
          <img
            src={assetUrl('icon.png')}
            alt="Google Tasks"
            className="relative w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-md select-none pointer-events-none"
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-m3-on-surface tracking-tight">
          {t('login.appTitle')}
        </h1>

        {/* Brief Description */}
        <p className="text-sm md:text-base text-m3-on-surface-variant mt-2 mb-8 max-w-sm leading-relaxed">
          {t('login.tagline')}
        </p>

        {/* Google Sign In Button & Action Area */}
        <div className="w-full max-w-[280px] flex flex-col items-center gap-3">
          <GoogleSignInButton
            className="w-full !py-3 shadow-md hover:shadow-lg text-sm font-medium"
            onError={(err) => setErrorMessage(err)}
          />

          {/* Inline Error Feedback */}
          {errorMessage && (
            <div role="alert" className="w-full text-xs text-m3-error bg-m3-error/10 rounded-m3-md p-3 text-center animate-in fade-in duration-150">
              {errorMessage}
            </div>
          )}
        </div>
      </div>

      {/* Discreet Settings Trigger in Footer */}
      <footer className="absolute bottom-6 flex items-center justify-center">
        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center gap-1.5 text-xs text-m3-on-surface-variant hover:text-m3-on-surface transition-colors py-1.5 px-3 rounded-full hover:bg-m3-on-surface/10 focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:outline-none"
          title={t('login.connectionSettings')}
        >
          <span className="material-symbols-rounded text-[16px]">settings</span>
          <span>{t('login.connectionSettings')}</span>
        </button>
      </footer>
    </main>
  );
};
