// Ekranın ortasındaki katman. Metin bölümü (Layers) yazar; 3B sahne her karede okur,
// metin bölümü de useSyncExternalStore ile vurgusunu buna göre günceller.

let active = -1;
const listeners = new Set<() => void>();

export function getActiveLayer(): number {
  return active;
}

export function setActiveLayer(index: number): void {
  if (index === active) return;
  active = index;
  listeners.forEach((listener) => listener());
}

export function subscribeActiveLayer(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
