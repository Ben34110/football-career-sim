'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, ChevronRight, Dices, Footprints, Minus, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, Chip } from '@/components/ui/Card';
import { Crest } from '@/components/ui/Crest';
import { CountryPicker } from './CountryPicker';
import { HeadAvatar } from '@/components/ui/HeadAvatar';
import { LangToggle } from '@/components/ui/LangToggle';
import { PlayerCard } from '@/components/ui/PlayerCard';
import { RepBars } from '@/components/ui/Bars';
import { startersFor } from '@/lib/data/clubs';
import {
  BEARD_LABEL,
  BEARD_STYLES,
  DEFAULT_LOOK,
  EYE_COLORS,
  FACE_LABEL,
  FACE_SHAPES,
  HAIR_COLORS,
  HAIR_LABEL,
  HAIR_STYLES,
  randomLook,
  SKINS,
  type Look,
} from '@/lib/data/look';
import { NATIONALITIES } from '@/lib/data/nationalities';
import {
  ALLOCATION_POINTS,
  ATTR_KEYS,
  ATTR_LABEL,
  BASE_ATTRS,
  MAX_ALLOC_PER_ATTR,
  POSITION_LABEL,
  START_AGE,
} from '@/lib/engine/player';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { useGameStore } from '@/lib/store';
import type { AttrKey, Attributes, Foot, Position } from '@/lib/types';
import { cn } from '@/lib/utils';

const STEPS = ['Identity', 'Look', 'Style', 'First club', 'Attributes'];

const POS_DOT: Record<Position, [number, number]> = { ST: [50, 14], CAM: [50, 34], RW: [82, 24], LW: [18, 24] };
const POS_BLURB: Record<Position, string> = {
  ST: 'Lethal in the box. Finishing is king.',
  CAM: 'The creative engine. Vision pulls strings.',
  RW: 'Pace on the right. Cut inside or beat the full-back.',
  LW: 'Pace on the left. Stretch the back line.',
};

const tierLabel = (t: number) => ['', 'Elite', 'Top flight', 'Mid-table', 'Second tier', 'Lower leagues'][t];

export function CreateWizard() {
  const t = useT();
  const router = useRouter();
  const createCareer = useGameStore((s) => s.createCareer);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);

  const [name, setName] = useState('');
  const [look, setLook] = useState<Look>(DEFAULT_LOOK);
  const [nationality, setNationality] = useState('FRA');
  const [position, setPosition] = useState<Position>('ST');
  const [foot, setFoot] = useState<Foot>('Right');
  const [clubCountry, setClubCountry] = useState('France');
  const [clubId, setClubId] = useState(startersFor('France')[0].id);
  const [alloc, setAlloc] = useState<Attributes>({ finishing: 0, composure: 0, vision: 0, stamina: 0 });

  const used = ATTR_KEYS.reduce((s, k) => s + alloc[k], 0);
  const left = ALLOCATION_POINTS - used;
  const attrs = useMemo<Attributes>(() => {
    const base = BASE_ATTRS[position];
    return { finishing: base.finishing + alloc.finishing, composure: base.composure + alloc.composure, vision: base.vision + alloc.vision, stamina: base.stamina + alloc.stamina };
  }, [position, alloc]);

  const canNext = step === 0 ? name.trim().length >= 2 : true;

  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
    haptic(10);
  };

  const bump = (k: AttrKey, d: 1 | -1) => {
    if (d === 1 && (left <= 0 || alloc[k] >= MAX_ALLOC_PER_ATTR)) return;
    if (d === -1 && alloc[k] <= 0) return;
    haptic(6);
    setAlloc((a) => ({ ...a, [k]: a[k] + d }));
  };

  const finish = () => {
    createCareer({ name, nationality, position, foot, clubId, allocation: alloc, look });
    router.replace('/home');
  };

  const clubs = startersFor(clubCountry);

  /** Pick where the career starts; the nationality's own country is the default. */
  const chooseClubCountry = (name: string) => {
    const first = startersFor(name)[0];
    if (!first) return;
    setClubCountry(name);
    setClubId(first.id);
  };

  return (
    <div className="pt-safe pb-safe flex min-h-dvh flex-col px-4">
      {/* Progress header */}
      <div className="flex items-center gap-3 py-4">
        <button
          onClick={() => (step === 0 ? router.push('/') : go(step - 1))}
          aria-label={t('Back')}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] active:scale-90"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-1 gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
          {STEPS.map((s, i) => (
            <div key={s} className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full bg-neon-400" animate={{ width: i <= step ? '100%' : '0%' }} transition={{ duration: 0.35 }} />
            </div>
          ))}
        </div>
        <span className="font-num text-sm font-semibold text-zinc-500">
          {step + 1}/{STEPS.length}
        </span>
        <LangToggle />
      </div>

      <div className="relative flex-1">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ x: dir * 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dir * -40, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="space-y-5 pb-28"
          >
            {step === 0 && (
              <>
                <Header eyebrow={t('Step {n}', { n: 1 })} title={t('Who are you?')} sub={t('Your name goes on the back of the shirt.')} />
                <label className="block">
                  <span className="eyebrow">{t('Player name')}</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={22}
                    placeholder={t('e.g. Kylian Diallo')}
                    autoComplete="off"
                    autoCapitalize="words"
                    className="mt-2 h-14 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-lg font-semibold outline-none ring-neon-400/60 placeholder:text-zinc-600 focus:border-neon-400/50 focus:ring-2"
                  />
                </label>
                <CountryPicker
                  label={t('Nationality')}
                  value={nationality}
                  onPick={(n) => {
                    setNationality(n.code);
                    chooseClubCountry(n.name);
                  }}
                />
              </>
            )}

            {step === 1 && (
              <>
                <Header eyebrow={t('Step {n}', { n: 2 })} title={t('Your look')} sub={t('Customise your head. It appears on your player card.')} />
                <div className="flex flex-col items-center gap-3">
                  <motion.div key={`${look.skin}-${look.hair}-${look.hairColor}-${look.beard}`} initial={{ scale: 0.92 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 18 }}>
                    <HeadAvatar look={look} size={168} className="drop-shadow-[0_10px_24px_rgba(0,0,0,0.6)]" />
                  </motion.div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setLook(randomLook());
                      haptic(12);
                    }}
                  >
                    <Dices className="h-4 w-4" /> {t('Surprise me')}
                  </Button>
                </div>

                <div>
                  <span className="eyebrow">{t('Skin tone')}</span>
                  <div className="mt-2 flex flex-wrap gap-2.5">
                    {SKINS.map((c, i) => (
                      <Swatch key={c} color={c} active={look.skin === i} label={`${t('Skin tone')} ${i + 1}`} onClick={() => setLook((l) => ({ ...l, skin: i }))} />
                    ))}
                  </div>
                </div>

                <div>
                  <span className="eyebrow">{t('Face shape')}</span>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {FACE_SHAPES.map((f) => (
                      <Thumb key={f} active={(look.face ?? 'oval') === f} label={t(FACE_LABEL[f])} onClick={() => setLook((l) => ({ ...l, face: f }))}>
                        <HeadAvatar look={{ ...look, face: f }} size={54} />
                      </Thumb>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="eyebrow">{t('Eye colour')}</span>
                  <div className="mt-2 flex flex-wrap gap-2.5">
                    {EYE_COLORS.map((c, i) => (
                      <Swatch key={c.id} color={c.hex} active={(look.eyes ?? 1) === i} label={t(c.id)} onClick={() => setLook((l) => ({ ...l, eyes: i }))} />
                    ))}
                  </div>
                </div>

                <div>
                  <span className="eyebrow">{t('Hairstyle')}</span>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {HAIR_STYLES.map((h) => (
                      <Thumb key={h} active={look.hair === h} label={t(HAIR_LABEL[h])} onClick={() => setLook((l) => ({ ...l, hair: h }))}>
                        <HeadAvatar look={{ ...look, hair: h }} size={54} />
                      </Thumb>
                    ))}
                  </div>
                </div>

                {look.hair !== 'bald' && (
                  <div>
                    <span className="eyebrow">{t('Hair colour')}</span>
                    <div className="mt-2 flex flex-wrap gap-2.5">
                      {HAIR_COLORS.map((c, i) => (
                        <Swatch key={c.id} color={c.hex} active={look.hairColor === i} label={t(c.id)} onClick={() => setLook((l) => ({ ...l, hairColor: i }))} />
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <span className="eyebrow">{t('Facial hair')}</span>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {BEARD_STYLES.map((b) => (
                      <Thumb key={b} active={look.beard === b} label={t(BEARD_LABEL[b])} onClick={() => setLook((l) => ({ ...l, beard: b }))}>
                        <HeadAvatar look={{ ...look, beard: b }} size={54} />
                      </Thumb>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <Header eyebrow={t('Step {n}', { n: 3 })} title={t('How do you play?')} sub={t('Position shapes how your attributes become OVR.')} />
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(POSITION_LABEL) as Position[]).map((p) => {
                    const [x, y] = POS_DOT[p];
                    const active = position === p;
                    return (
                      <button
                        key={p}
                        onClick={() => {
                          setPosition(p);
                          haptic(8);
                        }}
                        aria-pressed={active}
                        className={cn(
                          'gloss-edge relative rounded-2xl border p-3 text-left transition-all active:scale-95',
                          active ? 'border-neon-400/60 bg-neon-400/10 shadow-neon' : 'border-white/[0.08] bg-white/[0.04]',
                        )}
                      >
                        <svg viewBox="0 0 100 56" className="mb-2 w-full rounded-lg bg-emerald-950/60" aria-hidden>
                          <rect x="1" y="1" width="98" height="54" rx="3" fill="none" stroke="rgba(52,211,153,.35)" />
                          <rect x="30" y="1" width="40" height="14" fill="none" stroke="rgba(52,211,153,.3)" />
                          <circle cx="50" cy="56" r="14" fill="none" stroke="rgba(52,211,153,.25)" />
                          <circle cx={x} cy={y} r="5.500" fill={active ? '#34d399' : '#a1a1aa'} />
                        </svg>
                        <div className="font-display text-3xl font-extrabold leading-none">{p}</div>
                        <div className="mt-0.5 text-xs font-semibold text-zinc-300">{t(POSITION_LABEL[p])}</div>
                      </button>
                    );
                  })}
                </div>
                <p className="px-1 text-sm text-zinc-400">{t(POS_BLURB[position])}</p>
                <div>
                  <span className="eyebrow">{t('Strong foot')}</span>
                  <div className="mt-2 grid grid-cols-3 gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-1">
                    {(['Left', 'Right', 'Both'] as Foot[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => {
                          setFoot(f);
                          haptic(8);
                        }}
                        aria-pressed={foot === f}
                        className={cn(
                          'flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition-all',
                          foot === f ? 'bg-gradient-to-b from-neon-400 to-neon-600 text-zinc-950 shadow-neon' : 'text-zinc-400',
                        )}
                      >
                        <Footprints className={cn('h-4 w-4', f === 'Left' && '-scale-x-100')} />
                        {t(f)}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <Header eyebrow={t('Step {n}', { n: 4 })} title={t('Pick your first club')} sub={t('Everyone starts somewhere. Lower leagues are rough but glory is sweeter.')} />
                <CountryPicker label={t('Country of your first club')} value={getNationalityCode(clubCountry)} onPick={(n) => chooseClubCountry(n.name)} />
                <div className="space-y-2.5">
                  {clubs.map((c) => {
                    const active = clubId === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          setClubId(c.id);
                          haptic(8);
                        }}
                        aria-pressed={active}
                        className={cn(
                          'gloss-edge flex w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all active:scale-[0.98]',
                          active ? 'border-neon-400/60 bg-neon-400/10 shadow-neon' : 'border-white/[0.08] bg-white/[0.04]',
                        )}
                      >
                        <Crest short={c.short} color={c.color} size={46} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[15px] font-bold">{c.name}</div>
                          <div className="text-xs text-zinc-500">
                            {c.flag} {t(c.league)}
                          </div>
                          <div className="mt-1.5 flex gap-1.5">
                            <Chip tone={c.tier === 4 ? 'gold' : 'neutral'}>{t(tierLabel(c.tier))}</Chip>
                            <Chip>{t('Squad')} {c.strength}</Chip>
                          </div>
                        </div>
                        {active && <Check className="h-5 w-5 text-neon-400" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <Header eyebrow={t('Step {n}', { n: 5 })} title={t('Shape your talent')} sub={t('Spend {n} training points. OVR starts around 57–64 and can reach 99.', { n: ALLOCATION_POINTS })} />
                <PlayerCard name={name} nationality={nationality} position={position} attrs={attrs} age={START_AGE} clubId={clubId} look={look} compact />
                <Card className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="eyebrow">{t('Attributes')}</span>
                    <Chip tone={left === 0 ? 'good' : 'gold'}>{t('{n} points left', { n: left })}</Chip>
                  </div>
                  <div className="space-y-3">
                    {ATTR_KEYS.map((k) => (
                      <div key={k} className="flex items-center gap-3">
                        <div className="w-24 text-sm font-semibold text-zinc-300">{t(ATTR_LABEL[k])}</div>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                          <motion.div className="h-full rounded-full bg-gradient-to-r from-neon-600 to-neon-300" animate={{ width: `${attrs[k]}%` }} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <StepBtn label={`${t('Decrease')} ${t(ATTR_LABEL[k])}`} onClick={() => bump(k, -1)} disabled={alloc[k] <= 0}>
                            <Minus className="h-4 w-4" />
                          </StepBtn>
                          <span className="font-num w-7 text-center text-lg font-bold">{attrs[k]}</span>
                          <StepBtn label={`${t('Increase')} ${t(ATTR_LABEL[k])}`} onClick={() => bump(k, 1)} disabled={left <= 0 || alloc[k] >= MAX_ALLOC_PER_ATTR}>
                            <Plus className="h-4 w-4" />
                          </StepBtn>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="eyebrow mb-3">{t('Starting reputation')}</div>
                  <RepBars rep={{ coachTrust: 45, fanPopularity: 30, lockerRoom: 40, mediaHeat: 10 }} />
                </Card>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[430px] bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent px-4 pb-4 pt-8">
        {step < STEPS.length - 1 ? (
          <Button size="lg" block disabled={!canNext} onClick={() => go(step + 1)}>
            {t('Continue')} <ChevronRight className="h-5 w-5" />
          </Button>
        ) : (
          <Button size="lg" block variant="gold" onClick={finish}>
            {t('Sign contract & kick off')}
          </Button>
        )}
      </div>
    </div>
  );
}

function Header({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div>
      <div className="eyebrow text-neon-400">{eyebrow}</div>
      <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-zinc-400">{sub}</p>
    </div>
  );
}

function StepBtn({ children, onClick, disabled, label }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-zinc-200 transition-all active:scale-90 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function Swatch({ color, active, label, onClick }: { color: string; active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={() => {
        onClick();
        haptic(8);
      }}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn('flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all active:scale-90', active ? 'border-neon-300 shadow-neon' : 'border-white/10')}
    >
      <span className="h-7 w-7 rounded-full border border-black/30" style={{ backgroundColor: color }} />
    </button>
  );
}

function Thumb({ children, active, label, onClick }: { children: React.ReactNode; active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={() => {
        onClick();
        haptic(8);
      }}
      aria-pressed={active}
      className={cn(
        'flex flex-col items-center gap-1 rounded-2xl border p-1.5 transition-all active:scale-95',
        active ? 'border-neon-400/60 bg-neon-400/10 shadow-neon' : 'border-white/[0.08] bg-white/[0.04]',
      )}
    >
      {children}
      <span className={cn('text-[10px] font-semibold leading-none', active ? 'text-neon-300' : 'text-zinc-400')}>{label}</span>
    </button>
  );
}

const getNationalityCode = (name: string) => NATIONALITIES.find((n) => n.name === name)?.code ?? '';
