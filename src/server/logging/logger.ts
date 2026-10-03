import "server-only";

type LogLevel = "error" | "warn" | "info";

function getErrorCode(error: Error) {
  if ("code" in error && typeof error.code === "string") {
    return error.code;
  }

  return undefined;
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    const code = getErrorCode(error);

    if (process.env.NODE_ENV === "production") {
      return {
        name: error.name,
        ...(code ? { code } : {}),
      };
    }

    return {
      name: error.name,
      message: error.message,
      ...(code ? { code } : {}),
      ...(error.stack ? { stack: error.stack } : {}),
    };
  }

  if (process.env.NODE_ENV === "production") {
    return { type: typeof error };
  }

  return { type: typeof error, value: String(error) };
}

function writeLog(level: LogLevel, event: string, error?: unknown) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...(error === undefined ? {} : { error: serializeError(error) }),
  };
  const message = JSON.stringify(payload);

  if (level === "error") {
    console.error(message);
  } else if (level === "warn") {
    console.warn(message);
  } else {
    console.log(message);
  }
}

export const logger = {
  error(event: string, error?: unknown) {
    writeLog("error", event, error);
  },
  warn(event: string, error?: unknown) {
    writeLog("warn", event, error);
  },
  info(event: string) {
    writeLog("info", event);
  },
};
