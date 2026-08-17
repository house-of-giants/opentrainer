import { useRef, useCallback } from "react";

// Port of apps/web/src/hooks/use-client-id.ts: stable per-mount prefix plus a
// module-level counter so optimistic Convex mutations get unique client ids.
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
