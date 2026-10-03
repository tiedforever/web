import { describe, expect, it } from "vitest";

import { GET } from "../app/goodbye/route";

describe("goodbye route", () => {
  it("renders without authentication or application-user lookups", async () => {
    const response = GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(body).toContain("Your account has been deleted");
    expect(body).toContain("Tied Forever");
    expect(body).not.toContain("Ever After");
    expect(body).toContain('href="/"');
    expect(body).toContain('href="/sign-in"');
  });
});
