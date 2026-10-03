import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@clerk/nextjs", () => ({
  SignOutButton: ({
    children,
    redirectUrl,
  }: {
    children: React.ReactNode;
    redirectUrl?: string;
  }) => <div data-redirect-url={redirectUrl}>{children}</div>,
}));

import { SignOutControl } from "../src/components/auth/sign-out-button";

describe("SignOutControl", () => {
  it("forwards an invitation return URL and custom action label", () => {
    const markup = renderToStaticMarkup(
      <SignOutControl
        label="Sign in with invited email"
        redirectUrl="/sign-in?redirect_url=%2Finvitations%2Faccept%3Ftoken%3Dtoken"
      />,
    );

    expect(markup).toContain(
      'data-redirect-url="/sign-in?redirect_url=%2Finvitations%2Faccept%3Ftoken%3Dtoken"',
    );
    expect(markup).toContain("Sign in with invited email");
  });
});
