import * as Notifications from "expo-notifications";

// Rest-timer local notifications: a locked or backgrounded phone still gets
// the "Rest over" nudge when a rest timer elapses. The active-workout screen
// renders its own in-app timer, so foreground presentations stay silent.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Resolve to true when local notifications may be shown. Asks the OS only when
 * not yet granted; iOS flips canAskAgain to false after a denial, so this
 * never nags. Shared with the training reminders.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  if (!settings.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Schedule the "rest over" notification `secondsFromNow` seconds out.
 * Returns the notification id, or null when permission is denied, the delay is
 * sub-second, or scheduling fails — callers treat null as "nothing scheduled".
 */
export async function scheduleRestEndNotification(
  secondsFromNow: number,
): Promise<string | null> {
  if (!Number.isFinite(secondsFromNow) || secondsFromNow < 1) return null;
  try {
    if (!(await ensureNotificationPermission())) return null;
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: "Rest over",
        body: "Time for your next set.",
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.round(secondsFromNow),
        repeats: false,
      },
    });
  } catch {
    // Notifications are a nice-to-have; never break the workout flow.
    return null;
  }
}

export async function cancelRestEndNotification(
  id: string | null | undefined,
): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already fired or cancelled.
  }
}
