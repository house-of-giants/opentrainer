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
      snapPoints={snapPoints}
      enableDynamicSizing={!snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={handleStyle}
      onDismiss={() => onOpenChange(false)}
    >
      <Container className={cn("px-4 pb-8", contentClassName)}>
        {children}
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
