import { useEffect } from "react";

/**
 * Captures the browser's automatic PWA install prompt so it doesn't pop up on
 * marketing pages without context. Stashes the event on `window.__deferredInstallPrompt`
 * for an in-app component (e.g. inside the dashboard shell) to surface it deliberately.
 */
export function InstallPromptGuard() {
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      (window as any).__deferredInstallPrompt = e;
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  return null;
}
