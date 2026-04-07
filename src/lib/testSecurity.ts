type KeyboardLockCapableNavigator = Navigator & {
  keyboard?: {
    lock?: (keys?: string[]) => Promise<void>;
    unlock?: () => void;
  };
};

function getKeyboardNavigator(): KeyboardLockCapableNavigator | null {
  if (typeof navigator === 'undefined') {
    return null;
  }

  return navigator as KeyboardLockCapableNavigator;
}

export async function lockSecureTestKeys(): Promise<void> {
  if (typeof document === 'undefined' || !document.fullscreenElement) {
    return;
  }

  try {
    await getKeyboardNavigator()?.keyboard?.lock?.([
      'Escape',
      'MetaLeft', 'MetaRight',
      'AltLeft', 'AltRight',
      'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
      'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
    ]);
  } catch {
    // Ignore unsupported browsers and keep the fallback fullscreen guard active.
  }
}

export function unlockSecureTestKeys(): void {
  try {
    getKeyboardNavigator()?.keyboard?.unlock?.();
  } catch {
    // Ignore unsupported browsers.
  }
}

export async function enterSecureFullscreen(element: HTMLElement = document.documentElement): Promise<boolean> {
  try {
    if (!document.fullscreenElement) {
      await element.requestFullscreen();
    }
    await lockSecureTestKeys();
    return true;
  } catch {
    return false;
  }
}

export async function reenterSecureFullscreen(element: HTMLElement = document.documentElement): Promise<void> {
  try {
    if (!document.fullscreenElement) {
      await element.requestFullscreen();
    }
  } catch {
    // Re-entry can fail without a fresh user gesture. Keep the warning path active.
  }

  await lockSecureTestKeys();
}

export async function exitSecureFullscreen(): Promise<void> {
  unlockSecureTestKeys();

  if (!document.fullscreenElement) {
    return;
  }

  try {
    await document.exitFullscreen();
  } catch {
    // Ignore exit failures when the browser leaves fullscreen on its own.
  }
}
