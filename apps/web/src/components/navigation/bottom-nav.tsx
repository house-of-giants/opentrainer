"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, History, Dumbbell, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  matchPaths?: string[];
};

const NAV_ITEMS: NavItem[] = [
  { 
    href: "/dashboard", 
    icon: Home, 
    label: "Home",
    matchPaths: ["/dashboard"]
  },
  { 
    href: "/history", 
    icon: History, 
    label: "History",
    matchPaths: ["/history", "/workout/"]
  },
  { 
    href: "/routines", 
    icon: Dumbbell, 
    label: "Routines",
    matchPaths: ["/routines"]
  },
  { 
    href: "/profile", 
    icon: User, 
    label: "Profile",
    matchPaths: ["/profile", "/settings"]
  },
];

interface BottomNavProps {
  onStartWorkout: () => void;
}

export function BottomNav({ onStartWorkout }: BottomNavProps) {
  const pathname = usePathname();

  const isActive = (item: NavItem) => {
    if (item.matchPaths) {
      return item.matchPaths.some(path => pathname.startsWith(path));
    }
    return pathname === item.href;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {NAV_ITEMS.slice(0, 2).map((item) => {
          const active = isActive(item);
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
              <div className={cn(
                "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
                active && "bg-primary/10"
              )}>
                <item.icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}

        <button
          onClick={onStartWorkout}
          className="flex h-14 w-14 -translate-y-2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <Plus className="h-7 w-7" />
        </button>

        {NAV_ITEMS.slice(2).map((item) => {
          const active = isActive(item);
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
              <div className={cn(
                "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
                active && "bg-primary/10"
              )}>
                <item.icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
