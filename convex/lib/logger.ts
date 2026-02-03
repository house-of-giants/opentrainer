import { initLogger, createRequestLogger, log } from "evlog";

initLogger({
  env: {
    service: "opentrainer",
    environment: process.env.NODE_ENV ?? "development",
  },
});

export { log };

const SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "apiKey",
  "authorization",
  "cookie",
  "clerkId",
  "sessionToken",
  "refreshToken",
  "creditCard",
  "ssn",
];

export function maskEmail(email: string | undefined): string | undefined {
  if (!email) return undefined;
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const [domainName, tld] = domain.split(".");
  return `${local[0]}***@${domainName?.[0] ?? ""}***.${tld ?? ""}`;
}

export function truncateId(id: string | undefined, length = 8): string | undefined {
  if (!id) return undefined;
  if (id.length <= length) return id;
  return `${id.slice(0, length)}...`;
}

export function sanitize<T extends Record<string, unknown>>(
  obj: T,
  sensitiveKeys: string[] = SENSITIVE_KEYS
): Partial<T> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();
    if (sensitiveKeys.some((k) => keyLower.includes(k.toLowerCase()))) {
      result[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = sanitize(value as Record<string, unknown>, sensitiveKeys);
    } else {
      result[key] = value;
    }
  }

  return result as Partial<T>;
}

export interface UserContext {
  id?: string;
  tier?: "free" | "pro";
  experienceLevel?: string;
  accountAgeDays?: number;
  email?: string;
  isAlphaUser?: boolean;
}

export interface WorkoutContext {
  id?: string;
  status?: string;
  exerciseCount?: number;
  totalSets?: number;
  totalVolume?: number;
  durationMinutes?: number;
}

export interface AIContext {
  action?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  rateLimitRemaining?: number;
}

export interface OutcomeContext {
  status?: "success" | "error" | "rate_limited";
  durationMs?: number;
  error?: {
    message: string;
    code?: string;
    type?: string;
  };
}

export interface WebhookContext {
  eventType?: string;
  provider?: string;
  eventId?: string;
}

type LoggerContext = {
  user?: UserContext;
  workout?: WorkoutContext;
  ai?: AIContext;
  outcome?: OutcomeContext;
  webhook?: WebhookContext;
  [key: string]: unknown;
};

export function createConvexLogger(operationName: string) {
  const startTime = Date.now();
  const requestLogger = createRequestLogger({ path: operationName });

  return {
    set(context: LoggerContext) {
      requestLogger.set(context);
    },

    error(err: Error | unknown, additionalContext?: Record<string, unknown>) {
      const errorObj =
        err instanceof Error
          ? {
              message: err.message,
              type: err.constructor.name,
              code: (err as { code?: string }).code,
            }
          : { message: String(err), type: "Unknown" };

      requestLogger.set({
        outcome: { status: "error" as const, error: errorObj },
        ...additionalContext,
      });
    },

    emit(level: "info" | "warn" | "error" = "info") {
      const durationMs = Date.now() - startTime;
      requestLogger.set({ durationMs });

      if (level === "error") {
        requestLogger.error("Operation failed");
      } else {
        requestLogger.emit({ level });
      }
    },

    success(additionalContext?: Record<string, unknown>) {
      this.set({ outcome: { status: "success" as const }, ...additionalContext });
      this.emit("info");
    },

    fail(err: Error | unknown, additionalContext?: Record<string, unknown>) {
      this.error(err, additionalContext);
      this.emit("error");
    },

    rateLimited(actionType: string, remaining: number) {
      this.set({
        outcome: { status: "rate_limited" as const },
        rateLimit: { action: actionType, remaining },
      });
      this.emit("warn");
    },
  };
}

export type ConvexLogger = ReturnType<typeof createConvexLogger>;
