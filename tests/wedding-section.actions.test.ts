import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class MockPermissionDeniedError extends Error {
    constructor() {
      super("You do not have permission to perform this action.");
      this.name = "PermissionDeniedError";
    }
  }
  class MockWeddingSectionRepositoryError extends Error {}

  return {
    requireRole: vi.fn(),
    getSections: vi.fn(),
    initializeDefaults: vi.fn(),
    createSection: vi.fn(),
    updateSection: vi.fn(),
    setActive: vi.fn(),
    reorderSections: vi.fn(),
    deleteSection: vi.fn(),
    revalidatePath: vi.fn(),
    PermissionDeniedError: MockPermissionDeniedError,
    WeddingSectionRepositoryError: MockWeddingSectionRepositoryError,
  };
});

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("../src/server/auth/authorization", () => ({
  PermissionDeniedError: mocks.PermissionDeniedError,
  requireRole: mocks.requireRole,
}));
vi.mock("../src/server/auth/get-active-wedding", () => ({
  ActiveWeddingRequiredError: class ActiveWeddingRequiredError extends Error {},
}));
vi.mock("../src/server/auth/get-authenticated-user", () => ({
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {},
}));
vi.mock("../src/server/logging/logger", () => ({
  logger: { error: vi.fn() },
}));
vi.mock("../src/server/repositories/wedding-section.repository", () => ({
  WeddingSectionRepositoryError: mocks.WeddingSectionRepositoryError,
  weddingSectionRepository: {
    getSections: mocks.getSections,
    initializeDefaults: mocks.initializeDefaults,
    createSection: mocks.createSection,
    updateSection: mocks.updateSection,
    setActive: mocks.setActive,
    reorderSections: mocks.reorderSections,
    deleteSection: mocks.deleteSection,
  },
}));

import {
  createWeddingSection,
  deleteWeddingSection,
  getWeddingSections,
  initializeWeddingSections,
  reorderWeddingSections,
  setWeddingSectionActive,
  updateWeddingSection,
} from "../src/server/actions/settings/wedding-section.actions";

const sections = [
  {
    id: "section_1",
    name: "Ceremony",
    description: null,
    position: 0,
    active: true,
  },
  {
    id: "section_2",
    name: "Venue",
    description: null,
    position: 1,
    active: true,
  },
];

describe("wedding section actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ wedding: { id: "wedding_1" }, role: "EDITOR" });
    mocks.getSections.mockResolvedValue(sections);
    mocks.initializeDefaults.mockResolvedValue(sections);
    mocks.createSection.mockResolvedValue(sections);
    mocks.updateSection.mockResolvedValue(sections);
    mocks.setActive.mockResolvedValue(sections);
    mocks.reorderSections.mockResolvedValue(sections);
    mocks.deleteSection.mockResolvedValue(sections);
  });

  it("lets all active wedding roles view sections", async () => {
    await expect(getWeddingSections()).resolves.toEqual({ success: true, data: sections });
    expect(mocks.getSections).toHaveBeenCalledWith("wedding_1");

    expect(mocks.requireRole).toHaveBeenCalledWith(
      ["OWNER", "EDITOR", "VIEWER"],
      { redirectToOnboarding: false },
    );
  });

  it("creates and trims a section through the active wedding", async () => {
    await expect(
      createWeddingSection({ name: "  Evening reception ", description: "  Music and dancing  " }),
    ).resolves.toEqual({ success: true, data: sections });

    expect(mocks.createSection).toHaveBeenCalledWith("wedding_1", {
      name: "Evening reception",
      description: "Music and dancing",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/guests");
    expect(mocks.revalidatePath).not.toHaveBeenCalledWith("/dashboard");
    expect(mocks.revalidatePath).not.toHaveBeenCalledWith("/", "layout");
  });

  it("initializes defaults only through an authorized edit action", async () => {
    await expect(initializeWeddingSections()).resolves.toEqual({
      success: true,
      data: sections,
    });

    expect(mocks.initializeDefaults).toHaveBeenCalledWith("wedding_1");
    expect(mocks.requireRole).toHaveBeenCalledWith(
      ["OWNER", "EDITOR"],
      { redirectToOnboarding: false },
    );
  });

  it("renames a section and updates its description", async () => {
    await updateWeddingSection("section_1", {
      name: "  Service ",
      description: "  The ceremony details  ",
    });

    expect(mocks.updateSection).toHaveBeenCalledWith("wedding_1", "section_1", {
      name: "Service",
      description: "The ceremony details",
    });
  });

  it("activates and deactivates without deleting the stored section", async () => {
    await setWeddingSectionActive("section_1", false);

    expect(mocks.setActive).toHaveBeenCalledWith("wedding_1", "section_1", false);
    expect(mocks.deleteSection).not.toHaveBeenCalled();
  });

  it("reorders and deletes through wedding-scoped repository methods", async () => {
    await reorderWeddingSections(["section_2", "section_1"]);
    await deleteWeddingSection("section_2");

    expect(mocks.reorderSections).toHaveBeenCalledWith("wedding_1", [
      "section_2",
      "section_1",
    ]);
    expect(mocks.deleteSection).toHaveBeenCalledWith("wedding_1", "section_2");
  });

  it("rejects blank and overlong names before touching the repository", async () => {
    await expect(createWeddingSection({ name: "   " })).resolves.toEqual({
      success: false,
      error: "Section name is required.",
    });
    await expect(
      updateWeddingSection("section_1", { name: "A".repeat(101) }),
    ).resolves.toEqual({
      success: false,
      error: "Section name must be 100 characters or fewer.",
    });

    expect(mocks.createSection).not.toHaveBeenCalled();
    expect(mocks.updateSection).not.toHaveBeenCalled();
  });

  it("rejects VIEWER mutations", async () => {
    mocks.requireRole.mockRejectedValue(new mocks.PermissionDeniedError());

    await expect(createWeddingSection({ name: "Dinner" })).resolves.toEqual({
      success: false,
      error: "You do not have permission to perform this action.",
    });
    await expect(reorderWeddingSections(["section_1", "section_2"])).resolves.toEqual({
      success: false,
      error: "You do not have permission to perform this action.",
    });

    expect(mocks.createSection).not.toHaveBeenCalled();
    expect(mocks.reorderSections).not.toHaveBeenCalled();
  });

  it("rejects an invalid cross-wedding section through the repository error", async () => {
    mocks.updateSection.mockRejectedValue(
      new mocks.WeddingSectionRepositoryError("Wedding day section not found."),
    );

    await expect(
      updateWeddingSection("section_from_other_wedding", { name: "Other", description: null }),
    ).resolves.toEqual({ success: false, error: "Wedding day section not found." });
  });
});
