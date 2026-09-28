import { LAYERS } from '@/content/site';
import Brand from './Brand';

export default function Footer() {
  return (
    <footer className="foot on-dark">
      <div className="wrap foot-inner">
        <Brand className="brand-light" />
        <p className="foot-tag">Kablodan yapay zekâya.</p>
        <ul className="foot-links mono">
          {LAYERS.map((layer) => (
            <li key={layer.id}>
              <a href={`#${layer.id}`}>{layer.short}</a>
            </li>
          ))}
        </ul>
        <p className="foot-copy mono">© {new Date().getFullYear()} Connect Bilişim</p>
      </div>
    </footer>
  );
}
