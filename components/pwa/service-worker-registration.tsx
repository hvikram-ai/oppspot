'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download } from 'lucide-react';

export function ServiceWorkerRegistration() {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const registerServiceWorker = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      setRegistration(reg);

      // Check for updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setIsUpdateAvailable(true);
            toast.info('A new version of oppSpot is available!', {
              duration: 0,
              action: {
                label: 'Update',
                onClick: () => updateServiceWorker()
              }
            });
          }
        });
      });

      // Check for updates every hour
      setInterval(() => {
        reg.update();
      }, 60 * 60 * 1000);

    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      return;
    }

    // Register service worker
    registerServiceWorker();

    // Handle online/offline status
    const handleOnline = () => {
      setIsOffline(false);
      toast.success('Back online! Your data is syncing...');
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast.warning('You are offline. Some features may be limited.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial status
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [registerServiceWorker]);

  const updateServiceWorker = () => {
    if (!registration?.waiting) return;

    // Tell the waiting service worker to activate
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Reload once the new service worker is active
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  };

  // Show update notification banner if update is available
  if (isUpdateAvailable) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm">
        <div className="bg-background border rounded-lg shadow-lg p-4">
          <h3 className="font-semibold mb-2">Update Available</h3>
          <p className="text-sm text-muted-foreground mb-3">
            A new version of oppSpot is ready to install
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={updateServiceWorker}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Update Now
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsUpdateAvailable(false)}
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show offline indicator
  if (isOffline) {
    return (
      <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-2 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
          <span className="text-sm font-medium">Offline Mode</span>
        </div>
      </div>
    );
  }

  return null;
}

// Install prompt component
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check for iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS && !(window as any).navigator.standalone) {
      // Show iOS install instructions after delay
      setTimeout(() => {
        if (!localStorage.getItem('ios-install-dismissed')) {
          setShowPrompt(true);
        }
      }, 30000); // 30 seconds
      return;
    }

    // Handle Chrome/Edge install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Show prompt after user has used app for a bit
      setTimeout(() => {
        if (!localStorage.getItem('install-dismissed')) {
          setShowPrompt(true);
        }
      }, 60000); // 1 minute
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Handle successful installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      toast.success('oppSpot installed successfully!');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // iOS instructions
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        toast.info(
          'To install oppSpot: Tap the share button in Safari and select "Add to Home Screen"',
          { duration: 10000 }
        );
        handleDismiss();
        return;
      }
      return;
    }

    // Show Chrome/Edge install prompt
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted install prompt');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    localStorage.setItem(isIOS ? 'ios-install-dismissed' : 'install-dismissed', 'true');
  };

  if (!showPrompt || isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-40">
      <div className="bg-background border rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Download className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Install oppSpot</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Install our app for a better experience with offline access and faster loading
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleInstall}>
                Install App
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                Not Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}