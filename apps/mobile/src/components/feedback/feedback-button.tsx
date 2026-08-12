import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { usePathname } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@opentrainer/backend";
import {
  Bug,
  Lightbulb,
  MessageCircle,
  MessageSquare,
  Sparkles,
  type LucideIcon,
} from "lucide-react-native";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/components/feedback/feedback-button.tsx. Web mounts it
// globally inside <SignedIn>; mobile mounts it in the (app) layout, which is
// already auth-gated.
type FeedbackType = "bug" | "feature_request" | "ai_quality" | "general";

const FEEDBACK_TYPES: { id: FeedbackType; label: string; icon: LucideIcon }[] = [
  { id: "bug", label: "Bug Report", icon: Bug },
  { id: "feature_request", label: "Feature Request", icon: Lightbulb },
  { id: "ai_quality", label: "AI Quality", icon: Sparkles },
  { id: "general", label: "General", icon: MessageCircle },
];

export function FeedbackButton() {
  const pathname = usePathname();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitFeedback = useMutation(api.feedback.submitFeedback);

  const handleSubmit = async () => {
    if (!selectedType) {
      toast.error("Please select a feedback type");
      return;
    }
    if (!message.trim()) {
      toast.error("Please enter your feedback");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitFeedback({
        type: selectedType,
        message: message.trim(),
        context: { page: pathname },
      });
      toast.success("Thanks for your feedback!");
      setOpen(false);
      setSelectedType(null);
      setMessage("");
    } catch {
      toast.error("Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* bottom-24 clears the tab bar and its center FAB. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send feedback"
        onPress={() => setOpen(true)}
        className="absolute bottom-24 right-4 h-10 w-10 items-center justify-center rounded-full bg-muted/80 shadow-md active:bg-muted"
      >
        <MessageSquare size={20} color={colors.mutedForeground} />
      </Pressable>

      <Dialog open={open} onOpenChange={setOpen} contentClassName="max-w-sm">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Help us improve OpenTrainer during early access.
          </DialogDescription>
        </DialogHeader>

        <View className="gap-4 py-2">
          <View className="flex-row flex-wrap justify-between gap-y-2">
            {FEEDBACK_TYPES.map((type) => {
              const isSelected = selectedType === type.id;
              return (
                <Pressable
                  key={type.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelectedType(type.id)}
                  className={cn(
                    "w-[48%] items-center gap-2 rounded-lg border p-3",
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border active:bg-muted/50",
                  )}
                >
                  <type.icon size={20} color={colors.foreground} />
                  <Text className="text-center text-xs font-medium text-foreground">
                    {type.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="gap-2">
            <Label>Your feedback</Label>
            <Input
              value={message}
              onChangeText={setMessage}
              placeholder="Tell us what's on your mind..."
              accessibilityLabel="Your feedback"
              multiline
              textAlignVertical="top"
              className="h-auto min-h-[100px] px-3 py-2 text-sm"
            />
          </View>
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onPress={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
