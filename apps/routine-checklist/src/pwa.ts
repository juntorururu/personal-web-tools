import { useRegisterSW } from 'virtual:pwa-register/react';

export function usePwaUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('Service worker registration failed', error);
    },
  });

  return {
    needRefresh,
    offlineReady,
    update: () => updateServiceWorker(true),
    dismissRefresh: () => setNeedRefresh(false),
    dismissOffline: () => setOfflineReady(false),
  };
}
