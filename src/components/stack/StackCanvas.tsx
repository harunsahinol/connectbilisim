'use client';

import { useEffect, useRef, useState } from 'react';
import { LAYERS } from '@/content/site';
import { getActiveLayer } from '@/lib/activeLayer';

// Hero ve hizmetler boyunca sabit duran WebGL tuvali. three.js ayrı bir parça olarak
// sonradan yüklenir; sayfa metni onu beklemeden görünür.
export default function StackCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const layersSection = document.getElementById('katmanlar');
    const cover = document.getElementById('topoloji');
    if (!canvas || !layersSection || !cover) return;

    const controller = new AbortController();
    let dispose: (() => void) | undefined;

    import('./scene')
      .then(({ createStackScene }) =>
        createStackScene({
          canvas,
          layersSection,
          cover,
          layers: LAYERS.map(({ tape, drawing }) => ({ tape, drawing })),
          getActiveLayer,
          monoFamily: getComputedStyle(document.documentElement).getPropertyValue('--font-martian').trim() || 'monospace',
          reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          signal: controller.signal,
          onReady: () => setReady(true),
        }),
      )
      .then((cleanup) => {
        if (controller.signal.aborted) cleanup();
        else dispose = cleanup;
      })
      .catch((err) => {
        // WebGL desteklenmiyorsa sayfa sahnesiz de eksiksiz çalışır
        console.error(err);
        setFailed(true);
      });

    return () => {
      controller.abort();
      dispose?.();
    };
  }, []);

  if (failed) return null;
  return <canvas id="stage" ref={canvasRef} aria-hidden="true" className={ready ? 'is-ready' : undefined} />;
}
