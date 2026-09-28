'use client';

import { useEffect } from 'react';

// Fontlar yüklenince <html>'e "is-loaded" ekler; hero başlığının genişleme animasyonu bununla başlar.
export default function PageReady() {
  useEffect(() => {
    const root = document.documentElement;
    const markLoaded = () => root.classList.add('is-loaded');
    document.fonts.ready.then(markLoaded);
    const fallback = window.setTimeout(markLoaded, 1600);
    return () => window.clearTimeout(fallback);
  }, []);

  return null;
}
