export function normalizeExerciseName(name: string) {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}
