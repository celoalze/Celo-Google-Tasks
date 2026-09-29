import React, { useState, useRef, useEffect } from 'react';
import {
  getTodayIso,
  getTomorrowIso,
  getNextWeekIso,
  toGoogleDueIso,
  extractDateString,
} from '../../core/dateUtils';
import { useI18nStore } from '../../store/useI18nStore';

interface DatePickerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (isoDate?: string) => void;
  currentIso?: string;
}

export const DatePickerMenu: React.FC<DatePickerMenuProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentIso,
}) => {
  const t = useI18nStore((state) => state.t);
  const locale = useI18nStore((state) => state.locale);

  const [showCustom, setShowCustom] = useState(false);
  const [customDate, setCustomDate] = useState(
    extractDateString(currentIso) || new Date().toISOString().split('T')[0]
  );

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDate) return;
    const iso = toGoogleDueIso(customDate);
    onSelect(iso);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      className="absolute bottom-full mb-2 right-0 w-60 bg-m3-surface-container-high rounded-m3-sm shadow-m3-3 py-1.5 z-50 text-xs text-m3-on-surface animate-in fade-in zoom-in-95 duration-100 select-none"
    >
      {!showCustom ? (
        <div className="space-y-0.5">
          {/* Preset: Hoje */}
          <button
            type="button"
            onClick={() => {
              onSelect(getTodayIso());
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-m3-on-surface/10 text-left transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-rounded text-[18px] text-m3-primary">
                today
              </span>
              <span>{t('dateTime.today')}</span>
            </div>
            <span className="text-[11px] text-m3-on-surface-variant/70">
              {new Date().toLocaleDateString(locale, { weekday: 'short' })}
            </span>
          </button>

          {/* Preset: Amanhã */}
          <button
            type="button"
            onClick={() => {
              onSelect(getTomorrowIso());
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-m3-on-surface/10 text-left transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-rounded text-[18px] text-m3-on-surface-variant">
                event
              </span>
              <span>{t('dateTime.tomorrow')}</span>
            </div>
            <span className="text-[11px] text-m3-on-surface-variant/70">
              {new Date(Date.now() + 86400000).toLocaleDateString(locale, { weekday: 'short' })}
            </span>
          </button>

          {/* Preset: Próxima semana */}
          <button
            type="button"
            onClick={() => {
              onSelect(getNextWeekIso());
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-m3-on-surface/10 text-left transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-rounded text-[18px] text-m3-on-surface-variant">
                date_range
              </span>
              <span>{t('dateTime.nextWeek')}</span>
            </div>
            <span className="text-[11px] text-m3-on-surface-variant/70">
              {new Date(Date.now() + 7 * 86400000).toLocaleDateString(locale, { weekday: 'short' })}
            </span>
          </button>

          <div className="border-t border-m3-outline-variant/30 my-1" />

          {/* Escolher data */}
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-m3-on-surface/10 text-left transition-colors"
          >
            <span className="material-symbols-rounded text-[18px] text-m3-on-surface-variant">
              calendar_month
            </span>
            <span>{t('dateTime.chooseDate')}</span>
          </button>

          {/* Remover data */}
          {currentIso && (
            <button
              type="button"
              onClick={() => {
                onSelect(undefined);
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-m3-error hover:bg-m3-error/10 text-left transition-colors"
            >
              <span className="material-symbols-rounded text-[18px]">event_busy</span>
              <span>{t('dateTime.removeDate')}</span>
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={handleCustomSubmit} className="p-3 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-medium text-m3-on-surface-variant">
            <span>{t('dateTime.setDueDateTitle')}</span>
            <button
              type="button"
              onClick={() => setShowCustom(false)}
              className="text-m3-on-surface-variant/70 hover:text-m3-on-surface"
            >
              {t('common.back')}
            </button>
          </div>

          <div>
            <label htmlFor="dt-custom-date" className="sr-only">
              {t('dateTime.chooseDate')}
            </label>
            <input
              id="dt-custom-date"
              type="date"
              required
              autoFocus
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="w-full bg-m3-surface-container-highest px-2.5 py-1.5 rounded-m3-xs text-xs text-m3-on-surface focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1 text-xs text-m3-on-surface-variant hover:text-m3-on-surface focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:outline-none rounded-full"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-m3-primary text-m3-on-primary rounded-m3-xs text-xs font-medium hover:bg-m3-primary/90 focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:outline-none transition-colors"
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
