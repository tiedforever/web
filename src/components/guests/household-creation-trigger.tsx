"use client";

import { useState } from "react";

import type { HouseholdListTag } from "@/src/server/repositories/household-list.repository";
import { Button } from "@/src/components/shared/ui";
import { Icon } from "@/src/components/shared/icons";
import { HouseholdCreationModal } from "./household-creation-modal";

export function HouseholdCreationTrigger({
  tags,
  weddingId,
}: {
  tags: HouseholdListTag[];
  weddingId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="primary">
        <Icon name="plus" size={15} />
        Add household
      </Button>
      <HouseholdCreationModal
        onClose={() => setOpen(false)}
        open={open}
        tags={tags}
        weddingId={weddingId}
      />
    </>
  );
}
