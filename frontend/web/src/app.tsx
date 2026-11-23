import { Suspense, lazy, useEffect, useState } from 'react';
import { AppRoutes } from '@/router/routes';

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

// Care is a fixed, closed widget: it has no first-paint value. Loading it after
// the shell is interactive keeps its React work and icon chunk off the critical
// path; a pointer/key press loads it immediately if someone reaches for it.
const ChatBot = lazy(() => import('@/features/ai-assistant/components/ChatBot'));

function DeferredChatBot() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const win = window as IdleWindow;
    const enable = () => setEnabled(true);
    let idleHandle: number | undefined;
    const cancelIdleMount = () => {
      if (idleHandle === undefined) return;
      if (win.cancelIdleCallback) win.cancelIdleCallback(idleHandle);
      else window.clearTimeout(idleHandle);
      idleHandle = undefined;
    };
    // The widget is closed at first paint, so mounting it early only adds React
    // work and an icon chunk to the initial-load window. Wait past that window,
    // mount on the next idle slice, and skip hidden tabs. An explicit
    // pointer/key press still loads it immediately.
    const scheduleIdleMount = () => {
      if (document.visibilityState !== 'visible') return;
      idleHandle = win.requestIdleCallback
        ? win.requestIdleCallback(enable, { timeout: 3000 })
        : window.setTimeout(enable, 0);
    };
    const timer = window.setTimeout(scheduleIdleMount, 8000);
    const onInteraction = () => {
      cancelIdleMount();
      enable();
    };

    window.addEventListener('pointerdown', onInteraction, { once: true, passive: true });
    window.addEventListener('keydown', onInteraction, { once: true });
    return () => {
      window.clearTimeout(timer);
      cancelIdleMount();
      window.removeEventListener('pointerdown', onInteraction);
      window.removeEventListener('keydown', onInteraction);
    };
  }, []);

  return enabled ? <Suspense fallback={null}><ChatBot /></Suspense> : null;
}

export default function App() {
  return (
    <>
      <AppRoutes />
      <DeferredChatBot />
    </>
  );
}
