import { Pressable, PressableProps, Text, TextProps, View, ViewProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

// Port of the subset of apps/web/src/components/ui/field.tsx that has call
// sites in the ported screens: the AI routine wizard imports Field,
// FieldContent, FieldDescription, FieldLabel and FieldTitle. FieldSet,
// FieldGroup, FieldLegend, FieldSeparator and FieldError are unused and are
// intentionally not ported.
//
// The web kit leans on `has-*` selectors and container queries to restyle
// itself from the DOM shape; RN has neither, so the variants that the wizard
// actually renders are expressed as explicit props:
//   - web `orientation="responsive"` (container query) is dropped.
//   - web's `<label>`-wraps-a-`<Field>` card, which grows a border and a
//     checked background via `has-data-[state=checked]`, becomes a Pressable
//     with an explicit `selected` prop.

const fieldVariants = cva("w-full gap-3", {
  variants: {
    orientation: {
      // Web: `flex-col [&>*]:w-full`.
      vertical: "flex-col",
      // Web `horizontal` is `items-center`, but any Field holding a
      // FieldContent switches to `items-start` — the only shape used here.
      horizontal: "flex-row items-start",
    },
  },
  defaultVariants: { orientation: "vertical" },
});

interface FieldProps extends ViewProps, VariantProps<typeof fieldVariants> {
  className?: string;
}

function Field({ className, orientation = "vertical", ...props }: FieldProps) {
  return (
    <View
      accessibilityRole="none"
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  );
}

function FieldContent({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn("flex-1 gap-1.5", className)} {...props} />;
}

interface FieldLabelProps extends PressableProps {
  className?: string;
  /** Replaces web's `has-data-[state=checked]` card highlight. */
  selected?: boolean;
}

function FieldLabel({ className, selected = false, ...props }: FieldLabelProps) {
  return (
    <Pressable
      className={cn(
        "w-full flex-col rounded-md border border-border p-4",
        selected && "border-primary bg-primary/5",
        className,
      )}
      {...props}
    />
  );
}

function FieldTitle({ className, ...props }: TextProps & { className?: string }) {
  return (
    <Text
      className={cn("text-sm font-medium leading-snug text-foreground", className)}
      {...props}
    />
  );
}

function FieldDescription({ className, ...props }: TextProps & { className?: string }) {
  return (
    <Text className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}

export { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle };
