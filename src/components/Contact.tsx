'use client';

import { useState, type FormEvent } from 'react';
import { CONTACT_EMAIL, LAYERS, layerShortList } from '@/content/site';
import { ArrowRight } from './icons';

export default function Contact() {
  const [status, setStatus] = useState('');

  // TODO: bir Route Handler'a (ör. app/api/iletisim/route.ts) bağlanıp e-posta gönderecek
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('Önizleme sürümü: form henüz bir e-posta hesabına bağlı değil.');
  };

  return (
    <section className="cta" id="iletisim" aria-labelledby="cta-title">
      <div className="wrap">
        <h2 className="display cta-title" id="cta-title">
          Bağlanalım<i className="port port-dark" aria-hidden="true" />
        </h2>
        <div className="cta-grid">
          <div className="cta-copy">
            <p className="cta-lead">
              Hangi katmanda sorun olduğunu bilmeniz gerekmiyor. Ne yaşadığınızı anlatın, gerisini birlikte çizelim.
            </p>
            <dl className="contact mono">
              <div>
                <dt>E-posta</dt>
                <dd><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></dd>
              </div>
              <div>
                <dt>Çalışma alanı</dt>
                <dd>{layerShortList}</dd>
              </div>
            </dl>
          </div>

          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="field-row">
              <label className="field">
                <span className="mono">Ad soyad</span>
                <input name="ad" autoComplete="name" required />
              </label>
              <label className="field">
                <span className="mono">Şirket</span>
                <input name="sirket" autoComplete="organization" />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span className="mono">E-posta</span>
                <input type="email" name="eposta" autoComplete="email" required />
              </label>
              <label className="field">
                <span className="mono">Telefon (isteğe bağlı)</span>
                <input type="tel" name="telefon" autoComplete="tel" />
              </label>
            </div>
            <fieldset className="chips">
              <legend className="mono">Hangi katmanlar?</legend>
              {LAYERS.map((layer) => (
                <label className="chip" key={layer.id}>
                  <input type="checkbox" name="katman" value={layer.id} />
                  <span>{layer.short}</span>
                </label>
              ))}
              <label className="chip">
                <input type="checkbox" name="katman" value="emin-degilim" />
                <span>Emin değilim</span>
              </label>
            </fieldset>
            <label className="field">
              <span className="mono">Kısaca anlatın</span>
              <textarea name="mesaj" rows={3} />
            </label>
            <div className="form-foot">
              <button className="btn btn-dark" type="submit">
                Talep gönder <ArrowRight />
              </button>
              <p className="form-status mono" role="status" aria-live="polite">{status}</p>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
