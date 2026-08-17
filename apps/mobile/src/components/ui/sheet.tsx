import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextProps,
  useWindowDimensions,
  View,
  ViewProps,
} from "react-native";

import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/theme-provider";
import { themes } from "@/theme/tokens";

// Replaces both web drawer.tsx (vaul) and sheet.tsx (Radix): a bottom sheet is
// the app's primary interaction surface on mobile. Controlled API mirrors the
// web components' open/onOpenChange contract.
//
// Implementation note: originally built on @gorhom/bottom-sheet, but its
// modal presents invisibly on-device in release builds (worklet-driven
// container layout never resolves; presents at a degenerate position). RN's
// core Modal demonstrably renders (Dialog uses it), so the sheet is built on
// Modal + core Animated instead. Trade-off vs gorhom: no drag-to-dismiss
// gesture yet — backdrop tap and actions close the sheet.
interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  /** e.g. ["50%", "90%"]; the LAST entry is used as max height. */
  snapPoints?: (string | number)[];
  scrollable?: boolean;
  contentClassName?: string;
}

const OPEN_MS = 260;
const CLOSE_MS = 200;

function heightFraction(snapPoints?: (string | number)[]): number {
  const last = snapPoints?.[snapPoints.length - 1];
  if (typeof last === "number" && last > 0 && last <= 1) return last;
  if (typeof last === "string") {
    const parsed = Number.parseFloat(last);
    if (!Number.isNaN(parsed))
      return Math.min(Math.max(parsed / 100, 0.2), 0.95);
  }
  return 0.6;
}

function Sheet({
  open,
  onOpenChange,
  children,
  snapPoints,
  scrollable = false,
  contentClassName,
}: SheetProps) {
  const { resolved } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const maxHeight = Math.round(windowHeight * heightFraction(snapPoints));

  // Modal stays mounted while the close animation plays out.
  const [visible, setVisible] = useState(open);
  const translateY = useRef(new Animated.Value(windowHeight)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      setVisible(true);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: OPEN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, {
          toValue: 1,
          duration: OPEN_MS,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: windowHeight,
          duration: CLOSE_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, {
          toValue: 0,
          duration: CLOSE_MS,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        // Interrupted close (fast re-open) must not hide the fresh sheet.
        if (finished) setVisible(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, windowHeight]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  if (!visible) return null;

  const Body = scrollable ? ScrollView : View;

  return (
    <Modal visible transparent animationType="none" onRequestClose={close}>
      {/* Lifts the sheet above the iOS keyboard; Android resizes the window
          itself (adjustResize). Plain style, not className — KAV sits outside
          the re-themed subtree below. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Modal renders outside the ThemeProvider tree; re-apply theme vars. */}
        <View style={themes[resolved]} className="flex-1 justify-end">
          <Animated.View
            style={{ opacity: backdrop }}
            className="absolute inset-0 bg-black/50"
          >
            <Pressable
              className="flex-1"
              onPress={close}
              accessibilityLabel="Close sheet"
            />
          </Animated.View>
          <Animated.View
            // flexShrink lets the sheet compress into the keyboard-reduced
            // space instead of overflowing off the top of the screen; a
            // scrollable Body then scrolls within the compressed height.
            style={{ transform: [{ translateY }], maxHeight, flexShrink: 1 }}
            className="rounded-t-2xl bg-card"
          >
            <View className="items-center py-2">
              <View className="h-1 w-10 rounded-full bg-muted-foreground/40" />
            </View>
            <Body
              className={
                scrollable ? undefined : cn("px-4 pb-8", contentClassName)
              }
              contentContainerClassName={
                scrollable ? cn("px-4 pb-8", contentClassName) : undefined
              }
              // First tap on a result/input lands while the keyboard is open
              // instead of only dismissing it.
              {...(scrollable
                ? { keyboardShouldPersistTaps: "handled" as const }
                : {})}
            >
              {children}
            </Body>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SheetHeader({
  className,
  ...props
}: ViewProps & { className?: string }) {
  return <View className={cn("gap-1.5 py-2", className)} {...props} />;
}

function SheetTitle({
  className,
  ...props
}: TextProps & { className?: string }) {
  return (
    <Text
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: TextProps & { className?: string }) {
  return (
    <Text
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Sheet, SheetHeader, SheetTitle, SheetDescription };
