import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("server-only", () => ({}));
vi.mock("../src/server/actions/settings/wedding-section.actions", () => ({
  createWeddingSection: vi.fn(),
  deleteWeddingSection: vi.fn(),
  reorderWeddingSections: vi.fn(),
  setWeddingSectionActive: vi.fn(),
  updateWeddingSection: vi.fn(),
}));

import { WeddingSectionsManager } from "../src/components/settings/wedding-sections-manager";

const sections = [
  {
    id: "section_1",
    name: "Ceremony",
    description: "The ceremony",
    position: 0,
    active: true,
  },
  {
    id: "section_2",
    name: "Venue",
    description: null,
    position: 1,
    active: false,
  },
];

function renderManager(
  initialSections: typeof sections,
  readOnly = false,
) {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <WeddingSectionsManager
        initialSections={initialSections}
        readOnly={readOnly}
        weddingId="wedding_1"
      />
    </QueryClientProvider>,
  );
}

describe("WeddingSectionsManager", () => {
  it("shows sections but hides mutation controls for VIEWER users", () => {
    const markup = renderManager(sections, true);

    expect(markup).toContain("Ceremony");
    expect(markup).toContain("Venue");
    expect(markup).toContain("Read only");
    expect(markup).not.toContain("Add a section");
    expect(markup).not.toContain("Add section");
    expect(markup).not.toContain("Deactivate");
    expect(markup).not.toContain("Delete");
    expect(markup).not.toContain("Move Ceremony up");
  });

  it("renders mutation controls for editable users", () => {
    const markup = renderManager(sections);

    expect(markup).toContain("Add a section");
    expect(markup).toContain("Add section");
    expect(markup).toContain("Deactivate");
    expect(markup).toContain("Delete");
    expect(markup).toContain("Move Ceremony up");
  });

  it("offers legacy default initialization only to editable users", () => {
    const viewerMarkup = renderManager([], true);
    const editorMarkup = renderManager([]);

    expect(viewerMarkup).toContain("No sections yet");
    expect(viewerMarkup).not.toContain("Initialize default sections");
    expect(editorMarkup).toContain("Initialize default sections");
  });
});
