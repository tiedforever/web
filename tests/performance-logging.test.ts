import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  logger: {
    info: vi.fn(),
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("../src/server/logging/logger", () => ({ logger: mocks.logger }));

import { measurePerformance } from "../src/server/logging/performance";

describe("measurePerformance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("emits the label and duration when PERF_LOGGING is exactly true", async () => {
    vi.stubEnv("PERF_LOGGING", "true");

    const result = await measurePerformance("dashboard.guests", async () => "result");

    expect(result).toBe("result");
    expect(mocks.logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/^\[perf\] dashboard\.guests: \d+ms$/),
    );
    expect(mocks.logger.info.mock.calls[0]?.[0]).not.toContain("result");
  });

  it.each([undefined, "false", "TRUE", "1", " true"]) (
    "does not log when PERF_LOGGING is %s",
    async (value) => {
      if (value === undefined) {
        delete process.env.PERF_LOGGING;
      } else {
        vi.stubEnv("PERF_LOGGING", value);
      }

      const result = await measurePerformance("dashboard.guests", async () => "result");

      expect(result).toBe("result");
      expect(mocks.logger.info).not.toHaveBeenCalled();
    },
  );

  it("preserves thrown errors and does not log their contents", async () => {
    vi.stubEnv("PERF_LOGGING", "true");

    await expect(
      measurePerformance("auth.localUser", async () => {
        throw new Error("secret operation result");
      }),
    ).rejects.toThrow("secret operation result");

    expect(mocks.logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/^\[perf\] auth\.localUser: \d+ms$/),
    );
    expect(mocks.logger.info.mock.calls[0]?.[0]).not.toContain(
      "secret operation result",
    );
  });
});
