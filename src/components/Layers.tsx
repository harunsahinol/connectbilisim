'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { LAYERS, layerCountWord } from '@/content/site';
import { getActiveLayer, setActiveLayer, subscribeActiveLayer } from '@/lib/activeLayer';

export default function Layers() {
  const refs = useRef<(HTMLElement | null)[]>([]);
  const active = useSyncExternalStore(subscribeActiveLayer, getActiveLayer, () => -1);

  // Ekranın dikey ortasından geçen katman aktif sayılır; 3B sahne de aynı değeri okur
  useEffect(() => {
    const sync = () => {
      const mid = window.innerHeight * 0.5;
      const next = refs.current.findIndex((el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.top <= mid && r.bottom > mid;
      });
      setActiveLayer(next);
    };
    sync();
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    // Fontlar yüklenip metin yeniden dizildiğinde kaydırma olmadan da konumlar değişir
    const ro = new ResizeObserver(sync);
    ro.observe(document.body);
    return () => {
      window.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      ro.disconnect();
      setActiveLayer(-1);
    };
  }, []);

  const total = LAYERS.length;

  return (
    <section className="layers" id="katmanlar" aria-labelledby="layers-title">
      <div className="wrap">
        <div className="layers-col">
          <header className="layers-head">
            <p className="eyebrow mono">Hizmetler</p>
            <h2 className="h2" id="layers-title">
              {layerCountWord} katman,
              <br />
              alttan üste.
            </h2>
            <p className="layers-intro">
              Her hizmet bir öncekinin üzerine oturur: kameralar ağın, yazılım sunucunun, yapay zekâ hepsinin üzerinde
              çalışır. Aşağı kaydırın, katmanları tek tek raftan çekelim.
            </p>
          </header>

          {LAYERS.map((layer, i) => (
            <article
              key={layer.id}
              id={layer.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              className={`layer${active === i ? ' is-active' : ''}`}
            >
              <div className="layer-card">
                <p className="layer-id mono">
                  <b>{layer.code}</b> Katman {i + 1} / {total}
                </p>
                <h3>{layer.title}</h3>
                <p>{layer.lead}</p>
                <ul>
                  {layer.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="layer-tags mono">
                  {layer.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
