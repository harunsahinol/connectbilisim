// Geçici marka işareti (RJ45 port simgesi + "connect"). Logo gelince bu bileşen değişecek.
export default function Brand({ className = '' }: { className?: string }) {
  return (
    <a className={`brand ${className}`.trim()} href="#top" aria-label="Connect Bilişim ana sayfa">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 3h20v14h-6v4H8v-4H2z" fill="#E1141C" stroke="#111316" strokeWidth="2" strokeLinejoin="round" />
        <path d="M6.5 6v3M9.5 6v3M12 6v3M14.5 6v3M17.5 6v3" stroke="#111316" strokeWidth="1.5" />
      </svg>
      <span className="brand-word">connect</span>
      <span className="brand-sub">bilişim</span>
    </a>
  );
}
