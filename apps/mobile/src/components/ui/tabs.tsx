import { createContext, ReactNode, useContext } from "react";
import { Pressable, Text, View, ViewProps } from "react-native";

import { cn } from "@/lib/cn";

interface TabsContextValue {
  value: string;
  onValueChange?: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue>({ value: "" });

interface TabsProps extends ViewProps {
  value: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: ReactNode;
}

function Tabs({ value, onValueChange, className, children, ...props }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <View className={cn("gap-2", className)} {...props}>
        {children}
      </View>
    </TabsContext.Provider>
  );
}

function TabsList({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={cn(
        "flex-row items-center justify-center rounded-lg bg-muted p-1",
        className,
      )}
      {...props}
    />
  );
}

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

function TabsTrigger({ value, children, className, disabled }: TabsTriggerProps) {
  const ctx = useContext(TabsContext);
  const active = ctx.value === value;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => ctx.onValueChange?.(value)}
      className={cn(
        "flex-1 flex-row items-center justify-center gap-1.5 rounded-md px-3 py-1.5",
        active && "bg-background",
        disabled && "opacity-50",
        className,
      )}
    >
      {typeof children === "string" ? (
        <Text
          className={cn(
            "text-sm font-medium",
            active ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

interface TabsContentProps extends ViewProps {
  value: string;
  className?: string;
  children: ReactNode;
}

function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const ctx = useContext(TabsContext);
  if (ctx.value !== value) return null;
  return (
    <View className={className} {...props}>
      {children}
    </View>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
