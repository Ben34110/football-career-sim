import { registerPlugin } from '@capacitor/core';

interface AppEnvPlugin {
  isTestFlight(): Promise<{ testFlight: boolean }>;
}

/** Implemented in Swift (ios/App/App/AppEnvPlugin.swift). */
const AppEnv = registerPlugin<AppEnvPlugin>('AppEnv');

let cached: Promise<boolean> | null = null;

/** True when the app was installed from TestFlight (testers, and you): ads stay in test mode there. */
export function isTestFlight(): Promise<boolean> {
  return (cached ??= AppEnv.isTestFlight().then((r) => r.testFlight).catch(() => false));
}
