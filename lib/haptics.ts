import { isNativeApp } from './platform';

async function nativeHaptic(pattern: number | number[]) {
  const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
  // a sequence is a celebration or a blow: a notification; a single tick scales with its length
  if (Array.isArray(pattern)) {
    await Haptics.notification({ type: pattern.length >= 3 ? NotificationType.Success : NotificationType.Warning });
    return;
  }
  await Haptics.impact({ style: pattern <= 16 ? ImpactStyle.Light : pattern <= 50 ? ImpactStyle.Medium : ImpactStyle.Heavy });
}

const KEY = 'fcs-haptics';

/** Vibrations can be switched off in Settings (on by default). */
export function hapticsEnabled(): boolean {
  try {
    return typeof window === 'undefined' || window.localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setHapticsEnabled(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* private mode */
  }
}

export function haptic(pattern: number | number[] = 12) {
  try {
    if (!hapticsEnabled()) return;
    if (isNativeApp()) {
      void nativeHaptic(pattern).catch(() => undefined);
      return;
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    /* unsupported */
  }
}
