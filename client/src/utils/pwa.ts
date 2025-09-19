// PWA Utility Functions

interface PWAInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: PWAInstallPromptEvent | null = null;

// Register service worker
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully:', registration);
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available
              showUpdateNotification();
            }
          });
        }
      });
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

// Handle install prompt
export const handleInstallPrompt = () => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as PWAInstallPromptEvent;
    
    // Show install button or notification
    showInstallPrompt();
  });
};

// Show install prompt
export const showInstallPrompt = () => {
  if (deferredPrompt) {
    // You can show a custom install button here
    const installButton = document.getElementById('install-button');
    if (installButton) {
      installButton.style.display = 'block';
      installButton.addEventListener('click', async () => {
        deferredPrompt?.prompt();
        const { outcome } = await deferredPrompt?.userChoice || { outcome: 'dismissed' };
        if (outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        deferredPrompt = null;
        installButton.style.display = 'none';
      });
    }
  }
};

// Show update notification
export const showUpdateNotification = () => {
  const updateNotification = document.createElement('div');
  updateNotification.className = 'fixed top-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg z-50';
  updateNotification.innerHTML = `
    <div class="flex items-center space-x-2">
      <span>Yeni güncelleme mevcut!</span>
      <button id="update-button" class="bg-white text-blue-500 px-3 py-1 rounded text-sm font-medium">
        Güncelle
      </button>
      <button id="close-update" class="text-white hover:text-gray-200">
        ×
      </button>
    </div>
  `;
  
  document.body.appendChild(updateNotification);
  
  document.getElementById('update-button')?.addEventListener('click', () => {
    window.location.reload();
  });
  
  document.getElementById('close-update')?.addEventListener('click', () => {
    updateNotification.remove();
  });
};

// Check if app is installed
export const isAppInstalled = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission === 'denied') {
    console.log('Notification permission denied');
    return false;
  }
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

// Send notification
export const sendNotification = (title: string, options?: NotificationOptions) => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/tofaslogo.png',
      badge: '/tofaslogo.png',
      ...options
    });
  }
};

// Background sync
export const registerBackgroundSync = async (tag: string) => {
  if ('serviceWorker' in navigator && 'sync' in (window.ServiceWorkerRegistration.prototype as any)) {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register(tag);
  }
};

// Offline storage utilities
export const storeOfflineAction = async (action: {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
}) => {
  try {
    const offlineActions = JSON.parse(localStorage.getItem('offlineActions') || '[]');
    offlineActions.push(action);
    localStorage.setItem('offlineActions', JSON.stringify(offlineActions));
  } catch (error) {
    console.error('Failed to store offline action:', error);
  }
};

export const getOfflineActions = (): any[] => {
  try {
    return JSON.parse(localStorage.getItem('offlineActions') || '[]');
  } catch (error) {
    console.error('Failed to get offline actions:', error);
    return [];
  }
};

export const removeOfflineAction = (id: string) => {
  try {
    const offlineActions = getOfflineActions();
    const filteredActions = offlineActions.filter(action => action.id !== id);
    localStorage.setItem('offlineActions', JSON.stringify(filteredActions));
  } catch (error) {
    console.error('Failed to remove offline action:', error);
  }
};

// Network status
export const isOnline = (): boolean => {
  return navigator.onLine;
};

export const onNetworkStatusChange = (callback: (online: boolean) => void) => {
  window.addEventListener('online', () => callback(true));
  window.addEventListener('offline', () => callback(false));
};

// App lifecycle
export const onAppInstalled = (callback: () => void) => {
  window.addEventListener('appinstalled', callback);
};

export const onAppUpdate = (callback: () => void) => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', callback);
  }
};

// PWA Install Component Hook
export const usePWAInstall = () => {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(isAppInstalled());

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as PWAInstallPromptEvent;
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('App installed successfully');
      }
      deferredPrompt = null;
      setCanInstall(false);
    }
  };

  return { canInstall, isInstalled, installApp };
};

// Import React hooks
import { useState, useEffect } from 'react';