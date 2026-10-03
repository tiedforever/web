import "server-only";

import { logger } from "./logger";

export async function measurePerformance<T>(
  label: string,
  operation: () => Promise<T>,
): Promise<T> {
  if (process.env.PERF_LOGGING !== "true") {
    return operation();
  }

  const startedAt = Date.now();

  try {
    return await operation();
  } finally {
    logger.info(`[perf] ${label}: ${Date.now() - startedAt}ms`);
  }
}
