# Connect Bilişim — web sitesi

Connect Bilişim'in tanıtım sitesi: ağ altyapısı, kamera sistemleri, sistem altyapısı, yazılım projeleri, web siteleri ve yapay zekâ geliştirmeleri.

Hizmetler, WebGL (Three.js) ile çizilen katmanlı bir "rack" yığını olarak anlatılır; sayfa kaydırıldıkça yığın açılır ve ilgili katman çekmece gibi dışarı kayar.

Next.js 16 (App Router) + TypeScript. Sayfa tamamen statik olarak üretilir.

## Geliştirme

```bash
npm install
npm run dev
```

`http://localhost:3000` adresini açın.

```bash
npm run build   # üretim derlemesi + tip kontrolü
npm run lint
```

## Yapı

- `src/content/site.ts` — tüm içerik: katmanlar (hizmetler), süreç adımları, iletişim bilgisi. Yeni bir hizmet eklemek için `LAYERS` dizisine bir öğe eklemek yeterli; metin bölümü, 3B yığın, topoloji diyagramı, form seçenekleri ve footer buradan beslenir.
- `src/app/layout.tsx` — fontlar (Archivo, Onest, Martian Mono — `next/font`), metadata
- `src/app/globals.css` — tasarım sistemi (kırmızı / siyah / alüminyum palet)
- `src/components/` — sayfa bölümleri
- `src/components/stack/` — 3B sahne: `scene.ts` (three.js), `textures.ts` (katman yüzeylerindeki çizimler), `StackCanvas.tsx` (sahneyi sonradan yükleyen istemci bileşeni)
- `src/lib/activeLayer.ts` — metin bölümü ile 3B sahnenin paylaştığı "aktif katman" durumu

## Yayına alma (Cloudflare Workers)

Site statik dışa aktarılır (`next.config.ts` → `output: "export"`); `npm run build` çıktısı `out/` klasörüne yazılır ve `wrangler.jsonc` bu klasörü Workers statik varlıkları olarak sunar.

Cloudflare Workers Builds ayarları:

- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`
- **Non-production branch deploy command:** `npx wrangler versions upload`

Yerelden elle yayın: `npm run build && npx wrangler deploy`

Not: Statik dışa aktarımda sunucu tarafı özellikler (Route Handler, Server Action) çalışmaz. İletişim formu için sunucu gerektiğinde `@opennextjs/cloudflare` adaptörüne geçilebilir (Next 16.3.3+ destekli).

## Bekleyenler

- Logo ve kesin marka kırmızısı (şu an `#E1141C`, `globals.css` ve `stack/textures.ts` içinde)
- İletişim bilgileri ve formun bir e-posta servisine bağlanması (`Contact.tsx`, bir Route Handler ile)
