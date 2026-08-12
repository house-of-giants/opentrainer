"use client";

import { useRef, useCallback } from "react";

let globalCounter = 0;

export function useClientId() {
  const prefixRef = useRef<string | null>(null);

  if (prefixRef.current === null) {
    prefixRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  const generateClientId = useCallback(() => {
    globalCounter++;
    return `${prefixRef.current}-${globalCounter}`;
  }, []);

  return { generateClientId };
}
