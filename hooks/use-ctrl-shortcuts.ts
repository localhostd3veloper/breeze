'use client';

import { useEffect, useRef } from 'react';

type KeyHandler = (e: KeyboardEvent) => void;

interface ShortcutOptions {
  preventDefault?: boolean;
  shift?: boolean;
  alt?: boolean;
}

/**
 * A hook to register global Ctrl (or Meta on Mac) + <Key> shortcuts.
 *
 * @param key The key to listen for (e.g., 'b', 'k', '.'). Case-insensitive.
 * @param handler The function to call when the shortcut is pressed.
 * @param options Additional options, like preventDefault (default: true)
 */
export function useCtrlShortcut(
  key: string,
  handler: KeyHandler,
  options: ShortcutOptions = { preventDefault: true },
) {
  const handlerRef = useRef(handler);

  // Keep handler ref up-to-date to avoid stale closures
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Ctrl (Windows/Linux) or Meta/Cmd (Mac) is pressed
      // You can adjust this to strictly require Ctrl or Cmd based on preference.
      // Usually, web apps map "Ctrl" to Cmd on Mac.
      const isModifierPressed = e.ctrlKey || e.metaKey;
      const requiresShift = !!options.shift;
      const requiresAlt = !!options.alt;

      if (
        isModifierPressed &&
        e.shiftKey === requiresShift &&
        e.altKey === requiresAlt &&
        e.key.toLowerCase() === key.toLowerCase()
      ) {
        if (options.preventDefault) e.preventDefault();
        handlerRef.current(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, options.preventDefault]);
}
