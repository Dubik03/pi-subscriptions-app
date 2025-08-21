// pages/service/[id].tsx
import { useEffect } from 'react';

export default function ServiceDetail() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://sdk.minepi.com/pi-sdk.js'; // Uprav podle skutečné URL Pi SDK
    script.async = true;
    script.onload = () => {
      console.log('Pi SDK loaded');
      // Inicializace Pi SDK, pokud je potřeba
    };
    script.onerror = () => {
      console.error('Failed to load Pi SDK');
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Zbytek komponenty...
}
