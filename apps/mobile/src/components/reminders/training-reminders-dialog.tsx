import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { ensureNotificationPermission } from "@/lib/rest-timer-notifications";
import {
  formatReminderTime,
  saveReminderSettings,
  WEEKDAY_ORDER,
  WEEKDAY_SHORT,
  type ReminderSettings,
} from "@/lib/training-reminders";
import { useTheme } from "@/theme/theme-provider";

const TIME_STEP_MINUTES = 30;
const MINUTES_PER_DAY = 24 * 60;

interface TrainingRemindersDialogProps {
  onOpenChange: (open: boolean) => void;
  /** Current settings; weekdays and time seed the draft. */
  settings: ReminderSettings;
  onSaved?: (settings: ReminderSettings) => void;
  title: string;
  description: string;
  /** Label of the button that closes without saving, while reminders are off. */
  dismissLabel: string;
}

// Mount only while open so each opening starts from the stored settings.
export function TrainingRemindersDialog({
  onOpenChange,
  settings,
  onSaved,
  title,
  description,
  dismissLabel,
}: TrainingRemindersDialogProps) {
  const { colors } = useTheme();
  const [weekdays, setWeekdays] = useState(settings.weekdays);
  const [minutes, setMinutes] = useState(settings.hour * 60 + settings.minute);
  const [isSaving, setIsSaving] = useState(false);

  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;

  const toggleWeekday = (weekday: number) =>
    setWeekdays((prev) =>
      prev.includes(weekday) ? prev.filter((d) => d !== weekday) : [...prev, weekday],
    );

  const stepTime = (delta: number) =>
    setMinutes((prev) => (prev + delta + MINUTES_PER_DAY) % MINUTES_PER_DAY);

  const save = async (enabled: boolean) => {
    setIsSaving(true);
    try {
      if (enabled && !(await ensureNotificationPermission())) {
        toast.error(
          "Notifications are off",
          "Allow notifications for OpenTrainer in iOS Settings.",
        );
        return;
      }
      const next = { enabled, weekdays, hour, minute };
      await saveReminderSettings(next);
      onSaved?.(next);
      toast.success(enabled ? "Reminders on" : "Reminders off");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save reminders");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      <View className="gap-6 py-2">
        <View className="gap-3">
          <Text className="text-sm font-medium text-foreground">Days</Text>
          <View className="flex-row gap-1">
            {WEEKDAY_ORDER.map((weekday) => {
              const checked = weekdays.includes(weekday);
              return (
                <Pressable
                  key={weekday}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  onPress={() => toggleWeekday(weekday)}
                  className={cn(
                    "h-11 flex-1 items-center justify-center rounded-md border",
                    checked ? "border-primary bg-primary" : "border-border bg-background",
                  )}
                >
                  <Text
                    className={cn(
                      "text-xs font-medium",
                      checked ? "text-primary-foreground" : "text-foreground",
                    )}
                  >
                    {WEEKDAY_SHORT[weekday]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-foreground">Time</Text>
          <View className="flex-row items-center gap-3">
            <Button
              variant="outline"
              size="icon-sm"
              accessibilityLabel="Earlier"
              onPress={() => stepTime(-TIME_STEP_MINUTES)}
            >
              <Minus size={16} color={colors.foreground} />
            </Button>
            <Text className="w-20 text-center font-mono text-base font-semibold text-foreground">
              {formatReminderTime(hour, minute)}
            </Text>
            <Button
              variant="outline"
              size="icon-sm"
              accessibilityLabel="Later"
              onPress={() => stepTime(TIME_STEP_MINUTES)}
            >
              <Plus size={16} color={colors.foreground} />
            </Button>
          </View>
        </View>
      </View>

      <DialogFooter>
        {settings.enabled ? (
          <Button variant="outline" onPress={() => save(false)} disabled={isSaving}>
            Turn off
          </Button>
        ) : (
          <Button variant="outline" onPress={() => onOpenChange(false)} disabled={isSaving}>
            {dismissLabel}
          </Button>
        )}
        <Button
          onPress={() => save(true)}
          disabled={isSaving || weekdays.length === 0}
        >
          {settings.enabled ? "Save" : "Turn on"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
