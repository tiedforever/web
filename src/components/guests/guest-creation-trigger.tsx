"use client";

import { useState } from "react";

import type { HouseholdData } from "@/src/server/actions/guests/household.actions";
import type {
  GuestListSection,
  GuestListTag,
} from "@/src/server/repositories/guest-list.repository";
import { Button } from "@/src/components/shared/ui";
import { Icon } from "@/src/components/shared/icons";
import { GuestCreationModal } from "./guest-creation-modal";

export function GuestCreationTrigger({
  households,
  sections,
  tags,
  weddingId,
  buttonLabel = "Add guest",
  lockedHouseholdId,
}: {
  households: Pick<HouseholdData, "id" | "name">[];
  sections: GuestListSection[];
  tags: GuestListTag[];
  weddingId: string;
  buttonLabel?: string;
  lockedHouseholdId?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="primary">
        <Icon name="plus" size={15} />
        {buttonLabel}
      </Button>
      <GuestCreationModal
        households={households}
        lockedHouseholdId={lockedHouseholdId}
        onClose={() => setOpen(false)}
        open={open}
        sections={sections}
        tags={tags}
        weddingId={weddingId}
      />
    </>
  );
}
