import crypto from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "./db.js";
import { redis } from "./redis.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "change_me_in_production";
const ACCESS_TTL = Number(process.env.JWT_ACCESS_TTL ?? 900); // 15 min
const REFRESH_TTL = Number(process.env.JWT_REFRESH_TTL ?? 2_592_000); // 30 days
const PGRST_JWT_SECRET = process.env.PGRST_JWT_SECRET ?? JWT_SECRET;

export interface UserPayload {
  id: string;
  email: string | null;
  phone: string | null;
  role: "user" | "dealer" | "admin";
  locale: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: UserPayload;
}

// JWT claim'leri PostgREST'in beklediği formatta
function signAccessToken(user: UserPayload): string {
  const payload = {
    sub: user.id,
    role: user.role,
    locale: user.locale,
    email: user.email,
    phone: user.phone,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + ACCESS_TTL,
  };
  return jwt.sign(payload, PGRST_JWT_SECRET, { algorithm: "HS256" });
}

function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function register(input: {
  email?: string;
  phone?: string;
  password: string;
  locale?: string;
  displayName?: string;
  role?: "user" | "dealer";
}): Promise<AuthTokens> {
  const { email, phone, password, locale = "tr", displayName, role = "user" } = input;
  if (!email && !phone) throw new Error("email_or_phone_required");
  if (password.length < 8) throw new Error("password_too_short");

  const res = await db.query<{
    user_id: string;
    email: string | null;
    phone: string | null;
    role: string;
    locale: string;
  }>(
    "SELECT * FROM public.basic_auth_register($1::text, $2::text, $3::text, $4::text, $5::text, $6::text)",
    [email ?? null, phone ?? null, password, locale, displayName ?? null, role],
  );
  const u = res.rows[0];

  const refresh = generateRefreshToken();
  const refreshHash = hashRefreshToken(refresh);
  const expiresAt = new Date(Date.now() + REFRESH_TTL * 1000);

  await db.query(
    "INSERT INTO public.refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [u.user_id, refreshHash, expiresAt],
  );

  const user: UserPayload = {
    id: u.user_id,
    email: u.email,
    phone: u.phone,
    role: u.role as UserPayload["role"],
    locale: u.locale,
  };

  return {
    accessToken: signAccessToken(user),
    refreshToken: refresh,
    user,
  };
}

export async function login(identifier: string, password: string): Promise<AuthTokens> {
  if (!identifier || !password) throw new Error("invalid_credentials");

  // DB'den password_hash + user bilgilerini çek
  const lookup = await db.query<{
    id: string;
    email: string | null;
    phone: string | null;
    password_hash: string;
    role: string;
    locale: string;
    is_active: boolean;
    is_banned: boolean;
  }>(
    `SELECT id, email, phone, password_hash, role, locale, is_active, is_banned
     FROM public.users
     WHERE email = lower($1) OR phone = $1
     LIMIT 1`,
    [identifier],
  );

  const u = lookup.rows[0];
  if (!u) throw new Error("invalid_credentials");
  if (u.is_banned || !u.is_active) throw new Error("account_disabled");

  const ok = await verifyPassword(password, u.password_hash);
  if (!ok) throw new Error("invalid_credentials");

  await db.query("UPDATE public.users SET last_login_at = now() WHERE id = $1", [u.id]);

  const refresh = generateRefreshToken();
  const refreshHash = hashRefreshToken(refresh);
  const expiresAt = new Date(Date.now() + REFRESH_TTL * 1000);

  await db.query(
    "INSERT INTO public.refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [u.id, refreshHash, expiresAt],
  );

  const user: UserPayload = {
    id: u.id,
    email: u.email,
    phone: u.phone,
    role: u.role as UserPayload["role"],
    locale: u.locale,
  };

  return {
    accessToken: signAccessToken(user),
    refreshToken: refresh,
    user,
  };
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const tokenHash = hashRefreshToken(refreshToken);

  // Mevcut token'ı bul ve rotate et
  const res = await db.query<{ user_id: string }>(
    `SELECT user_id FROM public.refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
     LIMIT 1`,
    [tokenHash],
  );

  const found = res.rows[0];
  if (!found) throw new Error("invalid_or_expired_refresh_token");

  // Eski token'ı revoke et
  await db.query(
    "UPDATE public.refresh_tokens SET revoked_at = now() WHERE token_hash = $1",
    [tokenHash],
  );

  // User bilgilerini çek
  const userRes = await db.query<{
    id: string;
    email: string | null;
    phone: string | null;
    role: string;
    locale: string;
  }>("SELECT id, email, phone, role, locale FROM public.users WHERE id = $1", [found.user_id]);

  const u = userRes.rows[0];
  if (!u) throw new Error("user_not_found");

  // Yeni refresh token
  const newRefresh = generateRefreshToken();
  const newHash = hashRefreshToken(newRefresh);
  const expiresAt = new Date(Date.now() + REFRESH_TTL * 1000);

  await db.query(
    "INSERT INTO public.refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [u.id, newHash, expiresAt],
  );

  // Redis'te kısa süreli cache (refresh dedup için)
  await redis.set(`refresh:${u.id}:${newHash.slice(0, 16)}`, "1", 60);

  const user: UserPayload = {
    id: u.id,
    email: u.email,
    phone: u.phone,
    role: u.role as UserPayload["role"],
    locale: u.locale,
  };

  return {
    accessToken: signAccessToken(user),
    refreshToken: newRefresh,
    user,
  };
}

export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(refreshToken);
  await db.query(
    "UPDATE public.refresh_tokens SET revoked_at = now() WHERE token_hash = $1",
    [tokenHash],
  );
}

export async function me(userId: string) {
  const res = await db.query(
    `SELECT u.id, u.email, u.phone, u.role, u.locale, u.email_verified_at, u.phone_verified_at,
            u.created_at, p.display_name, p.avatar_url, p.country_code, p.city, p.verified
     FROM public.users u
     LEFT JOIN public.user_profiles p ON p.user_id = u.id
     WHERE u.id = $1`,
    [userId],
  );
  return res.rows[0] ?? null;
}