import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({ signOut: vi.fn() }),
}));
vi.mock("../src/server/actions/account/account.actions", () => ({
  deleteMyAccount: vi.fn(),
}));

import { DeleteAccountForm } from "../src/components/settings/delete-account-form";

describe("account deletion branding", () => {
  it("uses Tied Forever in the deletion form", () => {
    const markup = renderToStaticMarkup(<DeleteAccountForm />);

    expect(markup).toContain("Tied Forever");
    expect(markup).not.toContain("Ever After");
  });
});
