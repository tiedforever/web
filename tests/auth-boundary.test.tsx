import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  pathname: "/invitations/accept",
}));

vi.mock("@clerk/nextjs", () => ({
  Show: ({
    children,
    when,
  }: {
    children: React.ReactNode;
    when: "signed-in" | "signed-out";
  }) => (when === "signed-in" ? children : null),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
}));
vi.mock("../src/components/auth/sign-out-button", () => ({
  SignOutControl: () => <button>Sign out</button>,
}));
vi.mock("../src/components/shared/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div data-app-shell="true">{children}</div>
  ),
}));

import { AuthBoundary } from "../src/components/auth/auth-boundary";

describe("AuthBoundary", () => {
  it("renders additional wedding creation outside the app shell", () => {
    mocks.pathname = "/weddings/new";
    const markup = renderToStaticMarkup(<AuthBoundary context={null}><p>New wedding form</p></AuthBoundary>);
    expect(markup).toContain("New wedding form");
    expect(markup).not.toContain("data-app-shell");
  });
  beforeEach(() => { mocks.pathname = "/invitations/accept"; });

  it("shows account failures instead of an empty dashboard", () => {
    mocks.pathname = "/dashboard";
    const markup = renderToStaticMarkup(
      <AuthBoundary context={null} accountError={{ title: "Your account link needs repair", message: "Contact support." }}>
        <p>Create your wedding</p>
      </AuthBoundary>,
    );
    expect(markup).toContain("Your account link needs repair");
    expect(markup).not.toContain("Create your wedding");
    expect(markup).not.toContain("data-app-shell");
  });

  it("lets the invitation page handle account failures and retain its return path", () => {
    const markup = renderToStaticMarkup(
      <AuthBoundary context={null} accountError={{ title: "Account error", message: "Contact support." }}>
        <p>Invitation retry</p>
      </AuthBoundary>,
    );
    expect(markup).toContain("Invitation retry");
    expect(markup).not.toContain("Account error");
  });
  it("keeps invitation acceptance outside the authenticated app shell", () => {
    const markup = renderToStaticMarkup(
      <AuthBoundary context={null}>
        <p>Invitation</p>
      </AuthBoundary>,
    );

    expect(markup).toContain("Invitation");
    expect(markup).not.toContain("data-app-shell");
  });

  it("continues to use the app shell for regular authenticated routes", () => {
    mocks.pathname = "/dashboard";

    const markup = renderToStaticMarkup(
      <AuthBoundary context={null}>
        <p>Dashboard</p>
      </AuthBoundary>,
    );

    expect(markup).toContain("Dashboard");
    expect(markup).toContain('data-app-shell="true"');
  });
});
