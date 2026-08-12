import { Text, TextProps, View, ViewProps } from "react-native";

import { cn } from "@/lib/cn";

function Card({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={cn("rounded-xl border border-border bg-card", className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn("gap-1.5 p-4", className)} {...props} />;
}

function CardTitle({ className, ...props }: TextProps & { className?: string }) {
  return (
    <Text
      className={cn("text-base font-semibold text-card-foreground", className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: TextProps & { className?: string }) {
  return (
    <Text className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}

function CardContent({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn("p-4 pt-0", className)} {...props} />;
}

function CardFooter({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View className={cn("flex-row items-center p-4 pt-0", className)} {...props} />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
