import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  fetchFeaturedVehicles,
  fetchReferenceBrands,
  formatKm,
  formatPrice,
  type Brand,
  type Vehicle,
} from "./api";
import { brandLogoUrl } from "./brand-logos";

const CITIES = ["Erbil", "Baghdad", "Sulaymaniyah", "Basra", "Mosul"] as const;

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=2400&q=80";

const BODY_TYPES = [
  {
    id: "suv",
    label: "SUV",
    q: "SUV",
    image:
      "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "sedan",
    label: "Sedan",
    q: "Sedan",
    image:
      "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "hatch",
    label: "Hatchback",
    q: "Hatchback",
    image:
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "pickup",
    label: "Pickup",
    q: "Pickup",
    image:
      "https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "hybrid",
    label: "Hibrit",
    q: "Hibrit",
    image:
      "https://images.unsplash.com/photo-1593941707881-a5cfde87040b?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "ev",
    label: "Elektrik",
    q: "Elektrik",
    image:
      "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=700&q=80",
  },
] as const;

const LIFESTYLE = [
  { id: "family", label: "Aile araçları", q: "SUV" },
  { id: "luxury", label: "Lüks", q: "Mercedes" },
  { id: "cheap", label: "Uygun fiyat", q: "" },
  { id: "lowkm", label: "Az km", q: "" },
  { id: "private", label: "Bireysel satıcı", q: "" },
  { id: "offroad", label: "Off-road", q: "Pickup" },
  { id: "sport", label: "Sport", q: "Coupe" },
  { id: "commercial", label: "Ticari", q: "Van" },
] as const;

const BUDGETS = [
  { max: 10_000_000, label: "10M altı" },
  { max: 25_000_000, label: "25M altı" },
  { max: 50_000_000, label: "50M altı" },
  { max: 100_000_000, label: "100M altı" },
] as const;

const SERVICES = [
  { id: "taxi", label: "Taksi", desc: "Anında yolculuk", href: "#services" },
  { id: "rent", label: "Kiralama", desc: "Günlük / aylık", href: "#rentals" },
  { id: "auction", label: "Müzayede", desc: "Canlı teklif", href: "#auctions" },
  { id: "wallet", label: "Cüzdan", desc: "Hatwan / IQD", href: "#wallet" },
  { id: "wash", label: "Yıkama", desc: "Mobil servis", href: "#services" },
  { id: "shared", label: "Paylaşımlı", desc: "Şehirler arası", href: "#services" },
  { id: "boost", label: "Boost", desc: "İlan öne çıkar", href: "#sell" },
  { id: "guide", label: "Rehber", desc: "Alım ipuçları", href: "#why" },
] as const;

const WHY = [
  {
    title: "En geniş seçim",
    text: "Irak genelinde ikinci el, kiralama ve yolculuk tek platformda.",
  },
  {
    title: "Şeffaf fiyat",
    text: "Doğrudan satıcı ve galeriler — gizli komisyon yok.",
  },
  {
    title: "Güvenilir satıcılar",
    text: "Doğrulanmış galeriler ve hızlı yanıt rozetleri.",
  },
  {
    title: "AI asistan",
    text: "Marka, bütçe ve şehir için anında öneri.",
  },
] as const;

const DEMO_AUCTIONS = [
  {
    id: "a1",
    title: "Toyota Land Cruiser 2021",
    bid: "95.000.000 IQD",
    bids: 18,
    city: "Erbil",
    cover:
      "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "a2",
    title: "BMW X5 2019",
    bid: "62.500.000 IQD",
    bids: 11,
    city: "Baghdad",
    cover:
      "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "a3",
    title: "Mercedes C 200 2020",
    bid: "48.000.000 IQD",
    bids: 9,
    city: "Sulaymaniyah",
    cover:
      "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80",
  },
] as const;

const DEMO_DEALERS = [
  {
    id: "d1",
    name: "Erbil Auto Gallery",
    city: "Erbil",
    cover:
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "d2",
    name: "Baghdad Motors",
    city: "Baghdad",
    cover:
      "https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "d3",
    name: "Kurdistan Cars",
    city: "Sulaymaniyah",
    cover:
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "d4",
    name: "Basra Drive",
    city: "Basra",
    cover:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
  },
] as const;

type Page = "home" | "privacy" | "terms";

export function App() {
  const [page, setPage] = useState<Page>("home");
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [brandId, setBrandId] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [rows, brandRows] = await Promise.all([
          fetchFeaturedVehicles(48),
          fetchReferenceBrands("tr"),
        ]);
        if (!cancelled) {
          setVehicles(rows);
          setBrands(brandRows);
        }
      } catch {
        if (!cancelled) setError("İlanlar şu an yüklenemedi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalLabel = useMemo(() => {
    if (loading) return "…";
    return vehicles.length.toLocaleString("tr-TR");
  }, [loading, vehicles.length]);

  const featured = useMemo(() => {
    const f = vehicles.filter((v) => v.featured);
    return (f.length > 0 ? f : vehicles).slice(0, 12);
  }, [vehicles]);

  const popularModels = useMemo(() => {
    const map = new Map<
      string,
      { name: string; count: number; cover_url: string | null; price: string }
    >();
    for (const v of vehicles) {
      const name = `${v.make_name ?? ""} ${v.model}`.trim() || v.title_original || v.model;
      if (!name) continue;
      const cur = map.get(name);
      if (cur) {
        cur.count += 1;
        if (!cur.cover_url && v.cover_url) cur.cover_url = v.cover_url;
      } else {
        map.set(name, {
          name,
          count: 1,
          cover_url: v.cover_url,
          price: formatPrice(v.price_amount, v.price_currency),
        });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [vehicles]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (city && (v.city || "").toLowerCase() !== city.toLowerCase()) return false;
      if (brandId != null && v.make_id !== brandId) return false;
      if (maxPrice != null) {
        const n = typeof v.price_amount === "string" ? Number(v.price_amount) : v.price_amount;
        if (Number.isFinite(n) && n > maxPrice) return false;
      }
      if (!needle) return true;
      const hay = `${v.title_original ?? ""} ${v.model} ${v.make_name ?? ""} ${v.city ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [vehicles, q, city, brandId, maxPrice]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    document.getElementById("listings")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goHome = () => {
    setPage("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollRail = (dir: -1 | 1) => {
    railRef.current?.scrollBy({ left: dir * 340, behavior: "smooth" });
  };

  const filterTo = (text: string) => {
    setQ(text);
    setBrandId(null);
    document.getElementById("listings")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const titleOf = (v: Vehicle) =>
    v.title_original || `${v.make_name ?? ""} ${v.model}`.trim() || "İlan";

  if (page === "privacy" || page === "terms") {
    return (
      <LegalPage
        title={page === "privacy" ? "Gizlilik Politikası" : "Kullanım Şartları"}
        onBack={goHome}
        body={
          page === "privacy"
            ? [
                "Seyyare, hesap, ilan ve yolculuk verilerini hizmeti sunmak için işler.",
                "Oturum jetonları cihazda güvenli saklanır.",
                "Soft-launch döneminde veriler demo ortamında tutulabilir.",
              ]
            : [
                "Platform araç ilanı, kiralama ve yolculuk eşleştirmesi için aracılık katmanıdır.",
                "İlan içerikleri satıcı/bayiye aittir.",
                "Demo hesaplar yalnızca test içindir.",
              ]
        }
      />
    );
  }

  return (
    <div className="dc">
      {/* —— White sticky nav (DubiCars) —— */}
      <header className="dc-nav">
        <div className="dc-nav__inner">
          <button type="button" className="dc-nav__brand" onClick={goHome}>
            <img src="/brand/seyyare-mark-light.png" alt="" width={32} height={32} />
            <span>
              seyyare<span>.men</span>
            </span>
          </button>

          <nav className="dc-nav__links" aria-label="Ana menü">
            <a href="#listings">İkinci el</a>
            <a href="#rentals">Kiralama</a>
            <a href="#services">Taksi</a>
            <a href="#auctions">Müzayede</a>
            <a href="#why">Değer biç</a>
            <a href="#sell">Sat</a>
          </nav>

          <div className="dc-nav__actions">
            <span className="dc-nav__lang" aria-hidden>
              🇮🇶 TR
            </span>
            <a className="dc-btn dc-btn--outline" href="#sell">
              Aracını sat
            </a>
            <a className="dc-btn dc-btn--soft" href="#app">
              Giriş
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* —— Hero + floating search —— */}
        <section className="dc-hero" aria-label="Seyyare">
          <div className="dc-hero__frame">
            <img className="dc-hero__img" src={HERO_IMAGE} alt="" />
            <div className="dc-hero__veil" />
            <div className="dc-hero__copy">
              <h1>
                Irak araç
                <br />
                <em>pazarı</em>
              </h1>
              <p>Hayalindeki aracı bul — al, kirala, yolculuk et</p>
            </div>

            <div className="dc-search-wrap">
              <form className="dc-search" onSubmit={onSearch}>
                <p className="dc-search__title">Hayalindeki aracı bul</p>
                <div className="dc-search__bar">
                  <span className="dc-search__ico" aria-hidden>
                    ⌕
                  </span>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Marka, model veya anahtar kelime"
                    autoComplete="off"
                  />
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    aria-label="Şehir"
                  >
                    <option value="">Tüm şehirler</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="dc-search__go">
                    {totalLabel} ilan ara
                  </button>
                </div>
                <div className="dc-search__budgets">
                  {BUDGETS.map((b) => (
                    <button
                      key={b.max}
                      type="button"
                      className={maxPrice === b.max ? "is-on" : ""}
                      onClick={() => {
                        setMaxPrice(maxPrice === b.max ? null : b.max);
                        document
                          .getElementById("listings")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* —— Our top picks —— */}
        <section className="dc-sec" id="picks">
          <div className="dc-sec__head">
            <h2>Öne çıkanlar</h2>
            <a href="#listings">
              Tümünü gör <span aria-hidden>›</span>
            </a>
          </div>
          <div className="dc-rail-wrap">
            <button
              type="button"
              className="dc-rail-btn dc-rail-btn--prev"
              onClick={() => scrollRail(-1)}
              aria-label="Sola"
            >
              ‹
            </button>
            <div className="dc-rail" ref={railRef} role="list">
              {(loading ? Array.from({ length: 5 }) : featured).map((item, i) =>
                item ? (
                  <article key={item.id} className="dc-card" role="listitem">
                    <div className="dc-card__media">
                      {item.cover_url ? (
                        <img src={item.cover_url} alt="" loading="lazy" />
                      ) : (
                        <div className="dc-skel" />
                      )}
                      <span className="dc-badge">Öne çıkan</span>
                    </div>
                    <div className="dc-card__body">
                      <h3>{titleOf(item)}</h3>
                      <p className="dc-price">
                        {formatPrice(item.price_amount, item.price_currency)}
                      </p>
                      <p className="dc-meta">
                        {item.year}
                        <span>|</span>
                        {formatKm(item.mileage_km)}
                        <span>|</span>
                        {item.city || "—"}
                      </p>
                    </div>
                  </article>
                ) : (
                  <div key={`sk-${i}`} className="dc-card dc-card--skel" aria-hidden />
                ),
              )}
            </div>
            <button
              type="button"
              className="dc-rail-btn dc-rail-btn--next"
              onClick={() => scrollRail(1)}
              aria-label="Sağa"
            >
              ›
            </button>
          </div>
        </section>

        {/* —— Seyyare services (extra) —— */}
        <section className="dc-sec" id="services">
          <div className="dc-sec__head">
            <h2>Seyyare servisleri</h2>
            <button type="button" className="dc-linkbtn" onClick={() => setMoreOpen((v) => !v)}>
              {moreOpen ? "Gizle" : "Daha fazla"}
            </button>
          </div>
          <div className="dc-services">
            {SERVICES.slice(0, moreOpen ? SERVICES.length : 4).map((s) => (
              <a key={s.id} className="dc-service" href={s.href}>
                <strong>{s.label}</strong>
                <span>{s.desc}</span>
              </a>
            ))}
          </div>
          <div className="dc-trust">
            <span>Doğrulanmış satıcı</span>
            <span>AI asistan</span>
            <span>Cüzdan ödemesi</span>
          </div>
        </section>

        {/* —— Live auctions (extra) —— */}
        <section className="dc-sec" id="auctions">
          <div className="dc-sec__head">
            <h2>Canlı müzayedeler</h2>
            <a href="#auctions">
              Tümünü gör <span aria-hidden>›</span>
            </a>
          </div>
          <div className="dc-rail">
            {DEMO_AUCTIONS.map((a) => (
              <article key={a.id} className="dc-card dc-card--auction">
                <div className="dc-card__media">
                  <img src={a.cover} alt="" loading="lazy" />
                  <span className="dc-badge dc-badge--live">Canlı</span>
                </div>
                <div className="dc-card__body">
                  <h3>{a.title}</h3>
                  <p className="dc-price">{a.bid}</p>
                  <p className="dc-meta">
                    {a.bids} teklif
                    <span>|</span>
                    {a.city}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* —— Dealers —— */}
        <section className="dc-sec" id="dealers">
          <div className="dc-sec__head">
            <h2>Öne çıkan galeriler</h2>
            <a href="#dealers">
              Tüm galeriler <span aria-hidden>›</span>
            </a>
          </div>
          <div className="dc-rail">
            {DEMO_DEALERS.map((d) => (
              <article key={d.id} className="dc-dealer">
                <img src={d.cover} alt="" loading="lazy" />
                <div>
                  <h3>{d.name}</h3>
                  <p>{d.city}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* —— Sell CTA strip —— */}
        <section className="dc-cta" id="sell">
          <div className="dc-cta__inner">
            <div>
              <h2>Aracını şimdi sat</h2>
              <p>Ücretsiz ilan · galeri ve bireysel satıcılar · soft-launch hazır</p>
            </div>
            <a className="dc-btn dc-btn--solid" href="#app">
              Satmaya başla
            </a>
          </div>
        </section>

        {/* —— Popular brands —— */}
        <section className="dc-panel" id="brands">
          <div className="dc-panel__inner">
            <div className="dc-sec__head dc-sec__head--ink">
              <h2>Popüler markalar</h2>
              {brandId != null ? (
                <button type="button" className="dc-linkbtn" onClick={() => setBrandId(null)}>
                  Filtreyi kaldır
                </button>
              ) : (
                <a href="#listings">Tümünü gör ›</a>
              )}
            </div>
            <div className="dc-brands">
              {brands.slice(0, 12).map((b) => {
                const src = brandLogoUrl(b.name, b.name_en);
                const on = brandId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    className={`dc-brand ${on ? "is-on" : ""}`}
                    onClick={() => setBrandId(on ? null : b.id)}
                  >
                    <span className="dc-brand__logo">
                      {src ? (
                        <img
                          src={src}
                          alt=""
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : null}
                      <em>{b.name.charAt(0)}</em>
                    </span>
                    <span>{b.name.replace("Mercedes-Benz", "Mercedes")}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* —— Lifestyle categories (DubiCars chips) —— */}
        <section className="dc-sec" id="lifestyle">
          <div className="dc-sec__head">
            <h2>Kategorilere göz at</h2>
          </div>
          <div className="dc-chips">
            {LIFESTYLE.map((c) => (
              <button key={c.id} type="button" onClick={() => filterTo(c.q || c.label)}>
                {c.label}
              </button>
            ))}
          </div>
        </section>

        {/* —— Body type image cats —— */}
        <section className="dc-sec" id="cats">
          <div className="dc-sec__head">
            <h2>Kasa tipi</h2>
          </div>
          <div className="dc-cats">
            {BODY_TYPES.map((b) => (
              <button key={b.id} type="button" className="dc-cat" onClick={() => filterTo(b.q)}>
                <img src={b.image} alt="" loading="lazy" />
                <span>{b.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* —— Popular models —— */}
        {popularModels.length > 0 ? (
          <section className="dc-sec" id="models">
            <div className="dc-sec__head">
              <h2>Popüler modeller</h2>
              <a href="#listings">Tümünü gör ›</a>
            </div>
            <div className="dc-rail">
              {popularModels.map((m) => (
                <button
                  key={m.name}
                  type="button"
                  className="dc-model"
                  onClick={() => filterTo(m.name)}
                >
                  <div className="dc-model__media">
                    {m.cover_url ? (
                      <img src={m.cover_url} alt="" loading="lazy" />
                    ) : (
                      <div className="dc-skel" />
                    )}
                  </div>
                  <div className="dc-model__body">
                    <h3>{m.name}</h3>
                    <p>
                      {m.count} ilan · <strong>{m.price}</strong>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {/* —— Why buy —— */}
        <section className="dc-panel dc-panel--why" id="why">
          <div className="dc-panel__inner">
            <h2 className="dc-why__title">Neden Seyyare?</h2>
            <div className="dc-why">
              {WHY.map((w) => (
                <article key={w.title}>
                  <h3>{w.title}</h3>
                  <p>{w.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* —— Rentals (extra) —— */}
        <section className="dc-sec" id="rentals">
          <div className="dc-sec__head">
            <h2>Kiralık araçlar</h2>
            <a href="#app">Uygulamada kirala ›</a>
          </div>
          <div className="dc-rail">
            {featured.slice(0, 6).map((item) => (
              <article key={`r-${item.id}`} className="dc-card">
                <div className="dc-card__media">
                  {item.cover_url ? (
                    <img src={item.cover_url} alt="" loading="lazy" />
                  ) : (
                    <div className="dc-skel" />
                  )}
                  <span className="dc-badge dc-badge--rent">Kiralık</span>
                </div>
                <div className="dc-card__body">
                  <h3>{titleOf(item)}</h3>
                  <p className="dc-price">
                    {Math.round(
                      (typeof item.price_amount === "string"
                        ? Number(item.price_amount)
                        : item.price_amount) / 120,
                    ).toLocaleString("tr-TR")}{" "}
                    IQD / gün
                  </p>
                  <p className="dc-meta">{item.city || "—"}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* —— Wallet (extra) —— */}
        <section className="dc-wallet" id="wallet">
          <div className="dc-wallet__inner">
            <div>
              <p className="dc-eyebrow">Ödeme</p>
              <h2>Cüzdan & Hatwan</h2>
              <p>IQD ve yerel yöntemlerle güvenli ödeme — soft-launch cüzdan hazır.</p>
            </div>
            <a className="dc-btn dc-btn--solid" href="#app">
              Cüzdanı aç
            </a>
          </div>
        </section>

        {/* —— AI strip (extra) —— */}
        <section className="dc-ai" id="ai">
          <div className="dc-ai__icon" aria-hidden>
            ✦
          </div>
          <div>
            <h2>AI asistan</h2>
            <p>Bütçe, şehir ve markaya göre öneri al — uygulamada sohbet et.</p>
          </div>
          <a className="dc-btn dc-btn--outline-light" href="#app">
            Sor
          </a>
        </section>

        {/* —— All listings —— */}
        <section className="dc-panel" id="listings">
          <div className="dc-panel__inner">
            <div className="dc-sec__head dc-sec__head--ink">
              <h2>İlanlar</h2>
              <p className="dc-count">{loading ? "…" : `${list.length} sonuç`}</p>
            </div>
            {error ? <p className="dc-alert">{error}</p> : null}
            <div className="dc-grid">
              {(loading ? Array.from({ length: 8 }) : list).map((item, i) =>
                item ? (
                  <article key={item.id} className="dc-card dc-card--grid">
                    <div className="dc-card__media">
                      {item.cover_url ? (
                        <img src={item.cover_url} alt="" loading="lazy" />
                      ) : (
                        <div className="dc-skel" />
                      )}
                      {item.featured ? <span className="dc-badge">Öne çıkan</span> : null}
                    </div>
                    <div className="dc-card__body">
                      <h3>{titleOf(item)}</h3>
                      <p className="dc-price">
                        {formatPrice(item.price_amount, item.price_currency)}
                      </p>
                      <p className="dc-meta">
                        {item.year}
                        <span>|</span>
                        {formatKm(item.mileage_km)}
                        <span>|</span>
                        {item.city || "—"}
                      </p>
                    </div>
                  </article>
                ) : (
                  <div key={`gsk-${i}`} className="dc-card dc-card--skel" aria-hidden />
                ),
              )}
            </div>
          </div>
        </section>

        {/* —— App download —— */}
        <section className="dc-app" id="app">
          <img src="/brand/seyyare-mark-dark.png" alt="" width={48} height={48} />
          <div>
            <h2>Mobilde devam et</h2>
            <p>Android soft APK hazır · mağaza yayını prod domain sonrası.</p>
          </div>
        </section>
      </main>

      <footer className="dc-foot">
        <div className="dc-foot__inner">
          <div className="dc-foot__brand">
            <img src="/brand/seyyare-mark-light.png" alt="" width={24} height={24} />
            <span>
              seyyare<span>.men</span>
            </span>
          </div>
          <div className="dc-foot__cols">
            <div>
              <h4>Alışveriş</h4>
              <a href="#listings">İkinci el</a>
              <a href="#rentals">Kiralama</a>
              <a href="#auctions">Müzayede</a>
            </div>
            <div>
              <h4>Servisler</h4>
              <a href="#services">Taksi</a>
              <a href="#wallet">Cüzdan</a>
              <a href="#ai">AI asistan</a>
            </div>
            <div>
              <h4>Şirket</h4>
              <button type="button" onClick={() => setPage("privacy")}>
                Gizlilik
              </button>
              <button type="button" onClick={() => setPage("terms")}>
                Şartlar
              </button>
            </div>
          </div>
          <p>© {new Date().getFullYear()} Seyyare · Irak araç pazarı</p>
        </div>
      </footer>
    </div>
  );
}

function LegalPage({
  title,
  body,
  onBack,
}: {
  title: string;
  body: string[];
  onBack: () => void;
}) {
  return (
    <div className="dc-legal">
      <button type="button" className="dc-btn dc-btn--outline" onClick={onBack}>
        ← Ana sayfa
      </button>
      <h1>{title}</h1>
      {body.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </div>
  );
}
