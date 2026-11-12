import { useEffect, useState } from "react";
import { useIsFocused } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@opentrainer/backend";

import { TrainingRemindersDialog } from "@/components/reminders/training-reminders-dialog";
import {
  claimReminderOffer,
  defaultReminderSettings,
  useReminderOfferQueued,
} from "@/lib/training-reminders";

// One-time offer to turn on training reminders after a completed workout.
// Mounted in the tabs layout: the active-workout screen queues the offer, and
// it shows once the tabs are focused again. Notification permission is asked
// only if the user accepts, and only when not already granted.
export function TrainingReminderOffer() {
  const queued = useReminderOfferQueued();
  const isFocused = useIsFocused();
  const user = useQuery(api.users.getCurrentUser);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!queued || !isFocused) return;
    void claimReminderOffer().then((shouldOffer) => {
      if (shouldOffer) setOpen(true);
    });
  }, [queued, isFocused]);

  if (!open) return null;
  return (
    <TrainingRemindersDialog
      onOpenChange={setOpen}
      settings={defaultReminderSettings(user?.weeklyAvailability)}
      title="Remind you on training days?"
      description="One notification on the days you pick. Change it any time in Profile."
      dismissLabel="Not now"
    />
  );
}
