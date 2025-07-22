// components/InstallPWAButton.tsx (or directly in your page/layout)
'use client'; // If using App Router components

import React, { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const InstallPWAButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowButton(true); // Show the button when the event fires
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt(); // Show the installation prompt
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the PWA installation');
      } else {
        console.log('User dismissed the PWA installation');
      }
      setDeferredPrompt(null); // Clear the prompt
      setShowButton(false); // Hide the button after interaction
    }
  };

  if (!showButton) {
    return null; // Don't render the button if PWA is not installable or already installed/dismissed
  }

  return (
    <button
      onClick={handleInstallClick}
      style={{
        padding: '10px 20px',
        backgroundColor: '#0070f3',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold',
      }}
    >
      Install App
    </button>
  );
};

export default InstallPWAButton;