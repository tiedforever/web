import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../src/server/actions/wedding/wedding-member.actions", () => ({ removeMember: vi.fn() }));
vi.mock("../src/components/shared/confirm-dialog", () => ({ ConfirmDialog: () => null }));

import { WeddingMembersList } from "../src/components/settings/wedding-members-list";

describe("WeddingMembersList", () => {
  const members = ["OWNER", "EDITOR", "VIEWER"].map((role, index) => ({ id: `member_${index}`, userId: `user_${index}`, email: `${index}@example.com`, firstName: `Person${index}`, lastName: "Example", profileImageUrl: null, role, joinedAt: null }));

  it("offers removal for other owners, editors, and viewers, but not yourself", () => {
    const markup = renderToStaticMarkup(<WeddingMembersList canManage currentUserId="current_owner" members={members} />);
    expect((markup.match(/>Remove<\/button>/g) ?? []).length).toBe(3);
    const ownMarkup = renderToStaticMarkup(<WeddingMembersList canManage currentUserId="user_0" members={members} />);
    expect(ownMarkup).not.toContain('aria-label="Remove Person0 Example"');
    expect((ownMarkup.match(/>Remove<\/button>/g) ?? []).length).toBe(2);
  });

  it("does not offer removal to editors or viewers", () => {
    const markup = renderToStaticMarkup(<WeddingMembersList canManage={false} currentUserId="user_1" members={members} />);
    expect(markup).not.toContain(">Remove</button>");
  });
  it("renders current members and their roles", () => {
    const markup = renderToStaticMarkup(
      <WeddingMembersList
        members={[
          {
            id: "membership_1",
            userId: "user_1",
            email: "owner@example.com",
            firstName: "Owner",
            lastName: "Example",
            profileImageUrl: null,
            role: "OWNER",
            joinedAt: "2026-01-01T00:00:00.000Z",
          },
        ]}
      />,
    );

    expect(markup).toContain("Owner Example");
    expect(markup).toContain("owner@example.com");
    expect(markup).toContain("OWNER");
  });
});
