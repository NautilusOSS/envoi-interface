import { useEffect } from "react";

interface KeyboardShortcutOptions {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  callback: () => void;
  preventDefault?: boolean;
}

export const useKeyboardShortcut = (options: KeyboardShortcutOptions) => {
  const {
    key,
    ctrlKey = false,
    metaKey = false,
    shiftKey = false,
    altKey = false,
    callback,
    preventDefault = true,
  } = options;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the pressed key matches our shortcut
      const keyMatches = event.key.toLowerCase() === key.toLowerCase();
      const ctrlMatches = event.ctrlKey === ctrlKey;
      const metaMatches = event.metaKey === metaKey;
      const shiftMatches = event.shiftKey === shiftKey;
      const altMatches = event.altKey === altKey;

      if (keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches) {
        if (preventDefault) {
          event.preventDefault();
        }
        callback();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [key, ctrlKey, metaKey, shiftKey, altKey, callback, preventDefault]);
};

export const useGlobalSearchShortcut = (onOpenSearch: () => void) => {
  useKeyboardShortcut({
    key: "k",
    metaKey: true, // Cmd+K on Mac
    callback: onOpenSearch,
  });

  useKeyboardShortcut({
    key: "k",
    ctrlKey: true, // Ctrl+K on Windows/Linux
    callback: onOpenSearch,
  });
};

export default useKeyboardShortcut;
