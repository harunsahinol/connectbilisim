// 3B sahne — katman yığını.
// Katmanlar izometrik bir rack gibi üst üste durur. Hizmetler bölümünde yığın açılır
// ve aktif katman bir sunucu çekmecesi gibi raftan dışarı kayar.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { LayerDrawing } from '@/content/site';
import { DRAWERS, RED, RED_LIT, TEX, drawGrid, drawTape, type DotDef } from './textures';

export interface StackSceneOptions {
  canvas: HTMLCanvasElement;
  /** Yığının açılmaya başladığı bölüm (#katmanlar) */
  layersSection: HTMLElement;
  /** Tuvali tamamen örttüğünde çizimin durduğu bölüm (#topoloji) */
  cover: HTMLElement;
  layers: { tape: string; drawing: LayerDrawing }[];
  getActiveLayer: () => number;
  /** next/font'un ürettiği Martian Mono aile adı (canvas yazıları için) */
  monoFamily: string;
  reduceMotion: boolean;
  signal: AbortSignal;
  onReady: () => void;
}

type SideLed = { side: true; z: number; r: number; kind: 'blink'; seed: number };
type AnyDot = (DotDef & { side?: false }) | SideLed;

interface LayerRig {
  obj: THREE.Group;
  face: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  outline: THREE.LineSegments<THREE.EdgesGeometry, THREE.LineBasicMaterial>;
  dots: THREE.InstancedMesh;
  dotDefs: AnyDot[];
  cursorCount: number;
  plugs: THREE.Mesh[];
  slide: number;
  focus: number;
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const damp = (a: number, b: number, k: number, dt: number) => lerp(a, b, 1 - Math.exp(-k * dt));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOutBack = (t: number) => {
  const c = 1.4;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(n: number) {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

interface Placement { fx: number; fy: number; zoom: number }
interface Layout { hero: Placement; svc: Placement; gap: number; slide: number }

// fx/fy: yığının ekran merkezine göre konumu (görüş genişliği/yüksekliği oranı)
function layoutFor(w: number, h: number): Layout {
  if (w < 760) {
    const z = Math.min(0.7, (w / h) * 1.32);
    return { hero: { fx: 0, fy: -0.16, zoom: z * 0.82 }, svc: { fx: 0, fy: 0.24, zoom: z * 0.72 }, gap: 0.5, slide: 1.1 };
  }
  if (w < 1100) {
    return { hero: { fx: 0.22, fy: 0.08, zoom: 0.86 }, svc: { fx: 0.24, fy: 0.02, zoom: 0.72 }, gap: 0.75, slide: 1.35 };
  }
  return { hero: { fx: 0.21, fy: 0.08, zoom: 1.12 }, svc: { fx: 0.2, fy: 0.02, zoom: 0.82 }, gap: 0.8, slide: 1.55 };
}

/** Sahneyi kurar ve bir temizleme fonksiyonu döndürür. WebGL yoksa hata fırlatır. */
export async function createStackScene(opts: StackSceneOptions): Promise<() => void> {
  const { canvas, layersSection, cover, getActiveLayer, monoFamily: mono, reduceMotion, signal } = opts;

  // Etiketler Martian Mono ile çiziliyor; font gelmeden dokuları üretme
  await Promise.race([
    document.fonts.load(`500 30px ${mono}`),
    new Promise((r) => setTimeout(r, 1500)),
  ]);
  if (signal.aborted) return () => {};

  const small = window.innerWidth < 760;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.75 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envTarget.texture;

  const VIEW = 10; // dikey görüş, dünya birimi
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.set(12, 9.6, 12);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8d959d, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  const KEY_OFFSET = new THREE.Vector3(-3.5, 13, -2.5);
  key.castShadow = true;
  key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  const shadowCam = key.shadow.camera;
  shadowCam.left = shadowCam.bottom = -7;
  shadowCam.right = shadowCam.top = 7;
  shadowCam.near = 1;
  shadowCam.far = 40;
  shadowCam.updateProjectionMatrix();
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 4;
  scene.add(key, key.target);

  const rig = new THREE.Group();   // ekrandaki konum
  const stack = new THREE.Group(); // dönüş
  rig.add(stack);
  scene.add(rig);

  /* ---------- ölçüler ve ortak malzemeler ---------- */
  const W = 4.2, D = 4.2, H = 0.38;
  const P = W - 0.28; // üst yüz baskı alanı
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const makeTexture = (source: HTMLCanvasElement) => {
    const tex = new THREE.CanvasTexture(source);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = aniso;
    return tex;
  };

  const slabGeo = new RoundedBoxGeometry(W, H, D, 3, 0.045);
  const slabMat = new THREE.MeshStandardMaterial({ color: 0x1c1f24, metalness: 0.55, roughness: 0.4 });
  const outlineGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(W + 0.02, H + 0.02, D + 0.02));
  const faceGeo = new THREE.PlaneGeometry(P, P);
  const dotGeo = new THREE.CircleGeometry(1, 20);

  const OFF = new THREE.Color('#2C3238');
  const ON_R = new THREE.Color(RED_LIT);
  const ON_W = new THREE.Color('#F3F5F6');
  const tmpColor = new THREE.Color();

  const rnd = mulberry32(20260928);
  const qTop = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  const qSide = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0));
  const m4 = new THREE.Matrix4();
  const v3 = new THREE.Vector3();
  const s3 = new THREE.Vector3();

  /* ---------- fiber hatları (katman fişleri bunlara bağlanır) ---------- */
  const fiberZ = [-D / 2 + 0.34, -D / 2 + 0.66];
  const fiberX = W / 2 + 0.2;
  const plugGeo = new THREE.BoxGeometry(0.2, 0.1, 0.11);

  const layers: LayerRig[] = opts.layers.map((def) => {
    const obj = new THREE.Group();

    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.castShadow = true;
    slab.receiveShadow = true;
    obj.add(slab);

    // üst yüz: katmana özgü çizim
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = faceCanvas.height = TEX;
    const dotDefs: AnyDot[] = DRAWERS[def.drawing](faceCanvas.getContext('2d')!, { rnd, mono });
    const face = new THREE.Mesh(
      faceGeo,
      new THREE.MeshBasicMaterial({ map: makeTexture(faceCanvas), transparent: true, depthWrite: false, toneMapped: false }),
    );
    face.rotation.x = -Math.PI / 2;
    face.position.y = H / 2 + 0.003;
    obj.add(face);

    // ön yüz: etiket makinesi bandı
    const tapeCanvas = drawTape(def.tape, mono);
    const tapeH = 0.2, tapeW = tapeH * (tapeCanvas.width / tapeCanvas.height);
    const tape = new THREE.Mesh(
      new THREE.PlaneGeometry(tapeW, tapeH),
      new THREE.MeshBasicMaterial({ map: makeTexture(tapeCanvas), toneMapped: false }),
    );
    tape.position.set(-W / 2 + 0.2 + tapeW / 2, 0, D / 2 + 0.004);
    obj.add(tape);

    // seçili katman çerçevesi
    const outline = new THREE.LineSegments(
      outlineGeo,
      new THREE.LineBasicMaterial({ color: RED_LIT, transparent: true, opacity: 0, toneMapped: false }),
    );
    outline.visible = false;
    obj.add(outline);

    // LED'ler: üst yüz noktaları + sağ yan yüzde durum ışıkları
    for (let k = 0; k < 5; k++) dotDefs.push({ side: true, z: 0.35 + k * 0.28, r: 0.034, kind: 'blink', seed: rnd() });
    const dots = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial({ toneMapped: false }), dotDefs.length);
    dotDefs.forEach((d, k) => {
      if (d.side) {
        v3.set(W / 2 + 0.004, 0.02, d.z);
        s3.setScalar(d.r);
        m4.compose(v3, qSide, s3);
      } else {
        v3.set((d.u - 0.5) * P, H / 2 + 0.006, (d.v - 0.5) * P);
        s3.setScalar((d.r / TEX) * P);
        m4.compose(v3, qTop, s3);
      }
      dots.setMatrixAt(k, m4);
      dots.setColorAt(k, OFF);
    });
    obj.add(dots);
    stack.add(obj);

    const plugs = fiberZ.map((z) => {
      const p = new THREE.Mesh(plugGeo, slabMat);
      p.position.set(W / 2 + 0.1, 0, z);
      p.castShadow = true;
      stack.add(p);
      return p;
    });

    return {
      obj, face, outline, dots, dotDefs, plugs,
      cursorCount: dotDefs.filter((d) => d.kind === 'cursor').length || 1,
      slide: 0,
      focus: 1,
    };
  });

  const fiberGeo = new THREE.CylinderGeometry(0.024, 0.024, 1, 10);
  const fiberMat = new THREE.MeshBasicMaterial({ color: RED, toneMapped: false });
  const fibers = fiberZ.map((z) => {
    const f = new THREE.Mesh(fiberGeo, fiberMat);
    f.position.set(fiberX, 0, z);
    stack.add(f);
    return f;
  });
  const packetGeo = new THREE.BoxGeometry(0.085, 0.22, 0.085);
  const packetMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const packets = fiberZ.flatMap((z, fi) =>
    Array.from({ length: 5 }, (_, k) => {
      const mesh = new THREE.Mesh(packetGeo, packetMat);
      mesh.position.set(fiberX, 0, z);
      stack.add(mesh);
      return { mesh, off: k / 5 + rnd() * 0.08, speed: fi ? 0.16 : 0.21 };
    }),
  );

  /* ---------- zemin: nokta ızgarası + gölge ---------- */
  const GRID = 13;
  const grid = new THREE.Mesh(
    new THREE.PlaneGeometry(GRID, GRID),
    new THREE.MeshBasicMaterial({ map: makeTexture(drawGrid(W, GRID)), transparent: true, depthWrite: false, toneMapped: false }),
  );
  grid.rotation.x = -Math.PI / 2;
  stack.add(grid);
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.ShadowMaterial({ opacity: 0.2 }));
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.receiveShadow = true;
  stack.add(shadowPlane);

  /* ---------- düzen ---------- */
  let layout = layoutFor(window.innerWidth, window.innerHeight);
  const resize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    const a = w / h;
    camera.left = (-VIEW * a) / 2;
    camera.right = (VIEW * a) / 2;
    camera.top = VIEW / 2;
    camera.bottom = -VIEW / 2;
    camera.updateProjectionMatrix();
    layout = layoutFor(w, h);
  };
  resize();

  const pointer = { x: 0, y: 0 };
  const onPointer = (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointer, { passive: true });

  /* ---------- LED animasyonları ---------- */
  const updateDots = (ly: LayerRig, t: number) => {
    ly.dotDefs.forEach((d, k) => {
      let a = 0;
      let on = ON_R;
      switch (d.kind) {
        case 'blink': {
          const seed = d.seed ?? 0;
          a = hash(Math.floor(t * 7 + seed * 40) + seed * 1000) > 0.42 ? 1 : 0.1;
          on = ON_W;
          break;
        }
        case 'steady':
          a = 0.85 + 0.15 * Math.sin(t * 2 + (d.seed ?? 0) * 6);
          on = ON_W;
          break;
        case 'cursor':
          a = d.idx === Math.floor(t * 2.4) % ly.cursorCount && Math.floor(t * 5) % 2 === 0 ? 1 : 0;
          break;
        case 'load':
          a = Math.floor(t * 3 + (d.w ?? 0)) % 3 === d.k ? 1 : 0.15;
          on = ON_W;
          break;
        case 'rec':
          a = Math.floor(t * 1.3 + (d.seed ?? 0) * 4) % 2 ? 1 : 0.12;
          break;
        case 'wave':
          a = Math.max(0, Math.sin(t * 2.1 - (d.col ?? 0) * 1.05 + (d.seed ?? 0) * 0.9)) ** 4;
          break;
      }
      if (reduceMotion && d.kind !== 'steady') a = d.kind === 'wave' ? 0.4 : 0.6;
      tmpColor.copy(OFF).lerp(on, a * (0.35 + 0.65 * ly.focus));
      ly.dots.setColorAt(k, tmpColor);
    });
    if (ly.dots.instanceColor) ly.dots.instanceColor.needsUpdate = true;
  };

  /* ---------- döngü ---------- */
  const cur = { fx: layout.hero.fx, fy: layout.hero.fy, zoom: layout.hero.zoom, gap: 0.1, rot: 0 };
  const R = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const U = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const TEASE = [3, 1, 5, 0, 4, 2].filter((i) => i < layers.length);
  const timer = new THREE.Timer();
  timer.connect(document);
  let raf = 0;
  let shown = false;

  const frame = (timestamp: number) => {
    raf = requestAnimationFrame(frame);
    timer.update(timestamp);
    const dt = Math.min(timer.getDelta(), 1 / 20);
    const t = timer.getElapsed();
    const vh = window.innerHeight;

    // Topoloji bölümü ekranı tamamen örttüyse çizme
    if (cover.getBoundingClientRect().top <= 0) {
      canvas.style.visibility = 'hidden';
      return;
    }
    canvas.style.visibility = '';

    // hero → hizmetler geçişi (0..1)
    const enter = smoothstep(0.95, 0.15, layersSection.getBoundingClientRect().top / vh);
    const active = enter > 0.6 ? getActiveLayer() : -1;

    const k = reduceMotion ? 30 : 5;
    cur.fx = damp(cur.fx, lerp(layout.hero.fx, layout.svc.fx, enter), k, dt);
    cur.fy = damp(cur.fy, lerp(layout.hero.fy, layout.svc.fy, enter), k, dt);
    cur.zoom = damp(cur.zoom, lerp(layout.hero.zoom, layout.svc.zoom, enter), k, dt);
    cur.gap = damp(cur.gap, lerp(0.1, layout.gap, enter), k, dt);

    // hero'da katmanlar sırayla hafifçe dışarı kayarak ipucu verir
    let tease = -1;
    if (!reduceMotion && enter < 0.05 && t > 2.6) {
      const cycle = (t - 2.6) / 2.4;
      if (cycle % 1 < 0.5) tease = TEASE[Math.floor(cycle) % TEASE.length];
    }

    const total = layers.length * H + (layers.length - 1) * cur.gap;
    const base = -total / 2 + H / 2;
    const floorY = -total / 2 - 0.015;

    layers.forEach((ly, i) => {
      const drop = reduceMotion ? 0 : (1 - easeOutBack(clamp((t - 0.35 - i * 0.12) / 0.85))) * 5;
      const slideTarget = active === i ? layout.slide : tease === i ? 0.5 : 0;
      ly.slide = damp(ly.slide, slideTarget, reduceMotion ? 30 : active >= 0 ? 5.5 : 3.2, dt);
      ly.focus = damp(ly.focus, active < 0 || active === i ? 1 : 0.28, 6, dt);

      const y = base + i * (H + cur.gap);
      ly.obj.position.set(0, y + drop, ly.slide);
      ly.plugs.forEach((p) => { p.position.y = y + drop; });

      ly.face.material.opacity = 0.3 + 0.7 * ly.focus;
      const o = damp(ly.outline.material.opacity, active === i ? 1 : 0, 8, dt);
      ly.outline.material.opacity = o;
      ly.outline.visible = o > 0.01;

      updateDots(ly, t);
    });

    // fiber hatları zeminden tepeye kadar uzanır
    const fiberLen = total + 0.9;
    fibers.forEach((f) => {
      f.scale.y = fiberLen;
      f.position.y = floorY + fiberLen / 2;
    });
    packets.forEach((p) => {
      const u = (p.off + (reduceMotion ? 0 : t * p.speed)) % 1;
      p.mesh.position.y = floorY + 0.12 + u * (fiberLen - 0.24);
    });

    grid.position.y = floorY;
    shadowPlane.position.y = floorY + 0.002;

    // hafif sallanma + imleç paralaksı
    const sway = reduceMotion ? 0 : Math.sin(t * 0.3) * 0.05 + pointer.x * 0.1;
    cur.rot = damp(cur.rot, sway * (1 - 0.7 * enter), 3, dt);
    stack.rotation.y = cur.rot;

    camera.zoom = cur.zoom;
    camera.updateProjectionMatrix();
    const viewW = (camera.right - camera.left) / cur.zoom;
    const viewH = VIEW / cur.zoom;
    rig.position.copy(R).multiplyScalar(cur.fx * viewW).addScaledVector(U, cur.fy * viewH);
    key.position.copy(rig.position).add(KEY_OFFSET);
    key.target.position.copy(rig.position);

    renderer.render(scene, camera);
    if (!shown) {
      shown = true;
      opts.onReady();
    }
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onPointer);
    timer.dispose();
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      const materials = mesh.material ? ([] as THREE.Material[]).concat(mesh.material) : [];
      materials.forEach((m) => {
        (m as THREE.MeshBasicMaterial).map?.dispose();
        m.dispose();
      });
    });
    envTarget.dispose();
    pmrem.dispose();
    renderer.dispose();
  };
}
