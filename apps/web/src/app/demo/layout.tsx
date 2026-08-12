"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, History, Dumbbell, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SignUpButton } from "@clerk/nextjs";
import { StartWorkoutSheetDemo } from "@/components/demo/start-workout-sheet-demo";

export default function DemoLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [showStartSheet, setShowStartSheet] = useState(false);

  const navItems = [
    { href: "/demo", icon: Home, label: "Home" },
    { href: "/demo/history", icon: History, label: "History" },
    { href: "/demo/routines", icon: Dumbbell, label: "Routines" },
    { href: "/demo/profile", icon: User, label: "Profile" },
  ];

  const isActive = (href: string) => {
    if (href === "/demo") {
      return pathname === "/demo";
    }
    return pathname.startsWith(href);
  };

  const handleStartWorkout = () => {
    setShowStartSheet(true);
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Demo Banner */}
      <div className="sticky top-0 z-50 border-b bg-amber-500/10 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-2">
          <p className="text-sm font-medium">
            <span className="text-amber-600 dark:text-amber-400">Demo Mode</span> • Data is not saved
          </p>
          <SignUpButton mode="modal">
            <Button size="sm" variant="default">
              Sign Up to Save
            </Button>
          </SignUpButton>
        </div>
      </div>

      {children}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
          {navItems.slice(0, 2).map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors",
                  active
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
                    active && "bg-primary/10"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}

          <button
            onClick={handleStartWorkout}
            className="flex h-14 w-14 -translate-y-2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <Plus className="h-7 w-7" />
          </button>

          {navItems.slice(2).map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors",
                  active
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
                    active && "bg-primary/10"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                </div>
                <span>{item.label}</span>
              </Link>
          );
        })}
      </div>
    </nav>

    <StartWorkoutSheetDemo open={showStartSheet} onOpenChange={setShowStartSheet} />
  </div>
);
}
