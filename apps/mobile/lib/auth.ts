import * as SecureStore from "expo-secure-store";

const ACCESS_KEY = "seyyare.access_token";
const REFRESH_KEY = "seyyare.refresh_token";
const USER_KEY = "seyyare.user";

export interface StoredUser {
  id: string;
  email: string | null;
  phone: string | null;
  role: "user" | "dealer" | "admin";
  locale: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: StoredUser;
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

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  },

  isAuthenticated: async (): Promise<boolean> => !!(await SecureStore.getItemAsync(ACCESS_KEY)),
};