/**
 * How the user logs effort. "rpe" offers RPE 6 to 10 in half steps; "rir"
 * offers reps in reserve 0 to 4. Users without the field use "rpe".
 */
export type EffortScale = "rpe" | "rir";

/** RIR for a whole-number RPE on the logging scale (RPE 6 to 10 is RIR 4 to 0). */
function rirForRpe(rpe: number): number | undefined {
	return Number.isInteger(rpe) && rpe >= 6 && rpe <= 10 ? 10 - rpe : undefined;
}

/**
 * The effort fields to store on a lifting set. Progression and reports read
 * `rpe`, so it is always stored. `rir` is stored only when the user logs on
 * the RIR scale, or when an edit leaves an RIR-logged effort unchanged.
 */
export function effortForStorage(
	rpe: number | null | undefined,
	scale: EffortScale,
	previous?: { rpe?: number | null; rir?: number | null }
): { rpe?: number; rir?: number } {
	if (rpe == null) return { rpe: undefined, rir: undefined };
	if (scale === "rir") return { rpe, rir: rirForRpe(rpe) };
	const keptRir = previous?.rpe === rpe ? previous.rir ?? undefined : undefined;
	return { rpe, rir: keptRir };
}
