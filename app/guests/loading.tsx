import { DelayedLoadingFallback } from "@/src/components/shared/delayed-loading";

export default function GuestsLoading() {
  return <DelayedLoadingFallback area="guests" />;
}
