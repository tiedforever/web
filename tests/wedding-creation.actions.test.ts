import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), create: vi.fn(), setActive: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("../src/server/auth/get-authenticated-user", () => ({ getAuthenticatedUser: mocks.auth, AuthenticationRequiredError: class extends Error {} }));
vi.mock("../src/server/auth/get-active-wedding", () => ({ requireActionWedding: vi.fn(), ActiveWeddingRequiredError: class extends Error {} }));
vi.mock("../src/server/auth/authorization", () => ({ requireOwner: vi.fn(), PermissionDeniedError: class extends Error {} }));
vi.mock("../src/server/repositories/wedding.repository", () => ({ weddingRepository: { createWeddingWithOwner: mocks.create, setActiveWedding: mocks.setActive }, WeddingRepositoryError: class extends Error {} }));
vi.mock("../src/server/services/workspace-invitation.service", () => ({ isValidEmail: vi.fn(), normalizeEmail: (value: string) => value.toLowerCase(), weddingMemberInvitationService: { createAndSend: vi.fn() } }));
vi.mock("../src/server/logging/logger", () => ({ logger: { error: vi.fn() } }));

import { createWedding } from "../src/server/actions/wedding/wedding.actions";
import { AuthenticationRequiredError } from "../src/server/auth/get-authenticated-user";

const input = { name: "Second wedding", partnerOneName: "C", partnerTwoName: "D", weddingDate: "2027-10-03", timezone: "Europe/London", currencyCode: "GBP" };
describe("additional wedding creation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "user_1", email: "person@example.com", firstName: "Person" } });
    mocks.create.mockResolvedValue({ id: "wedding_2", name: "Second wedding" });
  });

  it("creates a separate wedding with the current user as owner and selects it", async () => {
    const result = await createWedding(input);
    expect(result).toMatchObject({ success: true, data: { id: "wedding_2" } });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ userId: "user_1", name: "Second wedding" }));
    expect(mocks.setActive).toHaveBeenCalledWith("user_1", "wedding_2");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("requires authentication before creating another wedding", async () => {
    mocks.auth.mockRejectedValue(new AuthenticationRequiredError());
    expect((await createWedding(input)).success).toBe(false);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.setActive).not.toHaveBeenCalled();
  });
});
