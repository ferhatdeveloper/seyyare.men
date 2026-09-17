/** Seyyare ödeme yöntemleri — Irak yerel + global (demo UI; gerçek PSP sonra) */

export type PayMethodId =
  | "cash"
  | "seyyare_wallet"
  | "fastpay"
  | "fib"
  | "zaincash"
  | "qi_card"
  | "nasswallet"
  | "stripe"
  | "apple_pay"
  | "google_pay";

export type PayRegion = "iraq" | "global" | "local";

export type PayMethodDef = {
  id: PayMethodId;
  /** i18n key under wallet.methods.* */
  labelKey: string;
  region: PayRegion;
  /** Kısa marka metni (chip’te görünen) */
  brand: string;
  /** Taxi / checkout’ta varsayılan olarak göster */
  taxiDefault?: boolean;
};

export const PAY_METHODS: PayMethodDef[] = [
  {
    id: "cash",
    labelKey: "cash",
    region: "local",
    brand: "Cash",
    taxiDefault: true,
  },
  {
    id: "seyyare_wallet",
    labelKey: "wallet",
    region: "local",
    brand: "Seyyare",
    taxiDefault: true,
  },
  {
    id: "fastpay",
    labelKey: "fastpay",
    region: "iraq",
    brand: "FastPay",
    taxiDefault: true,
  },
  {
    id: "fib",
    labelKey: "fib",
    region: "iraq",
    brand: "FIB",
    taxiDefault: true,
  },
  {
    id: "zaincash",
    labelKey: "zaincash",
    region: "iraq",
    brand: "ZainCash",
    taxiDefault: true,
  },
  {
    id: "qi_card",
    labelKey: "qiCard",
    region: "iraq",
    brand: "Qi Card",
  },
  {
    id: "nasswallet",
    labelKey: "nasswallet",
    region: "iraq",
    brand: "NassWallet",
  },
  {
    id: "stripe",
    labelKey: "stripe",
    region: "global",
    brand: "Stripe",
    taxiDefault: true,
  },
  {
    id: "apple_pay",
    labelKey: "applePay",
    region: "global",
    brand: "Apple Pay",
  },
  {
    id: "google_pay",
    labelKey: "googlePay",
    region: "global",
    brand: "Google Pay",
  },
];

export function getPayMethod(id: PayMethodId): PayMethodDef {
  return PAY_METHODS.find((m) => m.id === id) ?? PAY_METHODS[0];
}

export function isPayMethodId(value: string | undefined): value is PayMethodId {
  return PAY_METHODS.some((m) => m.id === value);
}

export const IRAQ_METHODS = PAY_METHODS.filter((m) => m.region === "iraq");
export const GLOBAL_METHODS = PAY_METHODS.filter((m) => m.region === "global");
export const LOCAL_METHODS = PAY_METHODS.filter((m) => m.region === "local");
export const TAXI_METHODS = PAY_METHODS.filter((m) => m.taxiDefault);
