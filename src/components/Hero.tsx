import { layerCountWord, layerShortList } from '@/content/site';
import { ArrowDown, ArrowRight } from './icons';

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="wrap hero-top">
        <p className="eyebrow mono">{layerShortList}</p>
        <p className="lead">
          Connect Bilişim ağınızı kurar, kameralarınızı yerleştirir, sunucularınızı ayağa kaldırır, yazılımınızı
          geliştirir, web sitenizi yayına alır ve üstüne yapay zekâyı ekler. {layerCountWord} katman, tek ekip.
        </p>
        <div className="actions">
          <a className="btn btn-red" href="#iletisim">
            Proje başlat <ArrowRight />
          </a>
          <a className="btn btn-line" href="#katmanlar">
            Katmanları incele <ArrowDown />
          </a>
        </div>
      </div>
      <h1 className="wrap display hero-title">
        <span className="line">Kablodan</span>
        <span className="line">
          yapay zekâya<i className="port" aria-hidden="true" />
        </span>
      </h1>
    </section>
  );
}
