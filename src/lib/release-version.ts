export type ReleaseStatus =
	| "unavailable"
	| "current"
	| "dismissed"
	| "available";

interface ReleaseStatusInput {
	currentReleaseId: string | null | undefined;
	latestReleaseId: string | null | undefined;
	dismissedReleaseId?: string | null;
}

interface ReleaseCheckInput {
	now: number;
	lastCheckedAt: number | null;
	minimumIntervalMs: number;
	isOnline: boolean;
	isVisible: boolean;
}

export interface StoredReleaseCheck {
	releaseId: string;
	checkedAt: number;
}

export interface StoredReleaseDismissal {
	releaseId: string;
	dismissedAt: number;
}

export function normalizeReleaseId(
	releaseId: string | null | undefined
): string | null {
	const normalized = releaseId?.trim();
	return normalized ? normalized : null;
}

export function getReleaseStatus({
	currentReleaseId,
	latestReleaseId,
	dismissedReleaseId,
}: ReleaseStatusInput): ReleaseStatus {
	const current = normalizeReleaseId(currentReleaseId);
	const latest = normalizeReleaseId(latestReleaseId);
	const dismissed = normalizeReleaseId(dismissedReleaseId);

	if (!current || !latest) return "unavailable";
	if (current === latest) return "current";
	if (latest === dismissed) return "dismissed";
	return "available";
}

export function shouldCheckForRelease({
	now,
	lastCheckedAt,
	minimumIntervalMs,
	isOnline,
	isVisible,
}: ReleaseCheckInput): boolean {
	if (!isOnline || !isVisible) return false;
	if (lastCheckedAt === null || !Number.isFinite(lastCheckedAt)) return true;

	const elapsed = now - lastCheckedAt;
	if (elapsed < 0) return true;

	return elapsed >= Math.max(0, minimumIntervalMs);
}

export function parseStoredReleaseCheck(
	value: string | null
): StoredReleaseCheck | null {
	if (!value) return null;

	try {
		const parsed: unknown = JSON.parse(value);
		if (!parsed || typeof parsed !== "object") return null;

		const candidate = parsed as Partial<StoredReleaseCheck>;
		const releaseId = normalizeReleaseId(candidate.releaseId);
		if (!releaseId || !Number.isFinite(candidate.checkedAt)) return null;

		return { releaseId, checkedAt: candidate.checkedAt as number };
	} catch {
		return null;
	}
}

export function getActiveDismissedReleaseId({
	value,
	now,
	maximumAgeMs,
}: {
	value: string | null;
	now: number;
	maximumAgeMs: number;
}): string | null {
	if (!value) return null;

	try {
		const parsed: unknown = JSON.parse(value);
		if (!parsed || typeof parsed !== "object") return null;

		const candidate = parsed as Partial<StoredReleaseDismissal>;
		const releaseId = normalizeReleaseId(candidate.releaseId);
		if (!releaseId || !Number.isFinite(candidate.dismissedAt)) return null;

		const elapsed = now - (candidate.dismissedAt as number);
		if (elapsed < 0 || elapsed >= Math.max(0, maximumAgeMs)) return null;

		return releaseId;
	} catch {
		return null;
	}
}
