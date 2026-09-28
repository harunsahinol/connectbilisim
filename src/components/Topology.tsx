'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { LAYERS, layerCountWord } from '@/content/site';

type Anchor = 'start' | 'middle' | 'end';
interface Point { x: number; y: number }
interface Label extends Point { anchor: Anchor }

const round = (n: number) => Math.round(n * 10) / 10;
const polar = (cx: number, cy: number, r: number, deg: number): Point => ({
  x: round(cx + r * Math.cos((deg * Math.PI) / 180)),
  y: round(cy + r * Math.sin((deg * Math.PI) / 180)),
});

// Örgü: siz + her katman için ayrı bir tedarikçi, herkes herkesle konuşuyor
const MESH_NAMES = ['Siz', ...LAYERS.map((l) => l.vendor)];
const MESH_NODES = MESH_NAMES.map((_, k) => polar(200, 160, 112, -90 + (k * 360) / MESH_NAMES.length));
const MESH_LINKS = MESH_NODES.flatMap((a, i) => MESH_NODES.slice(i + 1).map((b) => ({ a, b, you: i === 0 })));
const MESH_LABELS: Label[] = MESH_NODES.map((p, k) => {
  if (k === 0) return { x: p.x, y: p.y - 22, anchor: 'middle' };
  const dx = (p.x - 200) / 112;
  if (dx > 0.2) return { x: p.x + 14, y: p.y + 4, anchor: 'start' };
  if (dx < -0.2) return { x: p.x - 14, y: p.y + 4, anchor: 'end' };
  return { x: p.x, y: p.y + 26, anchor: 'middle' };
});

// Yıldız: siz → Connect → katmanlar
const HUB: Point = { x: 200, y: 142 };
const STAR_ANGLES = LAYERS.map((_, i) => 10 + (i * 160) / Math.max(1, LAYERS.length - 1));
const STAR_NODES = STAR_ANGLES.map((a) => polar(HUB.x, HUB.y, 110, a));
const STAR_LABELS: Label[] = STAR_NODES.map((p, i) => {
  const a = STAR_ANGLES[i];
  if (a < 60) return { x: p.x + 14, y: p.y + (a > 30 ? 10 : 4), anchor: 'start' };
  if (a > 120) return { x: p.x - 14, y: p.y + (a < 150 ? 10 : 4), anchor: 'end' };
  return { x: p.x, y: p.y + 26, anchor: 'middle' };
});

const linkStyle = (i: number) => ({ '--i': i }) as CSSProperties;

function useReveal<T extends Element>() {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShown(true);
        io.disconnect();
      }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, shown] as const;
}

export default function Topology() {
  const [meshRef, meshShown] = useReveal<HTMLElement>();
  const [starRef, starShown] = useReveal<HTMLElement>();

  return (
    <section className="topo on-dark" id="topoloji" aria-labelledby="topo-title">
      <div className="wrap">
        <p className="eyebrow mono">Neden tek ekip</p>
        <h2 className="h2" id="topo-title">
          {layerCountWord} tedarikçi yerine tek bağlantı noktası.
        </h2>
        <p className="topo-lead">
          Kameracı ağı, ağcı sunucuyu, sunucucu yazılımı suçlar. Hepsini aynı ekip kurduğunda sorunun kimde olduğu
          tartışılmaz; doğrudan çözülür.
        </p>

        <div className="topo-grid">
          <figure ref={meshRef} className={`topo-card${meshShown ? ' is-in' : ''}`}>
            <figcaption className="topo-cap">
              <span className="mono">Bugün · örgü topoloji</span>
              <span className="topo-num">
                {MESH_LINKS.length}
                <small className="mono">iletişim hattı</small>
              </span>
            </figcaption>
            <svg
              className="topo-svg"
              viewBox="-40 0 480 310"
              role="img"
              aria-label={`Siz ve ${LAYERS.length} ayrı tedarikçi arasında birbirine dolanmış ${MESH_LINKS.length} bağlantı`}
            >
              <g>
                {MESH_LINKS.map(({ a, b, you }, i) => (
                  <line
                    key={i}
                    className={`link${you ? ' link-you' : ''}`}
                    pathLength={1}
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    style={linkStyle(i)}
                  />
                ))}
              </g>
              {MESH_NODES.map((p, k) => (
                <circle key={k} className={`node${k === 0 ? ' node-you' : ''}`} cx={p.x} cy={p.y} r={k === 0 ? 8 : 6} />
              ))}
              {MESH_LABELS.map((l, k) => (
                <text key={k} x={l.x} y={l.y} textAnchor={l.anchor} className={k === 0 ? 't-you' : undefined}>
                  {MESH_NAMES[k]}
                </text>
              ))}
            </svg>
          </figure>

          <figure ref={starRef} className={`topo-card is-star${starShown ? ' is-in' : ''}`}>
            <figcaption className="topo-cap">
              <span className="mono">Connect ile · yıldız topoloji</span>
              <span className="topo-num">
                1<small className="mono">muhatap</small>
              </span>
            </figcaption>
            <svg
              className="topo-svg"
              viewBox="-40 0 480 310"
              role="img"
              aria-label={`Siz tek bir hatla Connect'e, Connect ${LAYERS.length} katmana bağlı`}
            >
              <line className="link link-main" pathLength={1} x1={HUB.x} y1={46} x2={HUB.x} y2={HUB.y - 14} style={linkStyle(0)} />
              {STAR_NODES.map((p, i) => (
                <line key={i} className="link" pathLength={1} x1={HUB.x} y1={HUB.y} x2={p.x} y2={p.y} style={linkStyle(i + 1)} />
              ))}
              <circle className="node node-you" cx={HUB.x} cy={40} r={8} />
              <rect className="hub" x={HUB.x - 16} y={HUB.y - 16} width={32} height={32} />
              {STAR_NODES.map((p, i) => (
                <rect key={i} className="node" x={round(p.x - 6)} y={round(p.y - 6)} width={12} height={12} />
              ))}
              <text x={HUB.x + 16} y={44} className="t-you">Siz</text>
              <text x={HUB.x + 28} y={HUB.y + 4} className="t-hub">Connect</text>
              {STAR_LABELS.map((l, i) => (
                <text key={i} x={l.x} y={l.y} textAnchor={l.anchor}>
                  {LAYERS[i].short}
                </text>
              ))}
            </svg>
          </figure>
        </div>
      </div>
    </section>
  );
}
