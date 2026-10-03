import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("server-only", () => ({}));
vi.mock("../src/server/actions/guests/guest.actions", () => ({
  removePlusOneRelationship: vi.fn(),
}));

import { GuestSectionSelector } from "../src/components/guests/guest-section-selector";
import { GuestTable } from "../src/components/guests/guest-table";

describe("guest wedding section controls", () => {
  it("renders active choices, select-all conveniences, and preserved inactive assignments", () => {
    const markup = renderToStaticMarkup(
      <GuestSectionSelector
        existingInactiveSections={[{ id: "section_old", name: "Old reception", active: false }]}
        onChange={() => undefined}
        sections={[
          { id: "section_ceremony", name: "Ceremony", active: true },
          { id: "section_venue", name: "Venue", active: true },
        ]}
        selectedSectionIds={["section_old"]}
      />,
    );

    expect(markup).toContain("Wedding sections");
    expect(markup).toContain("Select all");
    expect(markup).toContain("Clear all");
    expect(markup).toContain("Ceremony");
    expect(markup).toContain("Venue");
    expect(markup).toContain("Old reception");
    expect(markup).toContain("Inactive · existing assignment");
    expect(markup).not.toContain("Unassigned");
  });

  it("shows section data to a viewer without guest mutation controls", () => {
    const markup = renderToStaticMarkup(
      <GuestTable
        canEdit={false}
        households={[]}
        weddingId="wedding_1"
        standaloneGuests={[
          {
            id: "guest_1",
            title: null,
            firstName: "Ada",
            lastName: "Lovelace",
            email: null,
            phone: null,
            ageGroup: "ADULT",
            tags: [],
            sections: [
              { id: "section_ceremony", name: "Ceremony", active: true },
              { id: "section_venue", name: "Venue", active: true },
            ],
            plusOneFor: null,
            plusOnes: [],
          },
        ]}
      />,
    );

    expect(markup).toContain("Sections:");
    expect(markup).toContain("Ceremony, Venue");
    expect(markup).not.toContain("Remove relationship");
    expect(markup).not.toContain("Unassigned");
  });
});
