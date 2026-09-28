'use client';

import { useEffect, useState } from 'react';
import Brand from './Brand';

const LINKS = [
  { href: '#katmanlar', label: 'Hizmetler' },
  { href: '#topoloji', label: 'Neden biz' },
  { href: '#surec', label: 'Süreç' },
  { href: '#iletisim', label: 'İletişim' },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const sync = () => setScrolled(window.scrollY > 16);
    sync();
    window.addEventListener('scroll', sync, { passive: true });
    return () => window.removeEventListener('scroll', sync);
  }, []);

  return (
    <header className={`nav${scrolled ? ' is-scrolled' : ''}`}>
      <div className="wrap nav-inner">
        <Brand />
        <nav aria-label="Ana menü">
          <ul className="nav-links">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <a className="btn btn-red btn-sm" href="#iletisim">Proje başlat</a>
      </div>
    </header>
  );
}
