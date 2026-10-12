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

export function haptic(pattern: number | number[] = 12) {
  try {
    if (isNativeApp()) {
      void nativeHaptic(pattern).catch(() => undefined);
      return;
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    /* unsupported */
  }
}
