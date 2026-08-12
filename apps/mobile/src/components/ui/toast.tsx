import Toast, { BaseToast, BaseToastProps } from "react-native-toast-message";

import { colorPalettes } from "@/theme/tokens";

// Drop-in replacement surface for web's sonner `toast` API (23 call sites):
// toast.success / toast.error / toast.info / toast.message.
type ToastVariant = "success" | "error" | "info";

function show(variant: ToastVariant, title: string, description?: string) {
  Toast.show({ type: variant, text1: title, text2: description });
}

export const toast = {
  success: (title: string, description?: string) =>
    show("success", title, description),
  error: (title: string, description?: string) => show("error", title, description),
  info: (title: string, description?: string) => show("info", title, description),
  message: (title: string, description?: string) =>
    show("info", title, description),
};

function themedToast(scheme: "light" | "dark", accent: string) {
  const colors = colorPalettes[scheme];
  function ThemedToast(props: BaseToastProps) {
    return (
      <BaseToast
        {...props}
        style={{
          borderLeftColor: accent,
          backgroundColor: colors.card,
          borderRadius: 10,
        }}
        text1Style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}
        text2Style={{ color: colors.mutedForeground, fontSize: 13 }}
      />
    );
  }
  return ThemedToast;
}

// react-native-toast-message config, keyed by resolved scheme at render time
// in the root layout.
export function toastConfig(scheme: "light" | "dark") {
  const colors = colorPalettes[scheme];
  return {
    success: themedToast(scheme, "#22c55e"),
    error: themedToast(scheme, colors.destructive),
    info: themedToast(scheme, colors.primary),
  };
}
