import { createContext, ReactNode, useContext } from "react";
import { Pressable, PressableProps, View, ViewProps } from "react-native";

import { cn } from "@/lib/cn";

interface RadioGroupContextValue {
  value: string | null;
  onValueChange?: (value: string) => void;
}

const RadioGroupContext = createContext<RadioGroupContextValue>({ value: null });

interface RadioGroupProps extends ViewProps {
  value: string | null;
  onValueChange?: (value: string) => void;
  className?: string;
  children: ReactNode;
}

function RadioGroup({
  value,
  onValueChange,
  className,
  children,
  ...props
}: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <View accessibilityRole="radiogroup" className={cn("gap-3", className)} {...props}>
        {children}
      </View>
    </RadioGroupContext.Provider>
  );
}

interface RadioGroupItemProps extends Omit<PressableProps, "onPress"> {
  value: string;
  className?: string;
}

function RadioGroupItem({ value, className, ...props }: RadioGroupItemProps) {
  const ctx = useContext(RadioGroupContext);
  const selected = ctx.value === value;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => ctx.onValueChange?.(value)}
      className={cn(
        "h-5 w-5 items-center justify-center rounded-full border border-input",
        selected && "border-primary",
        className,
      )}
      hitSlop={8}
      {...props}
    >
      {selected && <View className="h-2.5 w-2.5 rounded-full bg-primary" />}
    </Pressable>
  );
}

export { RadioGroup, RadioGroupItem };
