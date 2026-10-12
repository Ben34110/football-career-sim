import { Capacitor } from '@capacitor/core';

/** True inside the iPhone app (the Capacitor shell), false in a browser. */
export function isNativeApp(): boolean {
  try {
    return typeof window !== 'undefined' && Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}
