// Sitenin tüm içeriği tek yerde. Katmanlar hem metin bölümünü hem 3B yığını besler;
// sıra alttan üste doğrudur (L1 = en alttaki katman).

export type LayerDrawing = 'network' | 'camera' | 'system' | 'code' | 'web' | 'ai';

export interface Layer {
  id: string;
  code: string;
  short: string;
  title: string;
  /** 3B yığında katmanın ön yüzündeki etiket bandı */
  tape: string;
  drawing: LayerDrawing;
  /** Topoloji diyagramında bu katman için ayrı çalışılacak tedarikçi */
  vendor: string;
  lead: string;
  items: string[];
  tags: string[];
}

export const LAYERS: Layer[] = [
  {
    id: 'ag',
    code: 'L1',
    short: 'Ağ',
    title: 'Ağ altyapısı',
    tape: 'L1 · AĞ ALTYAPISI',
    drawing: 'network',
    vendor: 'Ağ firması',
    lead: 'Her şeyin üzerinde durduğu zemin. Binanızın kablolamasından şubeler arası bağlantıya kadar ağı baştan kurar ya da mevcut ağınızı toparlarız.',
    items: [
      'Yapısal kablolama ve fiber sonlandırma',
      'Switch, router ve firewall yapılandırması',
      'Kurumsal Wi-Fi ve misafir ağları',
      'VPN ve şubeler arası bağlantı',
    ],
    tags: ['Cat6A', 'OS2 fiber', 'VLAN', 'SD-WAN'],
  },
  {
    id: 'kamera',
    code: 'L2',
    short: 'Kamera',
    title: 'Kamera sistemleri',
    tape: 'L2 · KAMERA',
    drawing: 'camera',
    vendor: 'Kamera firması',
    lead: 'Binanızı ve sahanızı gören, kaydeden, gerektiğinde uyaran güvenlik kameraları. Keşiften montaja, kayıt cihazından telefonunuzda canlı izlemeye kadar.',
    items: [
      'Keşif, kamera yerleşim planı ve montaj',
      'NVR kayıt sistemi ve depolama planı',
      'Mobil ve uzaktan canlı izleme',
      'Plaka tanıma ve hareket algılama',
    ],
    tags: ['IP kamera', 'PoE', 'NVR', 'Uzaktan izleme'],
  },
  {
    id: 'sistem',
    code: 'L3',
    short: 'Sistem',
    title: 'Sistem altyapısı',
    tape: 'L3 · SİSTEM',
    drawing: 'system',
    vendor: 'Sunucu firması',
    lead: 'Sunucular, sanallaştırma, kimlik yönetimi ve yedekleme. Kapanmayan, yedeği alınan ve sürekli izlenen sistemler.',
    items: [
      'Sunucu kurulumu ve sanallaştırma',
      'Active Directory ve kullanıcı yönetimi',
      'Yedekleme ve felaket kurtarma planı',
      'İzleme, alarm ve kapasite takibi',
    ],
    tags: ['VMware', 'Proxmox', 'Hyper-V', 'Linux'],
  },
  {
    id: 'yazilim',
    code: 'L4',
    short: 'Yazılım',
    title: 'Yazılım projeleri',
    tape: 'L4 · YAZILIM',
    drawing: 'code',
    vendor: 'Yazılımcı',
    lead: 'Hazır paketin yetmediği yerde işinize özel yazılım. Kendi süreçlerinize göre çalışan uygulamalar ve birbiriyle konuşan sistemler.',
    items: [
      'Web ve mobil uygulama geliştirme',
      'ERP, CRM ve muhasebe entegrasyonları',
      'API tasarımı ve geliştirme',
      'Eski sistemlerin modernizasyonu',
    ],
    tags: ['.NET', 'Node.js', 'Python', 'React'],
  },
  {
    id: 'web',
    code: 'L5',
    short: 'Web',
    title: 'Web siteleri',
    tape: 'L5 · WEB',
    drawing: 'web',
    vendor: 'Web ajansı',
    lead: 'Şirketinizin dışarıya bakan yüzü. Hızlı açılan, arama motorlarında bulunan, kolayca güncellenen siteler.',
    items: [
      'Kurumsal site tasarımı ve kurulumu',
      'E-ticaret altyapısı',
      'Alan adı, hosting ve SSL',
      'SEO ve performans iyileştirme',
    ],
    tags: ['WordPress', 'Next.js', 'WooCommerce', 'SSL'],
  },
  {
    id: 'yapay-zeka',
    code: 'L6',
    short: 'Yapay zekâ',
    title: 'Yapay zekâ',
    tape: 'L6 · YAPAY ZEKÂ',
    drawing: 'ai',
    vendor: 'AI danışmanı',
    lead: 'Alt katmanlar sağlam olunca yapay zekâ gerçekten işe yarar. Kendi verinizle çalışan asistanlar ve tekrar eden işleri üstlenen otomasyonlar.',
    items: [
      'Şirket dokümanlarıyla çalışan asistanlar',
      'Müşteri hizmetleri ve WhatsApp botları',
      'Belge okuma ve veri çıkarma',
      'Süreç otomasyonu ve LLM entegrasyonu',
    ],
    tags: ['LLM', 'RAG', 'OCR', 'Otomasyon'],
  },
];

export interface Hop {
  name: string;
  desc: string;
  output: string;
}

export const HOPS: Hop[] = [
  { name: 'Keşif', desc: 'Mevcut altyapınızı, iş akışınızı ve hedeflerinizi yerinde inceleriz.', output: 'Keşif raporu' },
  { name: 'Mimari', desc: 'Ağdan yapay zekâya tüm katmanları tek bir çizimde planlarız.', output: 'Mimari çizim ve net teklif' },
  { name: 'Kurulum', desc: 'Kablolama, kamera montajı, sunucu ve yazılım işleri aynı takvimde, paralel ilerler.', output: 'Çalışan sistem' },
  { name: 'Devreye alma', desc: 'Test, veri taşıma ve ekibinizin eğitimiyle canlıya geçeriz.', output: 'Dokümantasyon ve eğitim' },
  { name: 'İzleme', desc: 'Canlıya geçtikten sonra da hattın öbür ucundayız.', output: 'Bakım ve destek' },
];

// TODO: gerçek iletişim bilgileriyle değiştirilecek
export const CONTACT_EMAIL = 'info@connectbilisim.com.tr';

const NUMBER_WORDS: Record<number, string> = {
  2: 'İki', 3: 'Üç', 4: 'Dört', 5: 'Beş', 6: 'Altı', 7: 'Yedi', 8: 'Sekiz', 9: 'Dokuz', 10: 'On',
};

/** Katman sayısının yazıyla karşılığı ("Altı"); metinler katman eklenince kendiliğinden güncellenir. */
export const layerCountWord = NUMBER_WORDS[LAYERS.length] ?? String(LAYERS.length);

export const layerShortList = LAYERS.map((layer) => layer.short).join(' · ');
