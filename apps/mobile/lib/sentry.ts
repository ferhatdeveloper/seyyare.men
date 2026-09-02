// Production error tracking — Sentry
// İsteğe bağlı, SENTRY_DSN env varsa aktif olur

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

interface ErrorContext {
  user?: { id: string; email?: string };
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

class ErrorTracker {
  private initialized = false;

  init() {
    if (this.initialized || !SENTRY_DSN) return;
    // Sentry init burada (expo-sentry-expo paketi ile)
    this.initialized = true;
  }

  captureException(error: unknown, context?: ErrorContext) {
    if (__DEV__) {
      console.error("[ErrorTracker]", error, context);
      return;
    }
    // Production: Sentry.captureException çağrısı
  }

  captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
    if (__DEV__) {
      console.log(`[ErrorTracker][${level}]`, message);
      return;
    }
    // Production: Sentry.captureMessage
  }
}

export const errorTracker = new ErrorTracker();