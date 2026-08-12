// Web's routine builder/editor key local rows with crypto.randomUUID().
// Hermes does not guarantee WebCrypto, so fall back to a timestamp+random id.
// These ids are ephemeral list keys only; they are never persisted.
export function newLocalId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
