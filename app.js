import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const smoothstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOutBack = (t) => { const c = 1.4; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };

/* ======================================================================
   Sayfa davranışları
   ====================================================================== */

const nav = document.querySelector('.nav');
const syncNav = () => nav.classList.toggle('is-scrolled', window.scrollY > 16);
addEventListener('scroll', syncNav, { passive: true });
syncNav();

const markLoaded = () => root.classList.add('is-loaded');
document.fonts.ready.then(markLoaded);
setTimeout(markLoaded, 1600);

// Aktif katman: ekranın ortasından geçen blok
const layerEls = [...document.querySelectorAll('.layer')];
let activeLayer = -1;
function syncActiveLayer() {
  const mid = innerHeight * 0.5;
  let next = -1;
  layerEls.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    if (r.top <= mid && r.bottom > mid) next = i;
  });
  if (next !== activeLayer) {
    activeLayer = next;
    layerEls.forEach((el, i) => el.classList.toggle('is-active', i === next));
  }
}
addEventListener('scroll', syncActiveLayer, { passive: true });
addEventListener('resize', syncActiveLayer);
syncActiveLayer();

// Topoloji diyagramları görünür olunca bağlantılarını çizer
document.querySelectorAll('.topo-svg').forEach((svg) => {
  svg.querySelectorAll('.link').forEach((line, i) => line.style.setProperty('--i', i));
});
const revealer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.add('is-in');
    revealer.unobserve(entry.target);
  }
}, { threshold: 0.3 });
document.querySelectorAll('[data-reveal]').forEach((el) => revealer.observe(el));

// İletişim formu — tasarım önizlemesi, henüz bir sunucuya bağlı değil
const form = document.querySelector('.contact-form');
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  form.querySelector('.form-status').textContent =
    'Önizleme sürümü: form henüz bir e-posta hesabına bağlı değil.';
});

/* ======================================================================
   3B sahne — katman yığını
   Altı katman (ağ → kamera → sistem → yazılım → web → yapay zekâ) izometrik bir
   rack gibi üst üste durur. Hizmetler bölümünde yığın açılır ve aktif
   katman bir sunucu çekmecesi gibi raftan dışarı kayar.
   ====================================================================== */

const stage = document.getElementById('stage');
const layersSection = document.getElementById('katmanlar');
const cover = document.getElementById('topoloji');

initStage().catch((err) => {
  console.error(err);
  root.classList.add('no-webgl');
});

async function initStage() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: stage, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    root.classList.add('no-webgl');
    return;
  }

  const small = innerWidth < 760;
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.75 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  // Etiketler Martian Mono ile çiziliyor; font gelmeden dokuları üretme
  await Promise.race([
    document.fonts.load('500 30px "Martian Mono"'),
    new Promise((r) => setTimeout(r, 1500)),
  ]);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const VIEW = 10; // dikey görüş, dünya birimi
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.set(12, 9.6, 12);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();

  const hemi = new THREE.HemisphereLight(0xffffff, 0x8d959d, 0.7);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  const KEY_OFFSET = new THREE.Vector3(-3.5, 13, -2.5);
  key.castShadow = true;
  key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 40 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key, key.target);

  const rig = new THREE.Group();   // ekrandaki konum
  const stack = new THREE.Group(); // dönüş
  rig.add(stack);
  scene.add(rig);

  /* ---------- ölçüler ve ortak malzemeler ---------- */
  const W = 4.2, D = 4.2, H = 0.38;
  const P = W - 0.28;            // üst yüz baskı alanı
  const TEX = 1024;
  const RED = '#E1141C';        // marka kırmızısı (etiket bandı, fiber hatları)
  const RED_LIT = '#FF4B45';    // koyu yüzey üstünde parlayan kırmızı
  const MONO = '"Martian Mono", ui-monospace, monospace';
  const ink = (a) => `rgba(228,231,234,${a})`;
  const aniso = renderer.capabilities.getMaxAnisotropy();

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

  const LAYERS = [
    { tape: 'L1 · AĞ ALTYAPISI', draw: drawNetwork },
    { tape: 'L2 · KAMERA', draw: drawCamera },
    { tape: 'L3 · SİSTEM', draw: drawSystem },
    { tape: 'L4 · YAZILIM', draw: drawCode },
    { tape: 'L5 · WEB', draw: drawWeb },
    { tape: 'L6 · YAPAY ZEKÂ', draw: drawAI },
  ];

  const qTop = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  const qSide = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0));
  const m4 = new THREE.Matrix4();
  const v3 = new THREE.Vector3();
  const s3 = new THREE.Vector3();

  const layers = LAYERS.map((def, i) => {
    const obj = new THREE.Group();

    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.castShadow = true;
    slab.receiveShadow = true;
    obj.add(slab);

    // üst yüz: katmana özgü çizim (patch panel, rack, kod, tarayıcı, sinir ağı)
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = TEX;
    const ctx = canvas.getContext('2d');
    const dotDefs = def.draw(ctx);
    const faceTex = new THREE.CanvasTexture(canvas);
    faceTex.colorSpace = THREE.SRGBColorSpace;
    faceTex.anisotropy = aniso;
    const face = new THREE.Mesh(faceGeo, new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, depthWrite: false, toneMapped: false }));
    face.rotation.x = -Math.PI / 2;
    face.position.y = H / 2 + 0.003;
    obj.add(face);

    // ön yüz: etiket makinesi bandı
    const tape = makeTape(def.tape);
    tape.position.set(-W / 2 + 0.2 + tape.userData.w / 2, 0, D / 2 + 0.004);
    obj.add(tape);

    // seçili katman çerçevesi
    const outline = new THREE.LineSegments(outlineGeo, new THREE.LineBasicMaterial({ color: RED_LIT, transparent: true, opacity: 0, toneMapped: false }));
    outline.visible = false;
    obj.add(outline);

    // LED'ler: üst yüz noktaları + sağ yan yüzde durum ışıkları
    const sideLeds = Array.from({ length: 5 }, (_, k) => ({ side: true, z: 0.35 + k * 0.28, r: 0.034, kind: 'blink', seed: rnd() }));
    const allDots = [...dotDefs, ...sideLeds];
    const dots = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial({ toneMapped: false }), allDots.length);
    allDots.forEach((d, k) => {
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
    return { obj, face, outline, dots, dotDefs: allDots, slide: 0, focus: 1, index: i };
  });

  /* ---------- fiber hatları ve paketler ---------- */
  const fiberMat = new THREE.MeshBasicMaterial({ color: RED, toneMapped: false });
  const fiberGeo = new THREE.CylinderGeometry(0.024, 0.024, 1, 10);
  const plugGeo = new THREE.BoxGeometry(0.2, 0.1, 0.11);
  const fiberZ = [-D / 2 + 0.34, -D / 2 + 0.66];
  const fiberX = W / 2 + 0.2;
  const fibers = fiberZ.map((z) => {
    const f = new THREE.Mesh(fiberGeo, fiberMat);
    f.position.set(fiberX, 0, z);
    stack.add(f);
    return f;
  });
  const plugs = layers.map(() => fiberZ.map((z) => {
    const p = new THREE.Mesh(plugGeo, slabMat);
    p.position.set(W / 2 + 0.1, 0, z);
    p.castShadow = true;
    stack.add(p);
    return p;
  }));
  const packetGeo = new THREE.BoxGeometry(0.085, 0.22, 0.085);
  const packetMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const packets = [];
  fiberZ.forEach((z, fi) => {
    for (let k = 0; k < 5; k++) {
      const m = new THREE.Mesh(packetGeo, packetMat);
      m.position.set(fiberX, 0, z);
      stack.add(m);
      packets.push({ mesh: m, off: k / 5 + rnd() * 0.08, speed: fi ? 0.16 : 0.21 });
    }
  });

  /* ---------- zemin: nokta ızgarası + gölge ---------- */
  const grid = new THREE.Mesh(
    new THREE.PlaneGeometry(13, 13),
    new THREE.MeshBasicMaterial({ map: makeGridTexture(), transparent: true, depthWrite: false, toneMapped: false })
  );
  grid.rotation.x = -Math.PI / 2;
  stack.add(grid);
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.ShadowMaterial({ opacity: 0.2 }));
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.receiveShadow = true;
  stack.add(shadowPlane);

  /* ---------- düzen ---------- */
  function layoutFor(w, h) {
    const aspect = w / h;
    if (w < 760) {
      const z = Math.min(0.7, aspect * 1.32);
      return { hero: { fx: 0, fy: -0.16, zoom: z * 0.82 }, svc: { fx: 0, fy: 0.24, zoom: z * 0.72 }, gap: 0.5, slide: 1.1 };
    }
    if (w < 1100) {
      return { hero: { fx: 0.22, fy: 0.08, zoom: 0.86 }, svc: { fx: 0.24, fy: 0.02, zoom: 0.72 }, gap: 0.75, slide: 1.35 };
    }
    return { hero: { fx: 0.21, fy: 0.08, zoom: 1.12 }, svc: { fx: 0.2, fy: 0.02, zoom: 0.82 }, gap: 0.8, slide: 1.55 };
  }

  let layout = layoutFor(innerWidth, innerHeight);
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    const a = w / h;
    camera.left = (-VIEW * a) / 2;
    camera.right = (VIEW * a) / 2;
    camera.top = VIEW / 2;
    camera.bottom = -VIEW / 2;
    camera.updateProjectionMatrix();
    layout = layoutFor(w, h);
  }
  resize();
  addEventListener('resize', resize);

  const pointer = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / innerWidth - 0.5) * 2;
    pointer.y = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  /* ---------- döngü ---------- */
  const cur = { fx: layout.hero.fx, fy: layout.hero.fy, zoom: layout.hero.zoom, gap: 0.1, rot: 0 };
  const R = new THREE.Vector3(), U = new THREE.Vector3();
  R.setFromMatrixColumn(camera.matrixWorld, 0);
  U.setFromMatrixColumn(camera.matrixWorld, 1);
  const TEASE = [3, 1, 5, 0, 4, 2];
  const clock = new THREE.Clock();
  let shown = false;

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 1 / 20);
    const t = clock.elapsedTime;
    const vh = innerHeight;

    // Topoloji bölümü ekranı tamamen örttüyse çizme
    if (cover.getBoundingClientRect().top <= 0) {
      stage.style.visibility = 'hidden';
      return;
    }
    stage.style.visibility = '';

    // hero → hizmetler geçişi (0..1)
    const enter = smoothstep(0.95, 0.15, layersSection.getBoundingClientRect().top / vh);
    const active = enter > 0.6 ? activeLayer : -1;

    const target = {
      fx: lerp(layout.hero.fx, layout.svc.fx, enter),
      fy: lerp(layout.hero.fy, layout.svc.fy, enter),
      zoom: lerp(layout.hero.zoom, layout.svc.zoom, enter),
      gap: lerp(0.1, layout.gap, enter),
    };
    const k = reduceMotion ? 30 : 5;
    cur.fx = damp(cur.fx, target.fx, k, dt);
    cur.fy = damp(cur.fy, target.fy, k, dt);
    cur.zoom = damp(cur.zoom, target.zoom, k, dt);
    cur.gap = damp(cur.gap, target.gap, k, dt);

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
      plugs[i].forEach((p) => { p.position.y = y + drop; });

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
      stage.classList.add('is-ready');
    }
  }
  requestAnimationFrame(frame);

  /* ---------- LED animasyonları ---------- */
  function updateDots(ly, t) {
    const n = ly.dotDefs.length;
    const cursorCount = ly.dotDefs.filter((d) => d.kind === 'cursor').length || 1;
    ly.dotDefs.forEach((d, k) => {
      let a = 0, on = ON_R;
      switch (d.kind) {
        case 'blink': {
          const step = Math.floor(t * 7 + d.seed * 40);
          a = hash(step + d.seed * 1000) > 0.42 ? 1 : 0.1;
          on = ON_W;
          break;
        }
        case 'steady':
          a = 0.85 + 0.15 * Math.sin(t * 2 + d.seed * 6);
          on = ON_W;
          break;
        case 'cursor':
          a = d.idx === Math.floor(t * 2.4) % cursorCount && Math.floor(t * 5) % 2 === 0 ? 1 : 0;
          break;
        case 'load':
          a = Math.floor(t * 3 + d.w) % 3 === d.k ? 1 : 0.15;
          on = ON_W;
          break;
        case 'rec':
          a = Math.floor(t * 1.3 + d.seed * 4) % 2 ? 1 : 0.12;
          break;
        case 'wave':
          a = Math.max(0, Math.sin(t * 2.1 - d.col * 1.05 + d.seed * 0.9)) ** 4;
          break;
      }
      if (reduceMotion && d.kind !== 'steady') a = d.kind === 'wave' ? 0.4 : 0.6;
      tmpColor.copy(OFF).lerp(on, a * (0.35 + 0.65 * ly.focus));
      ly.dots.setColorAt(k, tmpColor);
    });
    if (n) ly.dots.instanceColor.needsUpdate = true;
  }

  /* ---------- dokular ---------- */

  function makeTape(text) {
    const hPx = 80;
    const c = document.createElement('canvas');
    const cx = c.getContext('2d');
    const font = `600 32px ${MONO}`;
    cx.font = font;
    const wPx = Math.ceil(cx.measureText(text).width + 48);
    c.width = wPx;
    c.height = hPx;
    cx.fillStyle = RED;
    cx.fillRect(0, 0, wPx, hPx);
    cx.fillStyle = '#FFFFFF';
    cx.font = font;
    cx.textBaseline = 'middle';
    cx.fillText(text, 24, hPx / 2 + 2);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = aniso;
    const h = 0.2, w = h * (wPx / hPx);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    mesh.userData.w = w;
    return mesh;
  }

  function makeGridTexture() {
    const S = 1024, step = 32;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const cx = c.getContext('2d');
    for (let y = step / 2; y < S; y += step) {
      for (let x = step / 2; x < S; x += step) {
        const d = Math.hypot(x - S / 2, y - S / 2) / (S / 2);
        const a = 0.42 * (1 - smoothstep(0.35, 0.95, d));
        if (a <= 0.01) continue;
        cx.fillStyle = `rgba(17,19,22,${a})`;
        cx.fillRect(x - 2, y - 2, 4, 4);
      }
    }
    // yığının ayak izi için kesim işaretleri
    const fp = (W / 13) * S, o = (S - fp) / 2 - 22, e = o + fp + 44, L = 30;
    cx.strokeStyle = 'rgba(17,19,22,0.55)';
    cx.lineWidth = 3;
    [[o, o, 1, 1], [e, o, -1, 1], [o, e, 1, -1], [e, e, -1, -1]].forEach(([x, y, sx, sy]) => {
      cx.beginPath();
      cx.moveTo(x + sx * L, y); cx.lineTo(x, y); cx.lineTo(x, y + sy * L);
      cx.stroke();
    });
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = aniso;
    return tex;
  }

  function rr(cx, x, y, w, h, r) {
    cx.beginPath();
    if (cx.roundRect) cx.roundRect(x, y, w, h, r);
    else cx.rect(x, y, w, h);
  }

  // L1 — iki patch panel ve aralarındaki patch kabloları
  function drawNetwork(cx) {
    const dots = [];
    const x0 = 84, w = TEX - 168, cols = 12, pitch = w / cols, pw = pitch * 0.7, ph = 56;
    const ports = [[], []];
    cx.font = `500 22px ${MONO}`;
    [96, 610].forEach((py, p) => {
      cx.fillStyle = ink(0.62);
      cx.fillText(p ? 'PP-B  25–48' : 'PP-A  01–24', x0 - 10, py);
      cx.fillText(p ? 'SW-02' : 'SW-01', x0 + w - 70, py);
      cx.strokeStyle = ink(0.3);
      cx.lineWidth = 2;
      cx.strokeRect(x0 - 22, py + 20, w + 44, 246);
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < cols; c++) {
          const x = x0 + c * pitch + (pitch - pw) / 2;
          const y = py + 62 + r * (ph + 58);
          drawPort(cx, x, y, pw, ph);
          ports[p].push({ x: x + pw / 2, top: y, bottom: y + ph, w: pw, h: ph });
          dots.push({ u: (x + pw - 6) / TEX, v: (y - 19) / TEX, r: 7, kind: 'blink', seed: rnd() });
        }
      }
    });
    const pairs = [[1, 3], [3, 1], [4, 7], [6, 6], [8, 10], [10, 9], [11, 2], [0, 0]];
    cx.lineCap = 'round';
    pairs.forEach(([a, b], k) => {
      const A = ports[0][12 + a], B = ports[1][b];
      const col = k % 3 === 0 ? RED_LIT : ink(0.72);
      cx.strokeStyle = col;
      cx.lineWidth = 7;
      cx.beginPath();
      cx.moveTo(A.x, A.bottom - 12);
      cx.bezierCurveTo(A.x, A.bottom + 170, B.x, B.top - 170, B.x, B.top + 12);
      cx.stroke();
      cx.fillStyle = col;
      [A, B].forEach((pt) => cx.fillRect(pt.x - pt.w * 0.3, pt.top + pt.h * 0.18, pt.w * 0.6, pt.h * 0.64));
    });
    return dots;
  }

  function drawPort(cx, x, y, w, h) {
    const n = w * 0.38, s = h * 0.74;
    cx.strokeStyle = ink(0.62);
    cx.lineWidth = 3;
    cx.beginPath();
    cx.moveTo(x, y); cx.lineTo(x + w, y); cx.lineTo(x + w, y + s);
    cx.lineTo(x + (w + n) / 2, y + s); cx.lineTo(x + (w + n) / 2, y + h);
    cx.lineTo(x + (w - n) / 2, y + h); cx.lineTo(x + (w - n) / 2, y + s);
    cx.lineTo(x, y + s); cx.closePath();
    cx.stroke();
    cx.strokeStyle = ink(0.32);
    cx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const px = x + w * 0.16 + (i * w * 0.68) / 7;
      cx.beginPath(); cx.moveTo(px, y + 6); cx.lineTo(px, y + 16); cx.stroke();
    }
  }

  // L2 — kamera yerleşim planı: odalar, görüş açıları, NVR'a giden PoE hatları
  function drawCamera(cx) {
    const dots = [];
    const x0 = 96, y0 = 96, x1 = TEX - 96, y1 = TEX - 96;
    const nvr = { x: 770, y: 740, w: 130, h: 160 };
    const cams = [
      { x: 118, y: 118, dir: 45, range: 360, label: 'CAM-01' },
      { x: 540, y: 118, dir: 135, range: 330, label: 'CAM-02' },
      { x: 906, y: 118, dir: 135, range: 380, label: 'CAM-03' },
      { x: 118, y: 906, dir: -45, range: 380, label: 'CAM-04' },
      { x: 600, y: 540, dir: 20, range: 300, label: 'CAM-05' },
    ];

    // görüş alanları
    cams.forEach((c) => {
      const a = (c.dir * Math.PI) / 180, half = (34 * Math.PI) / 180;
      const g = cx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.range);
      g.addColorStop(0, 'rgba(255,75,69,0.34)');
      g.addColorStop(1, 'rgba(255,75,69,0.02)');
      cx.fillStyle = g;
      cx.beginPath();
      cx.moveTo(c.x, c.y);
      cx.arc(c.x, c.y, c.range, a - half, a + half);
      cx.closePath();
      cx.fill();
      cx.strokeStyle = 'rgba(255,75,69,0.6)';
      cx.lineWidth = 2;
      cx.stroke();
    });

    // duvarlar (kapı boşluklarıyla)
    const wall = (ax, ay, bx, by) => { cx.beginPath(); cx.moveTo(ax, ay); cx.lineTo(bx, by); cx.stroke(); };
    cx.lineCap = 'square';
    cx.strokeStyle = ink(0.78);
    cx.lineWidth = 9;
    cx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    cx.strokeStyle = ink(0.55);
    cx.lineWidth = 6;
    wall(560, y0, 560, 400); wall(560, 480, 560, 620);
    wall(x0, 620, 300, 620); wall(390, 620, x1, 620);
    wall(740, 620, 740, 700); wall(740, 800, 740, y1);

    // PoE hatları → NVR
    cx.setLineDash([10, 10]);
    cx.strokeStyle = ink(0.34);
    cx.lineWidth = 3;
    cams.forEach((c) => {
      cx.beginPath();
      cx.moveTo(c.x, c.y);
      cx.lineTo(c.x, nvr.y + nvr.h / 2);
      cx.lineTo(nvr.x, nvr.y + nvr.h / 2);
      cx.stroke();
    });
    cx.setLineDash([]);

    // NVR
    cx.fillStyle = '#16191d';
    cx.fillRect(nvr.x, nvr.y, nvr.w, nvr.h);
    cx.strokeStyle = ink(0.8);
    cx.lineWidth = 3;
    cx.strokeRect(nvr.x, nvr.y, nvr.w, nvr.h);
    cx.strokeStyle = ink(0.4);
    cx.lineWidth = 2;
    for (let k = 0; k < 4; k++) cx.strokeRect(nvr.x + 16, nvr.y + 50 + k * 24, nvr.w - 32, 16);
    cx.font = `600 22px ${MONO}`;
    cx.fillStyle = ink(0.9);
    cx.fillText('NVR', nvr.x + 16, nvr.y + 34);
    dots.push({ u: (nvr.x + nvr.w - 22) / TEX, v: (nvr.y + 26) / TEX, r: 8, kind: 'blink', seed: rnd() });

    // oda adları
    cx.font = `500 20px ${MONO}`;
    cx.fillStyle = ink(0.45);
    [['OFİS', 150, 470], ['DEPO', 610, 430], ['GİRİŞ', 150, 860], ['SUNUCU', 766, 690]].forEach(([n, x, y]) => cx.fillText(n, x, y));

    // kameralar
    cams.forEach((c) => {
      cx.fillStyle = ink(0.92);
      cx.beginPath(); cx.arc(c.x, c.y, 17, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = '#16191d';
      cx.beginPath(); cx.arc(c.x, c.y, 9, 0, Math.PI * 2); cx.fill();
      cx.font = `500 17px ${MONO}`;
      cx.fillStyle = ink(0.7);
      const right = c.x < 500;
      cx.textAlign = right ? 'left' : 'right';
      cx.fillText(c.label, c.x + (right ? 28 : -28), c.y + (c.y > 800 ? -18 : 34));
      cx.textAlign = 'left';
      dots.push({ u: c.x / TEX, v: c.y / TEX, r: 6, kind: 'rec', seed: rnd() });
    });
    return dots;
  }

  // L3 — rack üniteleri
  function drawSystem(cx) {
    const dots = [];
    const x0 = 84, w = TEX - 168, rh = 92, gap = 26;
    cx.font = `500 22px ${MONO}`;
    for (let i = 0, y = 92; i < 7; i++, y += rh + gap) {
      cx.strokeStyle = ink(0.5);
      cx.lineWidth = 2.5;
      cx.strokeRect(x0, y, w, rh);
      cx.fillStyle = ink(0.2);
      cx.fillRect(x0 - 28, y + 12, 16, rh - 24);
      cx.fillRect(x0 + w + 12, y + 12, 16, rh - 24);
      cx.fillStyle = ink(0.3);
      for (let k = 0; k < 12; k++) cx.fillRect(x0 + 24 + k * 15, y + 20, 6, rh - 40);
      cx.fillStyle = ink(0.78);
      cx.fillText(`SRV-0${i + 1}`, x0 + 232, y + rh / 2 + 8);
      cx.strokeStyle = ink(0.36);
      cx.lineWidth = 2;
      for (let k = 0; k < 4; k++) cx.strokeRect(x0 + 420 + k * 80, y + 18, 66, rh - 36);
      if (i === 2 || i === 5) {
        cx.fillStyle = RED_LIT;
        cx.fillRect(x0 + 420, y + 18, 66, rh - 36);
      }
      dots.push({ u: (x0 + w - 84) / TEX, v: (y + rh / 2) / TEX, r: 9, kind: 'steady', seed: rnd() });
      dots.push({ u: (x0 + w - 46) / TEX, v: (y + rh / 2) / TEX, r: 9, kind: 'blink', seed: rnd() });
    }
    return dots;
  }

  // L4 — kod mini haritası
  function drawCode(cx) {
    const dots = [];
    cx.font = `500 20px ${MONO}`;
    cx.fillStyle = ink(0.72);
    cx.fillText('api/siparis.ts', 150, 70);
    cx.fillStyle = ink(0.32);
    cx.fillText('entegrasyon.py', 430, 70);
    cx.fillStyle = RED_LIT;
    cx.fillRect(150, 84, 250, 4);
    cx.font = `400 15px ${MONO}`;
    let indent = 0;
    for (let i = 0; i < 29; i++) {
      const y = 124 + i * 28;
      cx.fillStyle = ink(0.28);
      cx.fillText(String(i + 1).padStart(2, '0'), 84, y + 11);
      if (rnd() < 0.1) { indent = Math.max(0, indent - 1); continue; }
      const r = rnd();
      indent = clamp(indent + (r < 0.28 ? 1 : r > 0.72 ? -1 : 0), 0, 4);
      let x = 150 + indent * 40;
      const tokens = 1 + Math.floor(rnd() * 4);
      for (let k = 0; k < tokens && x < TEX - 200; k++) {
        const tw = 28 + rnd() * 150;
        const c = rnd();
        cx.fillStyle = c < 0.12 ? RED_LIT : c < 0.42 ? ink(0.85) : ink(0.42);
        rr(cx, x, y, tw, 12, 6);
        cx.fill();
        x += tw + 14;
      }
      dots.push({ u: (x + 6) / TEX, v: (y + 6) / TEX, r: 8, kind: 'cursor', idx: dots.length });
    }
    return dots;
  }

  // L5 — masaüstü, mobil ve e-ticaret pencereleri
  function drawWeb(cx) {
    const dots = [];
    let wi = 0;
    const win = (x, y, w, h) => {
      cx.strokeStyle = ink(0.6);
      cx.lineWidth = 3;
      rr(cx, x, y, w, h, 12);
      cx.stroke();
      cx.beginPath(); cx.moveTo(x, y + 44); cx.lineTo(x + w, y + 44); cx.stroke();
      cx.fillStyle = ink(0.16);
      rr(cx, x + 96, y + 14, Math.min(w - 120, 300), 16, 8);
      cx.fill();
      for (let k = 0; k < 3; k++) dots.push({ u: (x + 26 + k * 22) / TEX, v: (y + 22) / TEX, r: 7, kind: 'load', k, w: wi });
      wi++;
      return { x: x + 24, y: y + 66, w: w - 48 };
    };
    const bar = (x, y, w, h, fill) => { cx.fillStyle = fill; rr(cx, x, y, w, h, Math.min(6, h / 2)); cx.fill(); };

    let c = win(84, 84, 556, 404);
    bar(c.x, c.y, c.w, 150, ink(0.12));
    bar(c.x + 24, c.y + 34, 280, 24, ink(0.85));
    bar(c.x + 24, c.y + 72, 200, 12, ink(0.45));
    bar(c.x + 24, c.y + 100, 110, 28, RED_LIT);
    const cw = (c.w - 32) / 3;
    for (let k = 0; k < 3; k++) {
      cx.strokeStyle = ink(0.38);
      cx.lineWidth = 2;
      cx.strokeRect(c.x + k * (cw + 16), c.y + 170, cw, 130);
      bar(c.x + k * (cw + 16) + 16, c.y + 190, cw * 0.6, 12, ink(0.6));
      bar(c.x + k * (cw + 16) + 16, c.y + 214, cw * 0.8, 8, ink(0.3));
      bar(c.x + k * (cw + 16) + 16, c.y + 230, cw * 0.5, 8, ink(0.3));
    }

    c = win(680, 84, 260, 520);
    bar(c.x, c.y, c.w, 130, ink(0.12));
    bar(c.x, c.y + 150, c.w * 0.8, 18, ink(0.85));
    bar(c.x, c.y + 180, c.w * 0.9, 9, ink(0.4));
    bar(c.x, c.y + 196, c.w * 0.7, 9, ink(0.4));
    bar(c.x, c.y + 226, c.w, 34, RED_LIT);
    for (let k = 0; k < 3; k++) {
      cx.strokeStyle = ink(0.34);
      cx.lineWidth = 2;
      cx.strokeRect(c.x, c.y + 284 + k * 52, c.w, 40);
    }

    c = win(84, 644, 856, 296);
    const pw = (c.w - 4 * 16) / 5;
    for (let k = 0; k < 5; k++) {
      const x = c.x + k * (pw + 16);
      bar(x, c.y, pw, 110, ink(0.12));
      bar(x, c.y + 126, pw * 0.8, 10, ink(0.6));
      bar(x, c.y + 146, pw * 0.5, 10, ink(0.3));
      bar(x, c.y + 172, pw * 0.36, 14, k === 1 ? RED_LIT : ink(0.8));
    }
    return dots;
  }

  // L6 — sinir ağı
  function drawAI(cx) {
    const dots = [];
    const cols = [170, 400, 630, 856], counts = [4, 6, 6, 3], R0 = 26;
    const pos = cols.map((x, c) => Array.from({ length: counts[c] }, (_, i) => ({ x, y: 150 + (i + 0.5) * (760 / counts[c]) })));
    cx.lineWidth = 2;
    for (let c = 0; c < 3; c++) {
      for (const a of pos[c]) {
        for (const b of pos[c + 1]) {
          const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
          const ux = dx / len, uy = dy / len;
          const strong = rnd() < 0.12;
          cx.strokeStyle = strong ? RED_LIT : ink(0.08 + rnd() * 0.24);
          cx.lineWidth = strong ? 3 : 2;
          cx.beginPath();
          cx.moveTo(a.x + ux * R0, a.y + uy * R0);
          cx.lineTo(b.x - ux * R0, b.y - uy * R0);
          cx.stroke();
        }
      }
    }
    pos.forEach((col, c) => col.forEach((node) => {
      cx.strokeStyle = ink(0.66);
      cx.lineWidth = 3;
      cx.beginPath(); cx.arc(node.x, node.y, R0, 0, Math.PI * 2); cx.stroke();
      dots.push({ u: node.x / TEX, v: node.y / TEX, r: 15, kind: 'wave', col: c, seed: rnd() });
    }));
    cx.font = `500 20px ${MONO}`;
    cx.fillStyle = ink(0.55);
    cx.textAlign = 'center';
    cx.fillText('GİRDİ', cols[0], 100);
    cx.fillText('ÇIKTI', cols[3], 100);
    cx.textAlign = 'left';
    return dots;
  }
}

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(n) {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}
