"use client";

import { useEffect } from "react";

export function WorkspaceInvitationRedirect({ destination }: { destination: string }) {
  useEffect(() => {
    // Reload the root layout after membership creation so its account and
    // wedding context cannot retain the pre-acceptance state.
    window.location.replace(destination);
  }, [destination]);

  return <a className="text-[#2D5A27] underline" href={destination}>Open your wedding workspace</a>;
}
