type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
};

let deferredPrompt: any = null;

function showInstallBanner() {
  if (!deferredPrompt) return;

  const banner = document.createElement('div');
  banner.className = 'install-banner';
  banner.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #2196F3;
    color: white;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    gap: 16px;
    z-index: 1000;
  `;
  
  const content = document.createElement('span');
  content.textContent = 'Install Time Clock for easier access';
  
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '8px';
  
  const installButton = document.createElement('button');
  installButton.textContent = 'Install';
  installButton.style.cssText = `
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    background: white;
    color: #2196F3;
    cursor: pointer;
  `;
  
  installButton.onclick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.preventDefault();
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        deferredPrompt = null;
        banner.remove();
      } catch (err) {
        console.error('Error showing install prompt:', err);
      }
    }
  };
  
  const closeButton = document.createElement('button');
  closeButton.textContent = '✕';
  closeButton.style.cssText = `
    padding: 8px;
    border: none;
    background: transparent;
    color: white;
    cursor: pointer;
  `;
  
  closeButton.onclick = () => {
    banner.remove();
    sessionStorage.setItem('installBannerDismissed', 'true');
  };
  
  buttonContainer.appendChild(installButton);
  buttonContainer.appendChild(closeButton);
  
  banner.appendChild(content);
  banner.appendChild(buttonContainer);
  
  document.body.appendChild(banner);
}

async function registerValidSW(swUrl: string, config?: Config) {
  try {
    const registration = await navigator.serviceWorker.register(swUrl);

    // Force update check immediately and periodically
    const checkForUpdates = async () => {
      try {
        await registration.update();
        
        // Handle waiting worker (could be from old version)
        if (registration.waiting) {
          // Try to activate it immediately
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          
          // Force reload after a short delay to ensure the new version takes control
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    };

    // Check for updates immediately
    checkForUpdates();
    
    // Check for updates every minute
    setInterval(checkForUpdates, 60000);

    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (installingWorker == null) {
        return;
      }

      installingWorker.onstatechange = () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New version available - force update
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          }
        }
      };
    };

    // Listen for the controllerchange event
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Reload the page when the new service worker takes control
      window.location.reload();
    });

    // Additional check for older versions
    if (registration.active) {
      // Force the active worker to check for updates
      registration.active.postMessage({ type: 'CHECK_FOR_UPDATES' });
      
      // If we have a waiting worker from an old version, activate it
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }

  } catch (error) {
    console.error('Error during service worker registration:', error);
  }
}

export function register(config?: Config) {
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;
      registerValidSW(swUrl, config);

      window.addEventListener('beforeinstallprompt', (e: Event) => {
        e.preventDefault();
        deferredPrompt = e;
        if (!sessionStorage.getItem('installBannerDismissed')) {
          showInstallBanner();
        }
      });
    });
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
      })
      .catch(error => {
        console.error(error.message);
      });
  }
}
