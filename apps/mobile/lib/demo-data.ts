import type { VehicleListItem } from "../components/VehicleCard";

/** Offline / demo fallback — API yokken UI'ın dolu görünmesi için */
export const DEMO_BRANDS = [
  { id: 1, name: "Toyota" },
  { id: 2, name: "Kia" },
  { id: 3, name: "Haval" },
  { id: 4, name: "Omoda" },
  { id: 5, name: "BMW" },
  { id: 6, name: "BYD" },
  { id: 7, name: "Mazda" },
  { id: 8, name: "Volkswagen" },
  { id: 9, name: "Mercedes-Benz" },
  { id: 10, name: "Audi" },
  { id: 11, name: "Ford" },
  { id: 12, name: "Honda" },
  { id: 13, name: "Hyundai" },
  { id: 14, name: "Renault" },
  { id: 15, name: "Tesla" },
  { id: 16, name: "Togg" },
  { id: 17, name: "Peugeot" },
  { id: 18, name: "Fiat" },
  { id: 19, name: "Opel" },
  { id: 20, name: "Nissan" },
  { id: 21, name: "Skoda" },
  { id: 22, name: "Volvo" },
  { id: 23, name: "Geely" },
  { id: 24, name: "Chery" },
  { id: 25, name: "MG" },
  { id: 26, name: "Changan" },
  { id: 27, name: "Porsche" },
  { id: 28, name: "Land Rover" },
  { id: 29, name: "Jeep" },
  { id: 30, name: "Chevrolet" },
];

const img = (photoId: string) =>
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=800&q=80`;

export const DEMO_VEHICLES: VehicleListItem[] = [
  {
    id: "demo-bmw-320i",
    title: "BMW 320i M Sport",
    make_name: "BMW",
    model: "320i",
    year: 2021,
    mileage_km: 42000,
    fuel_name: "Benzin",
    transmission_name: "Otomatik",
    body_name: "Sedan",
    price_amount: 1850000,
    price_currency: "TRY",
    country_code: "TR",
    city: "İstanbul",
    cover_url: img("photo-1555215695-3004980ad54e"),
    created_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
    verified: true,
    featured: true,
  },
  {
    id: "demo-toyota-corolla",
    title: "Toyota Corolla Hybrid",
    make_name: "Toyota",
    model: "Corolla",
    year: 2022,
    mileage_km: 28000,
    fuel_name: "Hibrit",
    transmission_name: "CVT",
    body_name: "Sedan",
    price_amount: 1450000,
    price_currency: "TRY",
    country_code: "TR",
    city: "Ankara",
    cover_url: img("photo-1621007947382-bb3c3994e3fb"),
    created_at: new Date(Date.now() - 5 * 3600_000).toISOString(),
    verified: true,
  },
  {
    id: "demo-vw-tiguan",
    title: "Volkswagen Tiguan 1.5 TSI",
    make_name: "Volkswagen",
    model: "Tiguan",
    year: 2020,
    mileage_km: 61000,
    fuel_name: "Benzin",
    transmission_name: "Otomatik",
    body_name: "SUV",
    price_amount: 1680000,
    price_currency: "TRY",
    country_code: "TR",
    city: "İzmir",
    cover_url: img("photo-1606664515524-ed2f786a0bd6"),
    created_at: new Date(Date.now() - 8 * 3600_000).toISOString(),
    featured: true,
  },
  {
    id: "demo-mercedes-c200",
    title: "Mercedes-Benz C 200 AMG",
    make_name: "Mercedes-Benz",
    model: "C 200",
    year: 2023,
    mileage_km: 12000,
    fuel_name: "Benzin",
    transmission_name: "Otomatik",
    body_name: "Sedan",
    price_amount: 3200000,
    price_currency: "TRY",
    country_code: "TR",
    city: "İstanbul",
    cover_url: img("photo-1618843479313-40f8afb4b4d8"),
    created_at: new Date(Date.now() - 12 * 3600_000).toISOString(),
    verified: true,
    featured: true,
  },
  {
    id: "demo-togg-t10x",
    title: "Togg T10X V2 Uzun Menzil",
    make_name: "Togg",
    model: "T10X",
    year: 2024,
    mileage_km: 8500,
    fuel_name: "Elektrik",
    transmission_name: "Otomatik",
    body_name: "SUV",
    price_amount: 1950000,
    price_currency: "TRY",
    country_code: "TR",
    city: "Bursa",
    cover_url: img("photo-1593941707882-a5bba14938c7"),
    created_at: new Date(Date.now() - 18 * 3600_000).toISOString(),
    verified: true,
  },
  {
    id: "demo-audi-a4",
    title: "Audi A4 40 TDI Quattro",
    make_name: "Audi",
    model: "A4",
    year: 2019,
    mileage_km: 89000,
    fuel_name: "Dizel",
    transmission_name: "Otomatik",
    body_name: "Sedan",
    price_amount: 1320000,
    price_currency: "TRY",
    country_code: "TR",
    city: "Antalya",
    cover_url: img("photo-1606664515524-ed2f786a0bd6"),
    created_at: new Date(Date.now() - 24 * 3600_000).toISOString(),
  },
  {
    id: "demo-hyundai-tucson",
    title: "Hyundai Tucson 1.6 T-GDI",
    make_name: "Hyundai",
    model: "Tucson",
    year: 2021,
    mileage_km: 45000,
    fuel_name: "Benzin",
    transmission_name: "Otomatik",
    body_name: "SUV",
    price_amount: 1520000,
    price_currency: "TRY",
    country_code: "TR",
    city: "Gaziantep",
    cover_url: img("photo-1519641471654-76ce0107ad1b"),
    created_at: new Date(Date.now() - 36 * 3600_000).toISOString(),
    verified: true,
  },
  {
    id: "demo-renault-clio",
    title: "Renault Clio 1.0 TCe Joy",
    make_name: "Renault",
    model: "Clio",
    year: 2022,
    mileage_km: 22000,
    fuel_name: "Benzin",
    transmission_name: "Manuel",
    body_name: "Hatchback",
    price_amount: 890000,
    price_currency: "TRY",
    country_code: "TR",
    city: "Konya",
    cover_url: img("photo-1549317661-bd32c8ce0db2"),
    created_at: new Date(Date.now() - 48 * 3600_000).toISOString(),
  },
];

const DEMO_RENTAL_OWNER = {
  display_name: "Demo Satıcı",
  verified: true,
  rating_avg: 4.8,
};

function rentalVehicle(id: string, title: string, year: number, coverUrl: string) {
  return {
    id,
    title_original: title,
    year,
    cover_url: coverUrl,
    media: [{ id: `${id}-cover`, url: coverUrl, type: "image" as const, is_cover: true }],
  };
}

export const DEMO_RENTALS = [
  {
    id: "demo-rental-1",
    vehicle_id: "demo-bmw-320i",
    daily_rate_amount: 3200,
    daily_rate_currency: "TRY",
    weekly_rate_amount: 18000,
    monthly_rate_amount: 62000,
    deposit_amount: 15000,
    min_days: 1,
    max_days: 30,
    insurance_included: true,
    instant_book: true,
    age_requirement: 21,
    delivery_available: false,
    country_code: "TR",
    city: "İstanbul",
    vehicle: rentalVehicle(
      "demo-bmw-320i",
      "BMW 320i M Sport",
      2021,
      img("photo-1555215695-3004980ad54e"),
    ),
    owner: DEMO_RENTAL_OWNER,
  },
  {
    id: "demo-rental-2",
    vehicle_id: "demo-togg-t10x",
    daily_rate_amount: 2800,
    daily_rate_currency: "TRY",
    weekly_rate_amount: 16000,
    monthly_rate_amount: 54000,
    deposit_amount: 12000,
    min_days: 2,
    max_days: 21,
    insurance_included: true,
    instant_book: false,
    age_requirement: 21,
    delivery_available: false,
    country_code: "TR",
    city: "Bursa",
    vehicle: rentalVehicle(
      "demo-togg-t10x",
      "Togg T10X V2",
      2024,
      img("photo-1593941707882-a5bba14938c7"),
    ),
    owner: DEMO_RENTAL_OWNER,
  },
  {
    id: "demo-rental-3",
    vehicle_id: "demo-vw-tiguan",
    daily_rate_amount: 2400,
    daily_rate_currency: "TRY",
    weekly_rate_amount: 14000,
    monthly_rate_amount: 48000,
    deposit_amount: 10000,
    min_days: 1,
    max_days: 45,
    insurance_included: false,
    instant_book: true,
    age_requirement: 21,
    delivery_available: false,
    country_code: "TR",
    city: "İzmir",
    vehicle: rentalVehicle(
      "demo-vw-tiguan",
      "Volkswagen Tiguan 1.5 TSI",
      2020,
      img("photo-1606664515524-ed2f786a0bd6"),
    ),
    owner: DEMO_RENTAL_OWNER,
  },
];

export type DemoRental = (typeof DEMO_RENTALS)[number];

export function getDemoRental(id: string): DemoRental | undefined {
  return DEMO_RENTALS.find((r) => r.id === id);
}

export type DemoNotificationType =
  | "price_drop"
  | "new_message"
  | "rental_booked"
  | "system";

export type DemoNotification = {
  id: string;
  type: DemoNotificationType;
  title: string;
  body: string;
  time: string;
  /** Optional deep-link target */
  href?: string;
  read?: boolean;
};

export const DEMO_NOTIFICATIONS: DemoNotification[] = [
  {
    id: "n-price-1",
    type: "price_drop",
    title: "Fiyat düştü",
    body: "BMW 320i M Sport artık 1.850.000 ₺ — 50.000 ₺ indirim.",
    time: "12 dk önce",
    href: "/vehicle/demo-bmw-320i",
    read: false,
  },
  {
    id: "n-msg-1",
    type: "new_message",
    title: "Yeni mesaj",
    body: "Satıcı: “Araç için yarın saat 14:00 uygun olur mu?”",
    time: "1 sa önce",
    href: "/chat/demo-seller",
    read: false,
  },
  {
    id: "n-rental-1",
    type: "rental_booked",
    title: "Kiralama onaylandı",
    body: "Togg T10X · Bursa — 3 gün için rezervasyonun hazır.",
    time: "Dün",
    href: "/rental/demo-rental-2",
    read: true,
  },
  {
    id: "n-sys-1",
    type: "system",
    title: "Sistem",
    body: "Seyyare güvenli ödeme koruması hesaplarında aktif.",
    time: "3 gün önce",
    read: true,
  },
];

export type DemoSavedSearch = {
  id: string;
  title: string;
  subtitle: string;
  /** Query params for /(tabs)/search */
  params: { q?: string; make?: string };
};

export const DEMO_SAVED_SEARCHES: DemoSavedSearch[] = [
  {
    id: "ss-suv-ist",
    title: "SUV · İstanbul",
    subtitle: "Otomatik · 2020+",
    params: { q: "SUV" },
  },
  {
    id: "ss-bmw",
    title: "BMW",
    subtitle: "Sedan · Benzin",
    params: { make: "BMW", q: "BMW" },
  },
  {
    id: "ss-hybrid",
    title: "Hibrit aile",
    subtitle: "Toyota · Corolla",
    params: { q: "Hibrit" },
  },
];

export const DEMO_REFERENCE = {
  brands: DEMO_BRANDS,
  body_types: [
    { id: 1, name: "Sedan" },
    { id: 2, name: "SUV" },
    { id: 3, name: "Hatchback" },
  ],
  fuel_types: [
    { id: 1, name: "Benzin" },
    { id: 2, name: "Dizel" },
    { id: 3, name: "Hibrit" },
    { id: 4, name: "Elektrik" },
  ],
  transmission_types: [
    { id: 1, name: "Manuel" },
    { id: 2, name: "Otomatik" },
    { id: 3, name: "CVT" },
  ],
};

function asIdList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "number" ? v : Number(v)))
    .filter((n) => Number.isFinite(n));
}

function namesFromIds(
  ids: number[],
  rows: Array<{ id: number; name: string }>,
): string[] {
  if (ids.length === 0) return [];
  const set = new Set(ids);
  return rows.filter((r) => set.has(r.id)).map((r) => r.name);
}

export function filterDemoVehicles(args: Record<string, unknown> = {}): VehicleListItem[] {
  let list = [...DEMO_VEHICLES];
  const q = typeof args.p_q === "string" ? args.p_q.toLowerCase() : "";
  if (q) {
    list = list.filter((v) =>
      [v.title, v.make_name, v.model, v.city, v.body_name]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q)),
    );
  }

  const makeNames = namesFromIds(asIdList(args.p_make_ids), DEMO_BRANDS);
  if (makeNames.length > 0) {
    const set = new Set(makeNames.map((n) => n.toLowerCase()));
    list = list.filter((v) => set.has(String(v.make_name ?? "").toLowerCase()));
  }

  const bodyNames = namesFromIds(asIdList(args.p_body_type_ids), DEMO_REFERENCE.body_types);
  if (bodyNames.length > 0) {
    const set = new Set(bodyNames.map((n) => n.toLowerCase()));
    list = list.filter((v) => set.has(String(v.body_name ?? "").toLowerCase()));
  }

  const fuelNames = namesFromIds(asIdList(args.p_fuel_type_ids), DEMO_REFERENCE.fuel_types);
  if (fuelNames.length > 0) {
    const set = new Set(fuelNames.map((n) => n.toLowerCase()));
    list = list.filter((v) => set.has(String(v.fuel_name ?? "").toLowerCase()));
  }

  const minYear = typeof args.p_min_year === "number" ? args.p_min_year : null;
  const maxYear = typeof args.p_max_year === "number" ? args.p_max_year : null;
  const minPrice = typeof args.p_min_price === "number" ? args.p_min_price : null;
  const maxPrice = typeof args.p_max_price === "number" ? args.p_max_price : null;
  if (minYear != null) list = list.filter((v) => (v.year ?? 0) >= minYear);
  if (maxYear != null) list = list.filter((v) => (v.year ?? 9999) <= maxYear);
  if (minPrice != null) list = list.filter((v) => Number(v.price_amount ?? 0) >= minPrice);
  if (maxPrice != null) list = list.filter((v) => Number(v.price_amount ?? 0) <= maxPrice);

  const sortBy = (args.p_sort_by as string) ?? "created_at";
  const sortDir = (args.p_sort_dir as string) ?? "desc";
  list.sort((a, b) => {
    const av = sortBy === "price" ? Number(a.price_amount ?? 0) : new Date(a.created_at ?? 0).getTime();
    const bv = sortBy === "price" ? Number(b.price_amount ?? 0) : new Date(b.created_at ?? 0).getTime();
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const offset = typeof args.p_page_offset === "number" ? args.p_page_offset : 0;
  const size = typeof args.p_page_size === "number" ? args.p_page_size : 30;
  return list.slice(offset, offset + size);
}

export function getDemoVehicle(id: string): VehicleListItem | undefined {
  return DEMO_VEHICLES.find((v) => v.id === id);
}

export type DemoStorePost = {
  id: string;
  platform: "instagram" | "facebook" | "x";
  image_url: string;
  caption: string;
  posted_at: string;
  url: string;
};

export type DemoStore = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  cover_url: string;
  verified: boolean;
  rating_avg: number;
  rating_count: number;
  bio: string;
  city: string;
  country_code: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  hours: string;
  lat: number;
  lng: number;
  website?: string;
  social: {
    instagram?: string;
    facebook?: string;
    x?: string;
  };
  posts: DemoStorePost[];
};

const storeCover = (photoId: string) =>
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=1200&q=80`;

const postImg = (photoId: string) =>
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=600&q=80`;

export const DEMO_STORES: DemoStore[] = [
  {
    user_id: "demo-seller",
    display_name: "Seyyare Premium Galeri",
    avatar_url: null,
    cover_url: storeCover("photo-1563720223185-11003d516935"),
    verified: true,
    rating_avg: 4.8,
    rating_count: 124,
    bio: "İstanbul merkezli premium ikinci el galeri. Garantili ekspertizli araçlar.",
    city: "İstanbul",
    country_code: "TR",
    address: "Levent Mah. Büyükdere Cad. No: 185, Beşiktaş",
    phone: "+90 212 555 01 20",
    whatsapp: "905551234567",
    email: "premium@seyyare.men",
    hours: "Pzt–Cmt 09:00–19:00 · Paz kapalı",
    lat: 41.0812,
    lng: 29.0111,
    website: "https://seyyare.men",
    social: {
      instagram: "seyyare.premium",
      facebook: "seyyarepremium",
      x: "seyyare",
    },
    posts: [
      {
        id: "sp1",
        platform: "instagram",
        image_url: postImg("photo-1555215695-3004980ad54e"),
        caption: "BMW 320i M Sport showroomda — ekspertizli teslim.",
        posted_at: "2g",
        url: "https://instagram.com",
      },
      {
        id: "sp2",
        platform: "instagram",
        image_url: postImg("photo-1617814076367-b759c7d7e738"),
        caption: "Haftanın fırsatı: garanti + takas seçenekleri.",
        posted_at: "5g",
        url: "https://instagram.com",
      },
      {
        id: "sp3",
        platform: "facebook",
        image_url: postImg("photo-1606664515524-ed2f786a0bd6"),
        caption: "Yeni gelen SUV’ler vitrinde.",
        posted_at: "1h",
        url: "https://facebook.com",
      },
    ],
  },
  {
    user_id: "demo-store-anadolu",
    display_name: "Anadolu Oto Market",
    avatar_url: null,
    cover_url: storeCover("photo-1486262715619-67b85e0b08d3"),
    verified: true,
    rating_avg: 4.6,
    rating_count: 86,
    bio: "Ankara ve çevresinde aile araçları, hibrit ve SUV odaklı satış.",
    city: "Ankara",
    country_code: "TR",
    address: "Çankaya Cad. No: 42, Çankaya",
    phone: "+90 312 555 44 10",
    whatsapp: "905551112233",
    email: "anadolu@seyyare.men",
    hours: "Her gün 10:00–20:00",
    lat: 39.9208,
    lng: 32.8541,
    social: { instagram: "anadolu.oto", facebook: "anadoluotomarket" },
    posts: [
      {
        id: "ap1",
        platform: "instagram",
        image_url: postImg("photo-1549317661-bd32c8ce0db2"),
        caption: "Hibrit aile araçları stokta.",
        posted_at: "1g",
        url: "https://instagram.com",
      },
      {
        id: "ap2",
        platform: "facebook",
        image_url: postImg("photo-1519641471654-76ce0107ad1b"),
        caption: "Takaslı satış kampanyası devam ediyor.",
        posted_at: "4g",
        url: "https://facebook.com",
      },
    ],
  },
  {
    user_id: "demo-store-ege",
    display_name: "Ege Motors",
    avatar_url: null,
    cover_url: storeCover("photo-1492144534655-ae79c964c9d7"),
    verified: true,
    rating_avg: 4.5,
    rating_count: 61,
    bio: "İzmir menşeli galeri — ekonomik hatchback ve şehir araçları.",
    city: "İzmir",
    country_code: "TR",
    address: "Alsancak Mah. Kıbrıs Şehitleri Cad. No: 88",
    phone: "+90 232 555 77 30",
    whatsapp: "905559998877",
    email: "ege@seyyare.men",
    hours: "Pzt–Cmt 09:30–18:30",
    lat: 38.4322,
    lng: 27.1428,
    social: { instagram: "egemotors", x: "egemotors" },
    posts: [
      {
        id: "ep1",
        platform: "instagram",
        image_url: postImg("photo-1503376780353-7e6692767b70"),
        caption: "Şehir içi ekonomik seçenekler.",
        posted_at: "3g",
        url: "https://instagram.com",
      },
      {
        id: "ep2",
        platform: "x",
        image_url: postImg("photo-1583121274602-3e2820c69888"),
        caption: "Yeni stok: hatchback modeller.",
        posted_at: "6g",
        url: "https://x.com",
      },
    ],
  },
  {
    user_id: "demo-store-akdeniz",
    display_name: "Akdeniz Car Plaza",
    avatar_url: null,
    cover_url: storeCover("photo-1502877338535-766e1452684a"),
    verified: false,
    rating_avg: 4.2,
    rating_count: 33,
    bio: "Antalya merkezli galeri. Yazlık ve aile araçları.",
    city: "Antalya",
    country_code: "TR",
    address: "Lara Cad. No: 210, Muratpaşa",
    phone: "+90 242 555 19 40",
    whatsapp: "905554443322",
    email: "akdeniz@seyyare.men",
    hours: "Pzt–Paz 10:00–21:00",
    lat: 36.8841,
    lng: 30.7056,
    social: { instagram: "akdenizcar", facebook: "akdenizcarplaza" },
    posts: [
      {
        id: "kp1",
        platform: "instagram",
        image_url: postImg("photo-1617531653332-bd46c24f2068"),
        caption: "Yazlık cabrio ve cabrio alternatifleri.",
        posted_at: "2g",
        url: "https://instagram.com",
      },
    ],
  },
];

/** @deprecated use DEMO_STORES / getDemoSeller */
export const DEMO_SELLER = DEMO_STORES[0];

export function getStoreMapUrl(lat: number, lng: number, w = 640, h = 280) {
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=14&size=${w}x${h}&markers=${lat},${lng},orangered-pushpin`;
}

const STORE_BY_CITY: Record<string, string> = {
  İstanbul: "demo-seller",
  Ankara: "demo-store-anadolu",
  Bursa: "demo-store-anadolu",
  İzmir: "demo-store-ege",
  Konya: "demo-store-ege",
  Antalya: "demo-store-akdeniz",
  Gaziantep: "demo-store-akdeniz",
};

function attachStores(vehicles: VehicleListItem[]): VehicleListItem[] {
  return vehicles.map((v, i) => {
    const storeId =
      STORE_BY_CITY[String(v.city ?? "")] ??
      DEMO_STORES[i % DEMO_STORES.length].user_id;
    const store = DEMO_STORES.find((s) => s.user_id === storeId) ?? DEMO_STORES[0];
    return {
      ...v,
      seller_id: store.user_id,
      seller_name: store.display_name,
    };
  });
}

// Enrich demo inventory with store ownership
(() => {
  const enriched = attachStores(DEMO_VEHICLES);
  DEMO_VEHICLES.splice(0, DEMO_VEHICLES.length, ...enriched);
})();

export function getDemoSeller(id: string): DemoStore | undefined {
  return DEMO_STORES.find((s) => s.user_id === id);
}

export function getDemoVehiclesBySeller(sellerId: string): VehicleListItem[] {
  return DEMO_VEHICLES.filter((v) => v.seller_id === sellerId);
}

export function getDemoStoreStats(sellerId: string) {
  const list = getDemoVehiclesBySeller(sellerId);
  return { listingCount: list.length };
}

export const DEMO_FAVORITES = DEMO_VEHICLES.slice(0, 4).map((v, i) => ({
  id: `demo-fav-${i + 1}`,
  vehicle_id: v.id,
  created_at: new Date(Date.now() - (i + 1) * 7200_000).toISOString(),
  vehicle: v,
}));

export const DEMO_MESSAGES = [
  {
    id: "demo-msg-1",
    conversation_id: "demo-seller",
    sender_id: "demo-seller",
    body: "Merhaba! İlanla ilgilenmenize sevindim. Nasıl yardımcı olabilirim?",
    created_at: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    id: "demo-msg-2",
    conversation_id: "demo-seller",
    sender_id: "me",
    body: "Araç hâlâ satılık mı? Ekspertiz raporu var mı?",
    created_at: new Date(Date.now() - 3000_000).toISOString(),
  },
  {
    id: "demo-msg-3",
    conversation_id: "demo-seller",
    sender_id: "demo-seller",
    body: "Evet, satılık. Yetkili servis ekspertizi mevcut — fotoğraflarını paylaşabilirim.",
    created_at: new Date(Date.now() - 2400_000).toISOString(),
  },
  {
    id: "demo-msg-4",
    conversation_id: "demo-seller",
    sender_id: "me",
    body: "Harika, lütfen gönderin. Yarın görüşebilir miyiz?",
    created_at: new Date(Date.now() - 1800_000).toISOString(),
  },
  {
    id: "demo-msg-5",
    conversation_id: "demo-seller",
    sender_id: "demo-seller",
    body: "Tabii. Demo sohbet — API bağlanınca gerçek mesajlar buraya düşer.",
    created_at: new Date(Date.now() - 900_000).toISOString(),
  },
];

export function getDemoMessages(conversationId: string) {
  const id = String(conversationId);
  if (!id.startsWith("demo")) return [];
  return DEMO_MESSAGES.map((m) => ({
    ...m,
    conversation_id: id,
  }));
}

export function demoAssistantReply(text: string): {
  reply: string;
  suggestedFilters?: Record<string, string>;
  matchedVehicles: Array<{ id: string; summary: string }>;
} {
  const lower = text.toLowerCase();
  let matched = DEMO_VEHICLES;
  if (lower.includes("suv")) matched = DEMO_VEHICLES.filter((v) => v.body_name === "SUV");
  else if (lower.includes("hibrit") || lower.includes("hybrid"))
    matched = DEMO_VEHICLES.filter((v) => v.fuel_name === "Hibrit");
  else if (lower.includes("elektrik") || lower.includes("togg"))
    matched = DEMO_VEHICLES.filter((v) => v.fuel_name === "Elektrik");
  else if (lower.includes("hatch"))
    matched = DEMO_VEHICLES.filter((v) => v.body_name === "Hatchback");
  else if (lower.includes("bmw")) matched = DEMO_VEHICLES.filter((v) => v.make_name === "BMW");

  const top = matched.slice(0, 3);
  const lines = top
    .map(
      (v) =>
        `• ${v.title} — ${Number(v.price_amount).toLocaleString("tr-TR")} ${v.price_currency} (${v.city})`,
    )
    .join("\n");

  return {
    reply:
      top.length > 0
        ? `İsteğine uygun ${top.length} ilan buldum:\n\n${lines}\n\nDetay için bir ilana dokunabilir veya arama ekranına geçebilirsin.`
        : "Bu kriterlere uygun demo ilan bulamadım. Arama ekranından filtreleyebilirsin.",
    suggestedFilters: lower.includes("suv")
      ? { q: "SUV" }
      : lower.includes("hibrit")
        ? { q: "Hibrit" }
        : undefined,
    matchedVehicles: top.map((v) => ({
      id: v.id,
      summary: `${v.title} · ${Number(v.price_amount).toLocaleString("tr-TR")} ${v.price_currency}`,
    })),
  };
}
