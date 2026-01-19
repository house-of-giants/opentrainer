"use client";

import Link from "next/link";

const ASCII_LOGO = `█▀█ █▀█ █▀▀ █▄░█ ▀█▀ █▀█ ▄▀█ █ █▄░█ █▀▀ █▀█
█▄█ █▀▀ ██▄ █░▀█ ░█░ █▀▄ █▀█ █ █░▀█ ██▄ █▀▄`;

const COMPACT_LOGO = `█▀█ ▀█▀
█▄█ ░█░`;

interface AsciiLogoProps {
  variant?: "full" | "compact";
  href?: string;
  className?: string;
}

export function AsciiLogo({ 
  variant = "full", 
  href = "/",
  className = "" 
}: AsciiLogoProps) {
  const logo = variant === "full" ? ASCII_LOGO : COMPACT_LOGO;
  
  const content = (
    <pre 
      className={`font-mono text-[0.5rem] leading-[0.6rem] sm:text-[0.6rem] sm:leading-[0.7rem] tracking-tighter select-none ${className}`}
      aria-label="OpenTrainer"
    >
      {logo}
    </pre>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
