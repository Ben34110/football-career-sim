'use client';

import { BellRing, ChevronLeft, ChevronRight, ExternalLink, FileText, HelpCircle, LifeBuoy, Mail, Megaphone, Shield, Trash2, Vibrate } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, SectionTitle } from '@/components/ui/Card';
import { LangToggle } from '@/components/ui/LangToggle';
import { LeaderboardButton } from '@/components/ui/LeaderboardButton';
import { Sheet } from '@/components/ui/Sheet';
import { APP_NAME, APP_VERSION, CONTACT_EMAIL, TERMS_URL } from '@/lib/appInfo';
import { hapticsEnabled, setHapticsEnabled } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { isNativeApp } from '@/lib/platform';
import { useGameStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

function Row({ icon, label, hint, href, external, onClick }: { icon: React.ReactNode; label: string; hint?: string; href?: string; external?: boolean; onClick?: () => void }) {
  const body = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-zinc-300">{icon}</span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[14px] font-semibold text-zinc-100">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">{hint}</span>}
      </span>
      {external ? <ExternalLink className="h-4 w-4 shrink-0 text-zinc-500" /> : <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />}
    </>
  );
  const cls = 'flex w-full items-center gap-3 px-4 py-3 active:bg-white/[0.04]';
  if (!href) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {body}
      </button>
    );
  }
  if (external || href.startsWith('mailto:')) {
    return (
      <a href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noopener noreferrer" className={cls}>
        {body}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {body}
    </Link>
  );
}

/** Language, vibrations, help and legal pages, ad choices and data. Reachable before a career exists. */
export default function SettingsPage() {
  const t = useT();
  const hasCareer = useGameStore((s) => s.hasCareer);
  const [native, setNative] = useState(false);
  const [haptics, setHaptics] = useState(true);
  const [notifs, setNotifs] = useState(false);
  const [wipe, setWipe] = useState(false);

  useEffect(() => {
    const isNative = isNativeApp();
    setNative(isNative);
    setHaptics(hapticsEnabled());
    if (isNative) void import('@/lib/native/notifications').then((m) => setNotifs(m.notificationsOn()));
  }, []);

  const eraseAll = () => {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {
      /* nothing to clear */
    }
    window.location.href = '/';
  };

  return (
    <div className="px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
      <div className="mb-5 flex items-center gap-3">
        <Link href={hasCareer ? '/home' : '/'} aria-label={t('Back')} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 active:scale-90">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none">{t('Settings')}</h1>
      </div>

      <div className="space-y-6">
        <div>
          <SectionTitle>{t('Preferences')}</SectionTitle>
          <Card className="divide-y divide-white/[0.06] p-0">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-[14px] font-semibold text-zinc-100">{t('Language')}</span>
              <LangToggle />
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-zinc-300">
                  <Vibrate className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-[14px] font-semibold text-zinc-100">{t('Vibrations')}</span>
                  <span className="block text-[11px] text-zinc-500">{t('Feel the key moments of a match.')}</span>
                </span>
              </span>
              <button
                role="switch"
                aria-checked={haptics}
                aria-label={t('Vibrations')}
                onClick={() => {
                  const next = !haptics;
                  setHaptics(next);
                  setHapticsEnabled(next);
                }}
                className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', haptics ? 'bg-neon-500' : 'bg-white/15')}
              >
                <span className={cn('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all', haptics ? 'left-[22px]' : 'left-0.5')} />
              </button>
            </div>
            {native && (
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-zinc-300">
                    <BellRing className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-[14px] font-semibold text-zinc-100">{t('Notifications')}</span>
                    <span className="block text-[11px] text-zinc-500">{t('Lives back, and a nudge if you are away.')}</span>
                  </span>
                </span>
                <button
                  role="switch"
                  aria-checked={notifs}
                  aria-label={t('Notifications')}
                  onClick={async () => {
                    const m = await import('@/lib/native/notifications');
                    if (notifs) {
                      await m.disableNotifications();
                      setNotifs(false);
                      return;
                    }
                    const ok = await m.enableNotifications();
                    setNotifs(ok);
                    if (!ok) toast(t('Allow notifications for Ultime Player in iPhone Settings › Notifications.'), 'bad');
                  }}
                  className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', notifs ? 'bg-neon-500' : 'bg-white/15')}
                >
                  <span className={cn('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all', notifs ? 'left-[22px]' : 'left-0.5')} />
                </button>
              </div>
            )}
            {native && (
              <Row
                icon={<BellRing className="h-4 w-4" />}
                label={t('Send a test notification')}
                hint={t('It arrives in a few seconds: leave the app to see it.')}
                onClick={async () => {
                  const m = await import('@/lib/native/notifications');
                  const r = await m.sendTestNotification(t('Test: notifications work on this iPhone.'));
                  toast(r === 'sent' ? t('Sent: leave the app and wait a few seconds.') : t('Allow notifications for Ultime Player in iPhone Settings › Notifications.'), r === 'sent' ? 'good' : 'bad');
                }}
              />
            )}
          </Card>
        </div>

        <div>
          <SectionTitle>{t('Help and legal')}</SectionTitle>
          <Card className="divide-y divide-white/[0.06] p-0">
            <Row icon={<Mail className="h-4 w-4" />} label={t('Contact support')} hint={CONTACT_EMAIL} href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(APP_NAME)}`} />
            <Row icon={<HelpCircle className="h-4 w-4" />} label={t('Help and FAQ')} href="/support" />
            <Row icon={<Shield className="h-4 w-4" />} label={t('Privacy policy')} href="/privacy" />
            <Row icon={<FileText className="h-4 w-4" />} label={t('Terms of use')} href={TERMS_URL} external />
          </Card>
        </div>

        {native && (
          <div>
            <SectionTitle>{t('Ads and game center')}</SectionTitle>
            <Card className="space-y-3 p-0">
              <div className="divide-y divide-white/[0.06]">
                <Row
                  icon={<Megaphone className="h-4 w-4" />}
                  label={t('Ad preferences')}
                  hint={t('Change your choice about personalised ads.')}
                  onClick={async () => {
                    const m = await import('@/lib/native/ios');
                    if (!(await m.openAdPrivacyOptions())) toast(t('Nothing more to set in your region. Tracking can be changed in iPhone Settings › Privacy & Security › Tracking.'), 'good');
                  }}
                />
              </div>
              <div className="px-4 pb-4">
                <LeaderboardButton />
              </div>
            </Card>
          </div>
        )}

        <div>
          <SectionTitle>{t('Your data')}</SectionTitle>
          <Card className="divide-y divide-white/[0.06] p-0">
            <Row icon={<Trash2 className="h-4 w-4 text-crimson-400" />} label={t('Delete all my data')} hint={t('Careers, archives, bought lives and boosts, and settings.')} onClick={() => setWipe(true)} />
          </Card>
        </div>

        <div className="space-y-1 pt-2 text-center text-[11px] text-zinc-500">
          <p className="flex items-center justify-center gap-1.5 font-semibold text-zinc-400">
            <LifeBuoy className="h-3.5 w-3.5" /> {APP_NAME} · {t('Version {v}', { v: APP_VERSION })}
          </p>
          <p>{t('Clubs and players in the game are fictional.')}</p>
        </div>
      </div>

      <Sheet open={wipe} dismissible onClose={() => setWipe(false)}>
        <div>
          <div className="font-display text-2xl font-extrabold uppercase leading-none">{t('Delete all my data')}</div>
          <p className="mt-2 text-sm leading-snug text-zinc-400">
            {t('This erases your careers, archives, bought lives and boosts, and settings from this device. It cannot be undone.')}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button variant="ghost" onClick={() => setWipe(false)}>
              {t('Cancel')}
            </Button>
            <Button variant="danger" onClick={eraseAll}>
              {t('Delete everything')}
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
