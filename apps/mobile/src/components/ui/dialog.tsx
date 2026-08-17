import { ReactNode } from "react";
import { Modal, Pressable, Text, TextProps, View, ViewProps } from "react-native";
import { X } from "lucide-react-native";

import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/theme-provider";
import { themes } from "@/theme/tokens";

// Port of the web Radix Dialog: controlled open/onOpenChange, centered card
// over a dimmed backdrop. RN Modal renders outside the ThemeProvider View
// hierarchy, so theme vars are re-applied inside.
interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  /** Hide the default top-right close button. */
  hideClose?: boolean;
  contentClassName?: string;
}

function Dialog({
  open,
  onOpenChange,
  children,
  hideClose = false,
  contentClassName,
}: DialogProps) {
  const { resolved, colors } = useTheme();
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <View style={themes[resolved]} className="flex-1">
        <Pressable
          className="absolute inset-0 bg-black/50"
          onPress={() => onOpenChange(false)}
          accessibilityLabel="Close dialog"
        />
        <View className="flex-1 items-center justify-center p-6" pointerEvents="box-none">
          <View
            className={cn(
              "w-full max-w-md gap-4 rounded-xl border border-border bg-background p-6",
              contentClassName,
            )}
          >
            {children}
            {!hideClose && (
              <Pressable
                className="absolute right-4 top-4 h-8 w-8 items-center justify-center"
                onPress={() => onOpenChange(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={8}
              >
                <X size={18} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DialogHeader({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn("gap-2", className)} {...props} />;
}

function DialogTitle({ className, ...props }: TextProps & { className?: string }) {
  return (
    <Text
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: TextProps & { className?: string }) {
  return (
    <Text className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}

function DialogFooter({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View className={cn("flex-row justify-end gap-2", className)} {...props} />
  );
}

export { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter };
