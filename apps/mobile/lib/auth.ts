import * as SecureStore from "expo-secure-store";

import { authClient } from "./clients";

const ACCESS_KEY = "seyyare.access_token";
const REFRESH_KEY = "seyyare.refresh_token";
const USER_KEY = "seyyare.user";

export type UserGender = "female" | "male" | "unspecified";

export interface StoredUser {
  id: string;
  email: string | null;
  phone: string | null;
  role: "user" | "dealer" | "admin";
  locale: string;
  /** Required for family / female-driver rental option */
  gender?: UserGender | null;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: StoredUser;
}

function mapServerUser(row: Record<string, unknown>, fallback: StoredUser): StoredUser {
  const gender = row.gender;
  return {
    id: String(row.id ?? fallback.id),
    email: (row.email as string | null | undefined) ?? fallback.email,
    phone: (row.phone as string | null | undefined) ?? fallback.phone,
    role: (row.role as StoredUser["role"] | undefined) ?? fallback.role,
    locale: (row.locale as string | undefined) ?? fallback.locale,
    gender:
      gender === "female" || gender === "male" || gender === "unspecified" || gender === null
        ? gender
        : fallback.gender,
  };
}

export const auth = {
  async saveTokens(tokens: AuthTokens): Promise<void> {
    // SecureStore 2KB limit per value — refresh token base64url ~64 chars OK
    await SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken);
    await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(tokens.user));
  },

  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_KEY);
  },

  async getUser(): Promise<StoredUser | null> {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  },

  async updateUser(patch: Partial<StoredUser>): Promise<StoredUser | null> {
    const current = await this.getUser();
    if (!current) return null;

    if (patch.gender !== undefined) {
      try {
        const accessToken = await this.getAccessToken();
        if (accessToken) {
          const res = await fetch(`${authClient.url}/auth/me`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ gender: patch.gender }),
          });
          if (res.ok) {
            const row = (await res.json()) as Record<string, unknown>;
            const next = mapServerUser(row, { ...current, ...patch });
            await SecureStore.setItemAsync(USER_KEY, JSON.stringify(next));
            return next;
          }
        }
      } catch {
        /* fall through to local persist */
      }
    }

    const next = { ...current, ...patch };
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(next));
    return next;
  },

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  },

  isAuthenticated: async (): Promise<boolean> => !!(await SecureStore.getItemAsync(ACCESS_KEY)),
};
