import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireOwner: vi.fn(), removeWeddingMember: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("../src/server/auth/authorization", () => ({ requireOwner: mocks.requireOwner, PermissionDeniedError: class extends Error {} }));
vi.mock("../src/server/auth/get-authenticated-user", () => ({ AuthenticationRequiredError: class extends Error {} }));
vi.mock("../src/server/auth/get-active-wedding", () => ({ ActiveWeddingRequiredError: class extends Error {} }));
vi.mock("../src/server/services/wedding-member.service", () => ({ removeWeddingMember: mocks.removeWeddingMember, WeddingMemberServiceError: class extends Error {} }));
vi.mock("../src/server/logging/logger", () => ({ logger: { error: vi.fn() } }));

import { removeMember } from "../src/server/actions/wedding/wedding-member.actions";
import { PermissionDeniedError } from "../src/server/auth/authorization";

describe("removeMember action", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireOwner.mockResolvedValue({ wedding: { id: "wedding_1" }, user: { id: "owner_1" } });
  });
  it("scopes removal to the authenticated owner's current wedding", async () => {
    expect(await removeMember(" member_2 ")).toEqual({ success: true, data: null });
    expect(mocks.removeWeddingMember).toHaveBeenCalledWith({ weddingId: "wedding_1", actingUserId: "owner_1", membershipId: "member_2" });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
  it("rejects non-owners before removal", async () => {
    mocks.requireOwner.mockRejectedValue(new PermissionDeniedError());
    expect((await removeMember("member_2")).success).toBe(false);
    expect(mocks.removeWeddingMember).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
  it.each([undefined, null, "", " ", {}])("rejects an invalid membership ID %j", async (id) => {
    expect((await removeMember(id)).success).toBe(false);
    expect(mocks.removeWeddingMember).not.toHaveBeenCalled();
  });
});
