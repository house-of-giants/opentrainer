import { ReactNode } from "react";
import { ActivityIndicator, Pressable, PressableProps, Text } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

// Port of apps/web/src/components/ui/button.tsx. Container and text styles are
// split because RN does not cascade text color/size through views.
const buttonVariants = cva(
  "flex-row items-center justify-center gap-2 rounded-md active:opacity-90 disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary",
        destructive: "bg-destructive",
        outline: "border border-border bg-background active:bg-accent",
        secondary: "bg-secondary",
        ghost: "active:bg-accent",
        link: "",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-md px-6",
        icon: "h-11 w-11",
        "icon-sm": "h-9 w-9",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

const buttonTextVariants = cva("text-sm font-medium", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      destructive: "text-white",
      outline: "text-foreground",
      secondary: "text-secondary-foreground",
      ghost: "text-foreground",
      link: "text-primary underline",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface ButtonProps
  extends Omit<PressableProps, "children">,
    VariantProps<typeof buttonVariants> {
  children?: ReactNode;
  className?: string;
  textClassName?: string;
  loading?: boolean;
}

function Button({
  className,
  textClassName,
  variant,
  size,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <ActivityIndicator size="small" />}
      {typeof children === "string" ? (
        <Text className={cn(buttonTextVariants({ variant }), textClassName)}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

export { Button, buttonVariants, buttonTextVariants };
