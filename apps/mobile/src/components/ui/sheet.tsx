import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { Text, TextProps, View, ViewProps } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";

import { ReduceMotion } from "react-native-reanimated";

import { cn } from "@/lib/cn";
import { toast } from "@/components/ui/toast";
import { useTheme } from "@/theme/theme-provider";

// Replaces both web drawer.tsx (vaul) and sheet.tsx (Radix): a bottom sheet is
// the app's primary interaction surface on mobile. Controlled API mirrors the
// web components' open/onOpenChange contract.
interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  /** e.g. ["50%", "90%"]; defaults to content-height sizing. */
  snapPoints?: (string | number)[];
  scrollable?: boolean;
  contentClassName?: string;
}

function Sheet({
  open,
  onOpenChange,
  children,
  snapPoints,
  scrollable = false,
  contentClassName,
}: SheetProps) {
  const ref = useRef<BottomSheetModal>(null);
  const { colors } = useTheme();

  useEffect(() => {
    if (open) {
      // TEMP DIAGNOSTIC (remove after #15): visible trace for TestFlight.
      console.log("[sheet] present requested; ref mounted:", !!ref.current);
      toast.info("diag: sheet.present", `ref mounted: ${!!ref.current}`);
      ref.current?.present();
    } else {
      ref.current?.dismiss();
    }
  }, [open]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  const backgroundStyle = useMemo(
    () => ({ backgroundColor: colors.card }),
    [colors.card],
  );
  const handleStyle = useMemo(
    () => ({ backgroundColor: colors.mutedForeground }),
    [colors.mutedForeground],
  );

  const Container = scrollable ? BottomSheetScrollView : BottomSheetView;

  return (
    <BottomSheetModal
      ref={ref}
      // Dynamic sizing (the default when no snapPoints were given) measures to
      // zero height under RN new-arch and the sheet "presents" invisibly —
      // always give explicit snap points instead.
      snapPoints={snapPoints ?? ["60%"]}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={handleStyle}
      // Known v5 failure mode: with iOS "Reduce Motion" enabled, the default
      // ReduceMotion.System suppresses the mount animation and the sheet
      // never presents at all. Always animate.
      overrideReduceMotion={ReduceMotion.Never}
      onDismiss={() => onOpenChange(false)}
      // TEMP DIAGNOSTIC (remove once sheets confirmed): index changes prove
      // the presentation animation actually ran.
      onChange={(index) => toast.info("diag: sheet index", String(index))}
    >
      {/* NativeWind doesn't process third-party components' className —
          padding lives on an inner core View instead. */}
      <Container style={{ flex: scrollable ? 1 : undefined }}>
        <View className={cn("px-4 pb-8", contentClassName)}>{children}</View>
      </Container>
    </BottomSheetModal>
  );
}

function SheetHeader({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn("gap-1.5 py-2", className)} {...props} />;
}

function SheetTitle({ className, ...props }: TextProps & { className?: string }) {
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
    <Text className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}

export { Sheet, SheetHeader, SheetTitle, SheetDescription };
