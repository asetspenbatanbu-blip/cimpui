import { useEffect, useState, useCallback, useRef } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __pwaDeferredPrompt?: BeforeInstallPromptEvent | null;
    __pwaInstalled?: boolean;
  }
}

export type DevicePlatform = 'android' | 'ios' | 'desktop';
export type BrowserType = 'Chrome' | 'Edge' | 'Samsung' | 'Safari' | 'Firefox' | 'Browser';

export interface InstallResult {
  status: 'accepted' | 'dismissed' | 'opened_external' | 'ios_profile_started' | 'already_installed' | 'browser_direct';
  message: string;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    typeof window !== 'undefined' ? window.__pwaDeferredPrompt || null : null
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<DevicePlatform>('android');
  const [browserName, setBrowserName] = useState<BrowserType>('Chrome');
  const [isIframe, setIsIframe] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showIOSOverlay, setShowIOSOverlay] = useState(false);
  const [showBrowserDirectOverlay, setShowBrowserDirectOverlay] = useState(false);

  // Deteksi perangkat & status PWA
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Cek apakah di dalam iframe
    const inIframe = window.self !== window.top;
    setIsIframe(inIframe);

    // 2. Cek apakah sudah terpasang (Standalone / PWA mode)
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      const isAndroidReferrer = document.referrer.includes('android-app://');
      const isParamStandalone = window.location.search.includes('standalone=true');
      return isStandaloneMedia || isIOSStandalone || isAndroidReferrer || isParamStandalone || !!window.__pwaInstalled;
    };
    setIsInstalled(checkStandalone());

    // 3. Deteksi Platform & Browser
    const ua = window.navigator.userAgent.toLowerCase();
    let detectedPlatform: DevicePlatform = 'desktop';
    let detectedBrowser: BrowserType = 'Browser';

    if (/iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: boolean }).MSStream) {
      detectedPlatform = 'ios';
    } else if (/android/.test(ua)) {
      detectedPlatform = 'android';
    } else {
      detectedPlatform = 'desktop';
    }

    if (/samsungbrowser/.test(ua)) {
      detectedBrowser = 'Samsung';
    } else if (/edg/i.test(ua)) {
      detectedBrowser = 'Edge';
    } else if (/chrome|crios/i.test(ua) && !/edg/i.test(ua)) {
      detectedBrowser = 'Chrome';
    } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
      detectedBrowser = 'Safari';
    } else if (/firefox|fxios/i.test(ua)) {
      detectedBrowser = 'Firefox';
    }

    setPlatform(detectedPlatform);
    setBrowserName(detectedBrowser);

    // 4. Sinkronisasi prompt jika sudah ada di window.__pwaDeferredPrompt
    if (window.__pwaDeferredPrompt) {
      setDeferredPrompt(window.__pwaDeferredPrompt);
    }

    // Listener prompt browser
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__pwaDeferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handlePromptReady = (e: any) => {
      if (e.detail) {
        setDeferredPrompt(e.detail);
      } else if (window.__pwaDeferredPrompt) {
        setDeferredPrompt(window.__pwaDeferredPrompt);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      window.__pwaInstalled = true;
      window.__pwaDeferredPrompt = null;
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('pwa-deferred-prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-installed', handleAppInstalled);

    // 5. Cek jika URL memiliki instruksi auto-install (?autoInstall=1 atau ?install=auto)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autoInstall') === '1' || urlParams.get('autoInstall') === 'true' || urlParams.get('install') === 'auto') {
      // Tunggu sebentar agar event prompt siap lalu trigger otomatis
      const timer = setTimeout(() => {
        if (window.__pwaDeferredPrompt) {
          window.__pwaDeferredPrompt.prompt().catch(() => {});
        }
      }, 700);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('pwa-deferred-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-installed', handleAppInstalled);
    };
  }, []);

  // Download WebClip profile khusus iOS agar pengguna bisa memasang langsung
  const triggerIOSProfileDownload = useCallback(() => {
    const origin = window.location.origin;
    const profileXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>FullScreen</key>
            <true/>
            <key>IsRemovable</key>
            <true/>
            <key>Label</key>
            <string>MamaRaraLita</string>
            <key>PayloadDescription</key>
            <string>Aplikasi Dapur Mama RaraLita</string>
            <key>PayloadDisplayName</key>
            <string>Dapur Mama RaraLita</string>
            <key>PayloadIdentifier</key>
            <string>com.dapurmamararalita.webclip</string>
            <key>PayloadType</key>
            <string>com.apple.webClip.managed</string>
            <key>PayloadUUID</key>
            <string>56a15e61-9c6d-4f11-9a74-d477813a3642</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>Precomposed</key>
            <true/>
            <key>URL</key>
            <string>${origin}/</string>
        </dict>
    </array>
    <key>PayloadDescription</key>
    <string>Pasang aplikasi Dapur Mama RaraLita ke Layar Utama iPhone / iPad Anda.</string>
    <key>PayloadDisplayName</key>
    <string>Dapur Mama RaraLita</string>
    <key>PayloadIdentifier</key>
    <string>com.dapurmamararalita.profile</string>
    <key>PayloadOrganization</key>
    <string>Dapur Mama RaraLita</string>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>a7891234-5678-4321-abcd-ef0123456789</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;

    try {
      const blob = new Blob([profileXml], { type: 'application/x-apple-aspen-config' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'DapurMamaRaraLita.mobileconfig';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch (e) {
      console.warn('Gagal unduh profil iOS:', e);
    }
  }, []);

  // Fungsi utama: Mulai Instalasi Otomatis sesuai perangkat yang terdeteksi
  const triggerAutomaticInstall = useCallback(async (): Promise<InstallResult> => {
    setIsProcessing(true);

    try {
      // 1. Sudah terinstal
      if (isInstalled) {
        setIsProcessing(false);
        return {
          status: 'already_installed',
          message: 'Aplikasi Dapur Mama RaraLita sudah terpasang aktif di perangkat ini!'
        };
      }

      // 2. Prompt native PWA sudah siap (Chrome Android / Edge / Chrome Desktop / Samsung)
      const activePrompt = deferredPrompt || window.__pwaDeferredPrompt;
      if (activePrompt) {
        await activePrompt.prompt();
        const choice = await activePrompt.userChoice;
        setIsProcessing(false);

        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          window.__pwaInstalled = true;
          window.__pwaDeferredPrompt = null;
          setDeferredPrompt(null);
          return {
            status: 'accepted',
            message: 'Aplikasi berhasil dipasang ke layar utama perangkat Anda!'
          };
        } else {
          return {
            status: 'dismissed',
            message: 'Pemasangan aplikasi dibatalkan.'
          };
        }
      }

      // 4. Perangkat iOS (iPhone / iPad)
      if (platform === 'ios') {
        // Otomatis unduh profil WebClip Apple dan tampilkan penunjuk interaktif
        triggerIOSProfileDownload();
        setShowIOSOverlay(true);
        setIsProcessing(false);
        return {
          status: 'ios_profile_started',
          message: 'Memulai pemasangan otomatis untuk iPhone / iPad...'
        };
      }

      // 5. Jika di Android / Desktop namun prompt sedang dimuat, tunggu toleransi 2 detik
      const promptAvailable = await new Promise<BeforeInstallPromptEvent | null>((resolve) => {
        let count = 0;
        const interval = setInterval(() => {
          count++;
          if (window.__pwaDeferredPrompt) {
            clearInterval(interval);
            resolve(window.__pwaDeferredPrompt);
          } else if (count >= 10) {
            clearInterval(interval);
            resolve(null);
          }
        }, 200);
      });

      if (promptAvailable) {
        setDeferredPrompt(promptAvailable);
        await promptAvailable.prompt();
        const choice = await promptAvailable.userChoice;
        setIsProcessing(false);

        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          window.__pwaInstalled = true;
          return {
            status: 'accepted',
            message: 'Aplikasi berhasil dipasang ke layar utama perangkat Anda!'
          };
        } else {
          return {
            status: 'dismissed',
            message: 'Pemasangan aplikasi dibatalkan.'
          };
        }
      }

      // 6. Jika browser tidak mengekspos prompt (misal pengguna sudah pernah tolak sebelumnya atau di browser tertentu)
      // Tampilkan asisten langsung aksi 1-langkah
      setIsProcessing(false);
      setShowBrowserDirectOverlay(true);
      return {
        status: 'browser_direct',
        message: `Mengarahkan pemasangan di browser ${browserName}...`
      };
    } catch (err: any) {
      console.warn('Gagal memicu instalasi otomatis:', err);
      setIsProcessing(false);
      setShowBrowserDirectOverlay(true);
      return {
        status: 'browser_direct',
        message: 'Silakan konfirmasi pemasangan di peramban Anda.'
      };
    }
  }, [deferredPrompt, isIframe, isInstalled, platform, browserName, triggerIOSProfileDownload]);

  return {
    isInstallable: !!deferredPrompt || isIframe || platform === 'ios',
    isInstalled,
    platform,
    browserName,
    isIframe,
    isProcessing,
    showIOSOverlay,
    setShowIOSOverlay,
    showBrowserDirectOverlay,
    setShowBrowserDirectOverlay,
    triggerAutomaticInstall,
    triggerIOSProfileDownload,
  };
}
