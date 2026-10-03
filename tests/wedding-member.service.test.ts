import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  tx: {
    weddingMember: { findUnique: vi.fn(), findFirst: vi.fn(), count: vi.fn(), update: vi.fn() },
    task: { updateMany: vi.fn() },
    userPreference: { updateMany: vi.fn() },
    weddingInvitation: { updateMany: vi.fn() },
  },
}));
vi.mock("server-only", () => ({}));
vi.mock("../src/server/db/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
import { removeWeddingMember } from "../src/server/services/wedding-member.service";

const input = { weddingId: "wedding_1", actingUserId: "owner_1", membershipId: "member_2" };
describe("removeWeddingMember", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.transaction.mockImplementation((operation) => operation(mocks.tx));
    mocks.tx.weddingMember.findUnique.mockResolvedValue({ userId: "owner_1", role: "OWNER", status: "ACTIVE" });
    mocks.tx.weddingMember.findFirst.mockResolvedValue({ id: "member_2", userId: "user_2", role: "EDITOR", status: "ACTIVE", user: { email: "person@example.com" } });
    mocks.tx.weddingMember.count.mockResolvedValue(2);
  });

  it.each(["OWNER", "EDITOR", "VIEWER"])("removes a %s without deleting their account or wedding data", async (role) => {
    mocks.tx.weddingMember.findFirst.mockResolvedValue({ id: "member_2", userId: "user_2", role, status: "ACTIVE", user: { email: "person@example.com" } });
    await removeWeddingMember(input);
    expect(mocks.tx.weddingMember.update).toHaveBeenCalledWith({ where: { id: "member_2" }, data: { status: "REMOVED", leftAt: expect.any(Date) } });
    expect(mocks.tx.task.updateMany).toHaveBeenCalledWith({ where: { assigneeId: "member_2" }, data: { assigneeId: null } });
    expect(mocks.tx.userPreference.updateMany).toHaveBeenCalledWith({ where: { userId: "user_2", activeWeddingId: "wedding_1" }, data: { activeWeddingId: null } });
    expect(mocks.tx.weddingInvitation.updateMany).toHaveBeenCalledWith({ where: { weddingId: "wedding_1", invitedEmail: { equals: "person@example.com", mode: "insensitive" }, status: "PENDING" }, data: { status: "REVOKED", revokedAt: expect.any(Date) } });
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
  });

  it.each([
    { role: "EDITOR", status: "ACTIVE" },
    { role: "VIEWER", status: "ACTIVE" },
    { role: "OWNER", status: "REMOVED" },
  ])("rechecks acting owner access inside the transaction (%j)", async (actor) => {
    mocks.tx.weddingMember.findUnique.mockResolvedValue(actor);
    await expect(removeWeddingMember(input)).rejects.toThrow("Only active wedding owners");
    expect(mocks.tx.weddingMember.update).not.toHaveBeenCalled();
  });

  it("rejects missing members and memberships from other weddings", async () => {
    mocks.tx.weddingMember.findFirst.mockResolvedValue(null);
    await expect(removeWeddingMember(input)).rejects.toThrow("no longer has access");
    expect(mocks.tx.weddingMember.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "member_2", weddingId: "wedding_1", status: "ACTIVE" } }));
    expect(mocks.tx.weddingMember.update).not.toHaveBeenCalled();
  });

  it("rejects self removal", async () => {
    mocks.tx.weddingMember.findFirst.mockResolvedValue({ userId: "owner_1" });
    await expect(removeWeddingMember(input)).rejects.toThrow("cannot remove yourself");
    expect(mocks.tx.weddingMember.update).not.toHaveBeenCalled();
  });

  it("blocks removal of the last active owner", async () => {
    mocks.tx.weddingMember.findFirst.mockResolvedValue({ id: "member_2", userId: "user_2", role: "OWNER" });
    mocks.tx.weddingMember.count.mockResolvedValue(1);
    await expect(removeWeddingMember(input)).rejects.toThrow("at least one active owner");
    expect(mocks.tx.weddingMember.update).not.toHaveBeenCalled();
  });
});
