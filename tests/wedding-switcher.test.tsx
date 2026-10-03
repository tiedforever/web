import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("../src/server/actions/wedding/wedding.actions", () => ({ setActiveWedding: vi.fn(), createWedding: vi.fn() }));
vi.mock("../src/server/actions/onboarding/onboarding.actions", () => ({ skipOnboarding: vi.fn() }));

import { WeddingSwitcher } from "../src/components/shared/wedding-switcher";
import { CreateWeddingForm } from "../src/components/onboarding/create-wedding-form";

const firstWedding = { id: "wedding_1", name: "First wedding", partnerNames: "A & B" };
describe("wedding creation entry points", () => {
  it.each([true, false])("offers creation when a single wedding exists (compact: %s)", (compact) => {
    const markup = renderToStaticMarkup(<WeddingSwitcher activeWeddingId="wedding_1" options={[firstWedding]} compact={compact} />);
    expect(markup).toContain("First wedding");
    expect(markup).toContain('<option value="create-wedding">Create another wedding</option>');
    expect(markup).toContain("<select");
  });

  it("lists all weddings with the current one selected", () => {
    const markup = renderToStaticMarkup(<WeddingSwitcher activeWeddingId="wedding_2" options={[firstWedding, { id: "wedding_2", name: "Second wedding", partnerNames: "C & D" }]} compact />);
    expect(markup).toContain('<option value="wedding_2" selected="">Second wedding</option>');
    expect(markup).toContain("First wedding");
    expect(markup).toContain("Create another wedding");
  });

  it("still sends users without a wedding to onboarding", () => {
    const markup = renderToStaticMarkup(<WeddingSwitcher activeWeddingId={null} options={[]} compact />);
    expect(markup).toContain('href="/onboarding"');
  });

  it("does not offer skipping onboarding when creating an additional wedding", () => {
    const markup = renderToStaticMarkup(<CreateWeddingForm allowSkip={false} />);
    expect(markup).toContain("Create wedding");
    expect(markup).not.toContain("Skip for now");
    expect(renderToStaticMarkup(<CreateWeddingForm />)).toContain("Skip for now");
  });
});
