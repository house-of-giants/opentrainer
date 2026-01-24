"use client";

import Link from "next/link";

const ASCII_LOGO = `
█▀█ █▀█ █▀▀ █▄░█ ▀█▀ █▀█ ▄▀█ █ █▄░█ █▀▀ █▀█
█▄█ █▀▀ ██▄ █░▀█ ░█░ █▀▄ █▀█ █ █░▀█ ██▄ █▀▄
`;

const COMPACT_LOGO = `
█▀█ ▀█▀
█▄█ ░█░
`;

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
  const content = (
    <>
      <pre
        className={`hidden sm:block font-mono text-[0.6rem] leading-[0.7rem] tracking-tighter select-none ${className}`}
        aria-label="OpenTrainer"
      >
        {variant === "full" ? ASCII_LOGO : COMPACT_LOGO}
      </pre>
      <pre
        className={`sm:hidden font-mono text-[0.5rem] leading-[0.6rem] tracking-tighter select-none ${className}`}
        aria-label="OpenTrainer"
      >
        {COMPACT_LOGO}
      </pre>
    </>
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
