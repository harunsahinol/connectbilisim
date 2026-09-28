# Connect Bilişim — web sitesi

Connect Bilişim'in tanıtım sitesi: ağ altyapısı, kamera sistemleri, sistem altyapısı, yazılım projeleri, web siteleri ve yapay zekâ geliştirmeleri.

Hizmetler, WebGL (Three.js) ile çizilen altı katmanlı bir "rack" yığını olarak anlatılır; sayfa kaydırıldıkça yığın açılır ve ilgili katman çekmece gibi dışarı kayar.

## Dosyalar

- `index.html` — sayfa yapısı ve içerik
- `style.css` — tasarım sistemi (kırmızı / siyah / alüminyum palet, Archivo + Onest + Martian Mono)
- `app.js` — 3B sahne ve sayfa davranışları

## Çalıştırma

Derleme adımı yok. Klasörü herhangi bir statik sunucuyla açın:

```bash
python -m http.server 8000
```

Ardından `http://localhost:8000` adresine gidin. (ES modülleri `file://` üzerinden yüklenmediği için bir sunucu gerekir.)

## Bekleyenler

- Logo ve kesin marka kırmızısı (şu an `#E1141C`)
- İletişim bilgileri ve formun bir e-posta / backend servisine bağlanması
