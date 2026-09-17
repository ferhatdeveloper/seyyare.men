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
    price_amount: 74000000,
    price_currency: "IQD",
    country_code: "TR",
    city: "Baghdad",
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
    price_amount: 58000000,
    price_currency: "IQD",
    country_code: "TR",
    city: "Erbil",
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
    price_amount: 67200000,
    price_currency: "IQD",
    country_code: "TR",
    city: "Basra",
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
    price_amount: 128000000,
    price_currency: "IQD",
    country_code: "TR",
    city: "Baghdad",
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
    price_amount: 78000000,
    price_currency: "IQD",
    country_code: "TR",
    city: "Mosul",
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
    price_amount: 52800000,
    price_currency: "IQD",
    country_code: "TR",
    city: "Sulaymaniyah",
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
    price_amount: 60800000,
    price_currency: "IQD",
    country_code: "TR",
    city: "Kirkuk",
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
    price_amount: 35600000,
    price_currency: "IQD",
    country_code: "TR",
    city: "Baghdad",
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
    daily_rate_amount: 160_000,
    daily_rate_currency: "IQD",
    weekly_rate_amount: 750_000,
    monthly_rate_amount: 1_850_000,
    deposit_amount: 600_000,
    min_days: 1,
    max_days: 30,
    insurance_included: true,
    instant_book: true,
    age_requirement: 21,
    delivery_available: true,
    airport_delivery: true,
    airport_delivery_fee: 25_000,
    country_code: "IQ",
    city: "Erbil",
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
    daily_rate_amount: 112_000,
    daily_rate_currency: "IQD",
    weekly_rate_amount: 640_000,
    monthly_rate_amount: 1_450_000,
    deposit_amount: 480_000,
    min_days: 2,
    max_days: 21,
    insurance_included: true,
    instant_book: false,
    age_requirement: 21,
    delivery_available: true,
    airport_delivery: true,
    airport_delivery_fee: 35_000,
    country_code: "IQ",
    city: "Duhok",
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
    daily_rate_amount: 96_000,
    daily_rate_currency: "IQD",
    weekly_rate_amount: 560_000,
    monthly_rate_amount: 1_200_000,
    deposit_amount: 400_000,
    min_days: 1,
    max_days: 45,
    insurance_included: false,
    instant_book: true,
    age_requirement: 21,
    delivery_available: false,
    airport_delivery: false,
    airport_delivery_fee: 0,
    country_code: "IQ",
    city: "Sulaymaniyah",
    vehicle: rentalVehicle(
      "demo-vw-tiguan",
      "Volkswagen Tiguan 1.5 TSI",
      2020,
      img("photo-1606664515524-ed2f786a0bd6"),
    ),
    owner: DEMO_RENTAL_OWNER,
  },
  {
    id: "demo-rental-4",
    vehicle_id: "demo-toyota-corolla",
    daily_rate_amount: 60_000,
    daily_rate_currency: "IQD",
    weekly_rate_amount: 350_000,
    monthly_rate_amount: 900_000,
    deposit_amount: 250_000,
    min_days: 1,
    max_days: 30,
    insurance_included: true,
    instant_book: true,
    age_requirement: 21,
    delivery_available: true,
    airport_delivery: true,
    airport_delivery_fee: 20_000,
    country_code: "IQ",
    city: "Baghdad",
    vehicle: rentalVehicle(
      "demo-toyota-corolla",
      "Toyota Corolla Hybrid",
      2022,
      img("photo-1621007947382-bb3c3994e3fb"),
    ),
    owner: DEMO_RENTAL_OWNER,
  },
];

export type DemoRental = (typeof DEMO_RENTALS)[number];

export function getDemoRental(id: string): DemoRental | undefined {
  return DEMO_RENTALS.find((r) => r.id === id);
}

export type PartnerListingStatus = "live" | "pending" | "paused";

export type DemoPartnerSale = {
  id: string;
  title: string;
  city: string;
  price: number;
  currency: "IQD";
  views: number;
  status: PartnerListingStatus;
};

export type DemoPartnerBooking = {
  id: string;
  rentalTitle: string;
  guest: string;
  city: string;
  start: string;
  end: string;
  amount: number;
  currency: "IQD";
  status: "pending" | "accepted" | "rejected";
};

export type DemoContract = {
  id: string;
  type: "sale" | "rental";
  title: string;
  party: string;
  amount: number;
  currency: "IQD";
  locale: string;
  createdAt: string;
  status: "draft" | "signed" | "active";
};

export const DEMO_PARTNER_STATS = {
  liveSales: 6,
  liveRentals: DEMO_RENTALS.length,
  pending: 2,
  monthViews: 1840,
};

export const DEMO_PARTNER_SALES: DemoPartnerSale[] = [
  {
    id: "ps1",
    title: "BMW 320i M Sport",
    city: "Erbil",
    price: 74_000_000,
    currency: "IQD",
    views: 312,
    status: "live",
  },
  {
    id: "ps2",
    title: "Togg T10X",
    city: "Duhok",
    price: 82_000_000,
    currency: "IQD",
    views: 198,
    status: "live",
  },
  {
    id: "ps3",
    title: "Mercedes C 200",
    city: "Sulaymaniyah",
    price: 110_000_000,
    currency: "IQD",
    views: 87,
    status: "pending",
  },
];

export const DEMO_PARTNER_BOOKINGS: DemoPartnerBooking[] = [
  {
    id: "pb1",
    rentalTitle: "BMW 320i · Erbil",
    guest: "A. Karim",
    city: "Erbil",
    start: "2026-09-20",
    end: "2026-09-23",
    amount: 480_000,
    currency: "IQD",
    status: "pending",
  },
  {
    id: "pb2",
    rentalTitle: "Togg T10X · Duhok",
    guest: "S. Hassan",
    city: "Duhok",
    start: "2026-09-18",
    end: "2026-09-21",
    amount: 336_000,
    currency: "IQD",
    status: "pending",
  },
  {
    id: "pb3",
    rentalTitle: "Corolla Hybrid · Baghdad",
    guest: "M. Ali",
    city: "Baghdad",
    start: "2026-09-10",
    end: "2026-09-14",
    amount: 240_000,
    currency: "IQD",
    status: "accepted",
  },
];

export const DEMO_CONTRACTS: DemoContract[] = [
  {
    id: "c1",
    type: "sale",
    title: "Satış sözleşmesi · BMW 320i",
    party: "K. A.",
    amount: 72_000_000,
    currency: "IQD",
    locale: "ar",
    createdAt: "2026-09-12",
    status: "signed",
  },
  {
    id: "c2",
    type: "rental",
    title: "Kiralama sözleşmesi · Togg T10X",
    party: "S. Hassan",
    amount: 336_000,
    currency: "IQD",
    locale: "ku-sor",
    createdAt: "2026-09-14",
    status: "active",
  },
];

export type DriverTripKind = "taxi" | "shared" | "airport";

export type DemoDriverTrip = {
  id: string;
  kind: DriverTripKind;
  from: string;
  to: string;
  fare: number;
  currency: "IQD";
  seats?: number;
  status: "incoming" | "active" | "done";
  etaMin: number;
};

export const DEMO_DRIVER_STATS = {
  todayEarnings: 186_000,
  tripsToday: 7,
  rating: 4.9,
  onlineHours: 5.2,
};

export const DEMO_DRIVER_TRIPS: DemoDriverTrip[] = [
  {
    id: "dt1",
    kind: "taxi",
    from: "Erbil Downtown",
    to: "Ankawa",
    fare: 28_000,
    currency: "IQD",
    status: "incoming",
    etaMin: 4,
  },
  {
    id: "dt2",
    kind: "shared",
    from: "Erbil",
    to: "Duhok",
    fare: 18_000,
    currency: "IQD",
    seats: 2,
    status: "incoming",
    etaMin: 12,
  },
  {
    id: "dt3",
    kind: "airport",
    from: "Erbil Airport",
    to: "Italian Village",
    fare: 42_000,
    currency: "IQD",
    status: "active",
    etaMin: 18,
  },
  {
    id: "dt4",
    kind: "taxi",
    from: "Family Mall",
    to: "100m Street",
    fare: 22_000,
    currency: "IQD",
    status: "done",
    etaMin: 0,
  },
];

/** Intercity shared-ride corridors (product surface beyond taxi mode chip). */
export type DemoSharedRoute = {
  id: string;
  from: string;
  to: string;
  seats: number;
  price: number;
  currency: "IQD";
  departure: string;
  durationMin: number;
  femaleOnly: boolean;
};

export const DEMO_SHARED_ROUTES: DemoSharedRoute[] = [
  {
    id: "sr-erbil-duhok",
    from: "Erbil",
    to: "Duhok",
    seats: 3,
    price: 18_000,
    currency: "IQD",
    departure: "Bugün · 15:30",
    durationMin: 95,
    femaleOnly: false,
  },
  {
    id: "sr-erbil-suli",
    from: "Erbil",
    to: "Sulaymaniyah",
    seats: 2,
    price: 22_000,
    currency: "IQD",
    departure: "Bugün · 17:00",
    durationMin: 130,
    femaleOnly: true,
  },
  {
    id: "sr-baghdad-erbil",
    from: "Baghdad",
    to: "Erbil",
    seats: 4,
    price: 45_000,
    currency: "IQD",
    departure: "Yarın · 08:00",
    durationMin: 240,
    femaleOnly: false,
  },
  {
    id: "sr-duhok-erbil",
    from: "Duhok",
    to: "Erbil",
    seats: 1,
    price: 17_000,
    currency: "IQD",
    departure: "Bugün · 19:15",
    durationMin: 100,
    femaleOnly: true,
  },
  {
    id: "sr-erbil-kirkuk",
    from: "Erbil",
    to: "Kirkuk",
    seats: 3,
    price: 15_000,
    currency: "IQD",
    departure: "Yarın · 10:30",
    durationMin: 75,
    femaleOnly: false,
  },
  {
    id: "sr-suli-baghdad",
    from: "Sulaymaniyah",
    to: "Baghdad",
    seats: 2,
    price: 48_000,
    currency: "IQD",
    departure: "Yarın · 06:45",
    durationMin: 280,
    femaleOnly: false,
  },
];

export type AuctionStatus = "live" | "upcoming" | "ended";

export type DemoAuctionBid = {
  id: string;
  bidder: string;
  amount: number;
  currency: "IQD" | "USD";
  at: string;
};

export type DemoAuction = {
  id: string;
  vehicle_id: string;
  title: string;
  cover_url: string;
  city: string;
  status: AuctionStatus;
  start_at: string;
  end_at: string;
  start_price: number;
  reserve_price: number | null;
  current_bid: number;
  currency: "IQD" | "USD";
  bid_count: number;
  min_increment: number;
  bids: DemoAuctionBid[];
};

const hoursFromNow = (h: number) =>
  new Date(Date.now() + h * 3600_000).toISOString();

export const DEMO_AUCTIONS: DemoAuction[] = [
  {
    id: "auction-bmw-live",
    vehicle_id: "demo-bmw-320i",
    title: "BMW 320i M Sport · Açık artırma",
    cover_url: img("photo-1555215695-3004980ad54e"),
    city: "Erbil",
    status: "live",
    start_at: hoursFromNow(-6),
    end_at: hoursFromNow(18),
    start_price: 55_000_000,
    reserve_price: 68_000_000,
    current_bid: 62_500_000,
    currency: "IQD",
    bid_count: 7,
    min_increment: 250_000,
    bids: [
      {
        id: "b1",
        bidder: "K. A.",
        amount: 62_500_000,
        currency: "IQD",
        at: hoursFromNow(-0.5),
      },
      {
        id: "b2",
        bidder: "S. M.",
        amount: 61_000_000,
        currency: "IQD",
        at: hoursFromNow(-2),
      },
      {
        id: "b3",
        bidder: "R. H.",
        amount: 58_000_000,
        currency: "IQD",
        at: hoursFromNow(-4),
      },
    ],
  },
  {
    id: "auction-togg-live",
    vehicle_id: "demo-togg-t10x",
    title: "Togg T10X · Canlı müzayede",
    cover_url: img("photo-1617788138017-80ad40651399"),
    city: "Duhok",
    status: "live",
    start_at: hoursFromNow(-2),
    end_at: hoursFromNow(8),
    start_price: 48_000_000,
    reserve_price: 70_000_000,
    current_bid: 52_000_000,
    currency: "IQD",
    bid_count: 4,
    min_increment: 500_000,
    bids: [
      {
        id: "t1",
        bidder: "A. N.",
        amount: 52_000_000,
        currency: "IQD",
        at: hoursFromNow(-0.2),
      },
      {
        id: "t2",
        bidder: "M. K.",
        amount: 50_000_000,
        currency: "IQD",
        at: hoursFromNow(-1),
      },
    ],
  },
  {
    id: "auction-merc-soon",
    vehicle_id: "demo-mercedes-c200",
    title: "Mercedes C 200 AMG · Yakında",
    cover_url: img("photo-1618843479313-40f8afb4b4d8"),
    city: "Sulaymaniyah",
    status: "upcoming",
    start_at: hoursFromNow(24),
    end_at: hoursFromNow(72),
    start_price: 95_000_000,
    reserve_price: 110_000_000,
    current_bid: 95_000_000,
    currency: "IQD",
    bid_count: 0,
    min_increment: 500_000,
    bids: [],
  },
  {
    id: "auction-corolla-ended",
    vehicle_id: "demo-toyota-corolla",
    title: "Toyota Corolla Hybrid · Sona erdi",
    cover_url: img("photo-1621007947382-bb3c3994e3fb"),
    city: "Kirkuk",
    status: "ended",
    start_at: hoursFromNow(-72),
    end_at: hoursFromNow(-2),
    start_price: 40_000_000,
    reserve_price: 50_000_000,
    current_bid: 54_200_000,
    currency: "IQD",
    bid_count: 11,
    min_increment: 200_000,
    bids: [
      {
        id: "c1",
        bidder: "Winner",
        amount: 54_200_000,
        currency: "IQD",
        at: hoursFromNow(-2.1),
      },
    ],
  },
];

export function getDemoAuction(id: string): DemoAuction | undefined {
  return DEMO_AUCTIONS.find((a) => a.id === id);
}

export function listLiveAuctions(): DemoAuction[] {
  return DEMO_AUCTIONS.filter((a) => a.status === "live").map((a) =>
    withDemoLiveBidTick(a),
  );
}

/** Soft live stub: bump current bid every 4s window so polling UI visibly updates. */
export function withDemoLiveBidTick(auction: DemoAuction): DemoAuction {
  if (auction.status !== "live") return auction;
  const tick = Math.floor(Date.now() / 4000);
  const bump = (tick % 3) * auction.min_increment;
  const current = auction.current_bid + bump;
  if (bump === 0) return auction;
  const phantom: DemoAuctionBid = {
    id: `tick-${auction.id}-${tick}`,
    bidder: "Canlı",
    amount: current,
    currency: auction.currency,
    at: new Date().toISOString(),
  };
  return {
    ...auction,
    current_bid: current,
    bid_count: auction.bid_count + (tick % 3),
    bids: [phantom, ...auction.bids.filter((b) => b.amount < current)],
  };
}

export type DemoAuctionBidRow = {
  id: string;
  auction_id: string;
  bidder_id: string;
  bidder_label: string;
  amount: number;
  created_at: string;
};

export function listDemoAuctionBids(
  auctionId: string,
  limit = 40,
): DemoAuctionBidRow[] {
  const base = getDemoAuction(auctionId);
  if (!base) return [];
  const auction = withDemoLiveBidTick(base);
  return auction.bids.slice(0, Math.max(1, limit)).map((b) => ({
    id: b.id,
    auction_id: auction.id,
    bidder_id: `demo-${b.id}`,
    bidder_label: b.bidder,
    amount: b.amount,
    created_at: b.at,
  }));
}

export function mapBookingStatusToPartner(
  status: string,
): DemoPartnerBooking["status"] {
  if (status === "rejected" || status === "cancelled") return "rejected";
  if (status === "confirmed" || status === "active" || status === "completed")
    return "accepted";
  return "pending";
}

export function listDemoMyBookings(): DemoPartnerBooking[] {
  return DEMO_PARTNER_BOOKINGS;
}

export function createDemoBooking(args: {
  rental_id: string;
  start_date: string;
  end_date: string;
  total_amount?: number;
  currency?: string;
}): Record<string, unknown> {
  const rental = getDemoRental(args.rental_id);
  const start = args.start_date;
  const end = args.end_date;
  const days =
    Math.ceil(
      (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000,
    ) + 1;
  const amount =
    args.total_amount ??
    Number(rental?.daily_rate_amount ?? 0) * Math.max(1, days);
  return {
    id: `demo-booking-${Date.now()}`,
    rental_id: args.rental_id,
    renter_id: "demo-user",
    start_date: start,
    end_date: end,
    total_days: Math.max(1, days),
    total_amount: amount,
    currency: args.currency ?? rental?.daily_rate_currency ?? "IQD",
    status: "pending",
    created_at: new Date().toISOString(),
  };
}

/** PostgREST auction row → UI DemoAuction shape */
export function normalizeAuctionRow(row: Record<string, unknown>): DemoAuction {
  const statusRaw = String(row.status ?? "live");
  const status: AuctionStatus =
    statusRaw === "upcoming"
      ? "upcoming"
      : statusRaw === "ended" || statusRaw === "cancelled"
        ? "ended"
        : "live";
  const currency = row.currency === "USD" ? "USD" : "IQD";
  const endAt = String(row.ends_at ?? row.end_at ?? new Date().toISOString());
  const startAt = String(row.start_at ?? row.created_at ?? endAt);
  return {
    id: String(row.id),
    vehicle_id: String(row.vehicle_id ?? ""),
    title: String(row.title ?? ""),
    cover_url: String(row.cover_url ?? ""),
    city: String(row.city ?? ""),
    status,
    start_at: startAt,
    end_at: endAt,
    start_price: Number(row.start_price ?? 0),
    reserve_price:
      row.reserve_price == null || row.reserve_price === ""
        ? null
        : Number(row.reserve_price),
    current_bid: Number(row.current_bid ?? row.start_price ?? 0),
    currency,
    bid_count: Number(row.bid_count ?? 0),
    min_increment: Number(row.min_increment ?? 250_000),
    bids: Array.isArray(row.bids)
      ? (row.bids as DemoAuctionBid[])
      : [],
  };
}

export function getAuctionForVehicle(vehicleId: string): DemoAuction | undefined {
  const active = DEMO_AUCTIONS.find(
    (a) => a.vehicle_id === vehicleId && a.status !== "ended",
  );
  if (active) return active;
  return DEMO_AUCTIONS.find((a) => a.vehicle_id === vehicleId);
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

  const city =
    typeof args.p_city === "string" && args.p_city.trim() ? args.p_city.trim().toLowerCase() : "";
  if (city) {
    list = list.filter((v) => String(v.city ?? "").toLowerCase() === city);
  }

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
    city: "Baghdad",
    country_code: "IQ",
    address: "Karada District, Baghdad",
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
    city: "Erbil",
    country_code: "IQ",
    address: "100 Meter Street, Erbil",
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
    city: "Basra",
    country_code: "IQ",
    address: "Corniche Street, Basra",
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
    city: "Sulaymaniyah",
    country_code: "IQ",
    address: "Salim Street, Sulaymaniyah",
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
  Baghdad: "demo-seller",
  Erbil: "demo-store-anadolu",
  Mosul: "demo-store-anadolu",
  Basra: "demo-store-ege",
  Kirkuk: "demo-store-ege",
  Sulaymaniyah: "demo-store-akdeniz",
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
      seller_verified: store.verified,
      seller_rating_avg: store.rating_avg,
      verified: v.verified ?? store.verified,
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
