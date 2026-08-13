import { vars } from "nativewind";

// Ported from apps/web/src/app/globals.css (oklch → sRGB hex).
// Keep both files in sync when the web palette changes.

export const lightColors: Record<string, string> & {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
} = {
  background: "#f8f5ef",
  foreground: "#191a22",
  card: "#fffdfa",
  cardForeground: "#191a22",
  popover: "#fffdfa",
  popoverForeground: "#191a22",
  primary: "#7c54cd",
  primaryForeground: "#f9f7ff",
  secondary: "#e9e4da",
  secondaryForeground: "#20212b",
  muted: "#e2ded5",
  mutedForeground: "#535461",
  accent: "#d9d2f6",
  accentForeground: "#331f5a",
  destructive: "#d63236",
  border: "#d3cdc1",
  input: "#dcd7cd",
  ring: "#795bbf",
  chart1: "#855dd7",
  chart2: "#ba5db3",
  chart3: "#3e6fc2",
  chart4: "#c99500",
  chart5: "#d64c29",
};

export const darkColors: typeof lightColors = {
  background: "#080811",
  foreground: "#e8e4dd",
  card: "#181926",
  cardForeground: "#e8e4dd",
  popover: "#181926",
  popoverForeground: "#e8e4dd",
  primary: "#ad8dfd",
  primaryForeground: "#0a0714",
  secondary: "#212330",
  secondaryForeground: "#e8e4dd",
  muted: "#1d1e29",
  mutedForeground: "#868073",
  accent: "#362b52",
  accentForeground: "#e0d7ff",
  destructive: "#f14d4c",
  border: "#fffcff2e",
  input: "#fffcff33",
  ring: "#9f85e5",
  chart1: "#a27dfa",
  chart2: "#d476cd",
  chart3: "#5285d9",
  chart4: "#d9a514",
  chart5: "#e75c3a",
};

function hexToTriplet(hex: string): string {
  const h = hex.replace("#", "");
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

// Alpha-capable tokens are exposed as space-separated RGB triplets so Tailwind
// opacity modifiers (bg-primary/10 etc.) can compose them via
// `rgb(var(--x) / <alpha-value>)`. border/input keep full values because the
// dark palette bakes translucency into them (#fffcff2e).
function toVars(c: typeof lightColors) {
  return vars({
    "--background": hexToTriplet(c.background),
    "--foreground": hexToTriplet(c.foreground),
    "--card": hexToTriplet(c.card),
    "--card-foreground": hexToTriplet(c.cardForeground),
    "--popover": hexToTriplet(c.popover),
    "--popover-foreground": hexToTriplet(c.popoverForeground),
    "--primary": hexToTriplet(c.primary),
    "--primary-foreground": hexToTriplet(c.primaryForeground),
    "--secondary": hexToTriplet(c.secondary),
    "--secondary-foreground": hexToTriplet(c.secondaryForeground),
    "--muted": hexToTriplet(c.muted),
    "--muted-foreground": hexToTriplet(c.mutedForeground),
    "--accent": hexToTriplet(c.accent),
    "--accent-foreground": hexToTriplet(c.accentForeground),
    "--destructive": hexToTriplet(c.destructive),
    "--border": c.border,
    "--input": c.input,
    "--ring": hexToTriplet(c.ring),
    "--chart-1": hexToTriplet(c.chart1),
    "--chart-2": hexToTriplet(c.chart2),
    "--chart-3": hexToTriplet(c.chart3),
    "--chart-4": hexToTriplet(c.chart4),
    "--chart-5": hexToTriplet(c.chart5),
  });
}

export const themes = {
  light: toVars(lightColors),
  dark: toVars(darkColors),
} as const;

export const colorPalettes = { light: lightColors, dark: darkColors } as const;
