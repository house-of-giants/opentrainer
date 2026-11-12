import { useEffect, useState, useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

// Opt-in local reminders on the user's training days. Settings live on the
// device (no backend). Each weekday gets a repeating weekly notification with
// a fixed identifier, so rescheduling and turning off cancel exactly these and
// never touch a pending rest-timer notification.

/** Weekdays use the expo-notifications numbering: 1 = Sunday ... 7 = Saturday. */
export interface ReminderSettings {
  enabled: boolean;
  weekdays: number[];
  hour: number;
  minute: number;
}

const SETTINGS_KEY = "opentrainer.trainingReminders";
const OFFERED_KEY = "opentrainer.trainingReminderOffered";
const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

/** Monday-first display order. */
export const WEEKDAY_ORDER = [2, 3, 4, 5, 6, 7, 1];
export const WEEKDAY_SHORT: Record<number, string> = {
  1: "Sun",
  2: "Mon",
  3: "Tue",
  4: "Wed",
  5: "Thu",
  6: "Fri",
  7: "Sat",
};

// Spread the user's days-per-week availability across the week.
const DEFAULT_WEEKDAYS: Record<number, number[]> = {
  1: [2],
  2: [2, 5],
  3: [2, 4, 6],
  4: [2, 3, 5, 6],
  5: [2, 3, 4, 5, 6],
  6: [2, 3, 4, 5, 6, 7],
  7: ALL_WEEKDAYS,
};

export function defaultReminderSettings(
  daysPerWeek: number | undefined,
): ReminderSettings {
  return {
    enabled: false,
    weekdays: DEFAULT_WEEKDAYS[daysPerWeek ?? 3] ?? DEFAULT_WEEKDAYS[3],
    hour: 8,
    minute: 0,
  };
}

function reminderId(weekday: number) {
  return `training-reminder-${weekday}`;
}

export function formatReminderTime(hour: number, minute: number): string {
  const suffix = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function formatReminderSummary(settings: ReminderSettings | null): string {
  if (!settings?.enabled) return "Off";
  const days =
    settings.weekdays.length === 7
      ? "Every day"
      : WEEKDAY_ORDER.filter((d) => settings.weekdays.includes(d))
          .map((d) => WEEKDAY_SHORT[d])
          .join(", ");
  return `${days} · ${formatReminderTime(settings.hour, settings.minute)}`;
}

export async function loadReminderSettings(): Promise<ReminderSettings | null> {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_KEY);
    return stored ? (JSON.parse(stored) as ReminderSettings) : null;
  } catch {
    return null;
  }
}

async function cancelTrainingReminders(): Promise<void> {
  await Promise.all(
    ALL_WEEKDAYS.map((weekday) =>
      Notifications.cancelScheduledNotificationAsync(reminderId(weekday)).catch(
        () => {},
      ),
    ),
  );
}

/**
 * Replace the scheduled reminders with `settings` and store them. Turning off
 * cancels every training reminder. Throws when scheduling fails, after
 * cancelling any partial schedule.
 */
export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  await cancelTrainingReminders();
  if (settings.enabled) {
    try {
      for (const weekday of [...settings.weekdays].sort((a, b) => a - b)) {
        await Notifications.scheduleNotificationAsync({
          identifier: reminderId(weekday),
          content: {
            title: "Training day",
            body: "Your next session is ready.",
            sound: "default",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday,
            hour: settings.hour,
            minute: settings.minute,
          },
        });
      }
    } catch (error) {
      await cancelTrainingReminders();
      throw error;
    }
  }
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/** Stored settings; undefined while loading, null when never set. */
export function useReminderSettings() {
  const [settings, setSettings] = useState<ReminderSettings | null | undefined>(
    undefined,
  );
  useEffect(() => {
    let active = true;
    void loadReminderSettings().then((stored) => {
      if (active) setSettings(stored);
    });
    return () => {
      active = false;
    };
  }, []);
  return [settings, setSettings] as const;
}

// The post-workout offer: the active-workout screen queues it on completion,
// and the tabs show it once the user is back on them.
let offerQueued = false;
const offerListeners = new Set<() => void>();

function setOfferQueued(value: boolean) {
  offerQueued = value;
  offerListeners.forEach((listener) => listener());
}

export function queueReminderOffer() {
  setOfferQueued(true);
}

function subscribeToOffer(listener: () => void) {
  offerListeners.add(listener);
  return () => {
    offerListeners.delete(listener);
  };
}

export function useReminderOfferQueued(): boolean {
  return useSyncExternalStore(subscribeToOffer, () => offerQueued);
}

/**
 * Take the queued offer. Resolves true only the first time, and only when
 * reminders are not already on; it records that the offer was shown.
 */
export async function claimReminderOffer(): Promise<boolean> {
  setOfferQueued(false);
  try {
    const [offered, settings] = await Promise.all([
      AsyncStorage.getItem(OFFERED_KEY),
      loadReminderSettings(),
    ]);
    if (offered || settings?.enabled) return false;
    await AsyncStorage.setItem(OFFERED_KEY, "1");
    return true;
  } catch {
    return false;
  }
}
