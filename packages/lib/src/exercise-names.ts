export function cleanExerciseName(name: string) {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ");
}

export function normalizeExerciseName(name: string) {
  return cleanExerciseName(name).toLowerCase();
}
