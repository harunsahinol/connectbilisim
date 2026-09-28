import { HOPS } from '@/content/site';

const COUNT_WORDS: Record<number, string> = { 3: 'üç', 4: 'dört', 5: 'beş', 6: 'altı', 7: 'yedi' };

export default function Process() {
  return (
    <section className="route" id="surec" aria-labelledby="route-title">
      <div className="wrap">
        <div className="route-head">
          <div>
            <p className="eyebrow mono">Süreç</p>
            <h2 className="h2" id="route-title">
              Bir proje, {COUNT_WORDS[HOPS.length] ?? HOPS.length} durak.
            </h2>
          </div>
          <p className="cmd" aria-hidden="true">
            <span className="prompt">$</span> traceroute yeni-projeniz<span className="caret" />
          </p>
        </div>

        <ol className="hops">
          {HOPS.map((hop, i) => (
            <li className="hop" key={hop.name}>
              <span className="hop-n mono">{i + 1}</span>
              <h3 className="hop-name">{hop.name}</h3>
              <p className="hop-desc">{hop.desc}</p>
              <span className="hop-out mono">{hop.output}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
