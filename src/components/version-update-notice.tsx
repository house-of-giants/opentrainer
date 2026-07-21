"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	getActiveDismissedReleaseId,
	getDismissedReleaseStorageKey,
	getReleaseStatus,
	normalizeReleaseId,
	parseStoredReleaseCheck,
	shouldCheckForRelease,
} from "@/lib/release-version";

const CURRENT_RELEASE_ID = normalizeReleaseId(
	process.env.NEXT_PUBLIC_OPENTRAINER_RELEASE_ID
);
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const MINIMUM_RECHECK_MS = 60 * 1000;
const REQUEST_TIMEOUT_MS = 10 * 1000;
const DISMISSAL_DURATION_MS = 24 * 60 * 60 * 1000;
const RELEASE_CHECK_KEY = CURRENT_RELEASE_ID
	? `opentrainer:release-check:${CURRENT_RELEASE_ID}`
	: null;

function readStorage(key: string): string | null {
	try {
		return window.localStorage.getItem(key);
	} catch {
		return null;
	}
}

function writeStorage(key: string, value: string) {
	try {
		window.localStorage.setItem(key, value);
	} catch {
		// Storage can be unavailable in private or restricted browsing contexts.
	}
}

function readLatestRelease(payload: unknown): string | null {
	if (!payload || typeof payload !== "object") return null;
	return normalizeReleaseId(
		(payload as { releaseId?: string | null }).releaseId
	);
}

export function VersionUpdateNotice() {
	const pathname = usePathname();
	const [availableReleaseId, setAvailableReleaseId] = useState<string | null>(
		null
	);

	useEffect(() => {
		if (!CURRENT_RELEASE_ID || !RELEASE_CHECK_KEY) return;

		let latestReleaseId: string | null = null;
		let requestController: AbortController | null = null;
		let requestTimeout: number | null = null;
		let stopped = false;

		const updateNotice = (releaseId: string) => {
			latestReleaseId = releaseId;
			const dismissalKey = getDismissedReleaseStorageKey(releaseId);
			const dismissedReleaseId = getActiveDismissedReleaseId({
				value: dismissalKey ? readStorage(dismissalKey) : null,
				now: Date.now(),
				maximumAgeMs: DISMISSAL_DURATION_MS,
			});
			const status = getReleaseStatus({
				currentReleaseId: CURRENT_RELEASE_ID,
				latestReleaseId: releaseId,
				dismissedReleaseId,
			});
			setAvailableReleaseId(status === "available" ? releaseId : null);
		};

		const checkForRelease = async () => {
			if (stopped || requestController) return;

			const cachedCheck = parseStoredReleaseCheck(
				readStorage(RELEASE_CHECK_KEY)
			);
			const now = Date.now();
			const shouldCheck = shouldCheckForRelease({
				now,
				lastCheckedAt: cachedCheck?.checkedAt ?? null,
				minimumIntervalMs: MINIMUM_RECHECK_MS,
				isOnline: navigator.onLine,
				isVisible: document.visibilityState === "visible",
			});

			if (!shouldCheck) {
				if (cachedCheck) updateNotice(cachedCheck.releaseId);
				return;
			}

			requestController = new AbortController();
			requestTimeout = window.setTimeout(
				() => requestController?.abort(),
				REQUEST_TIMEOUT_MS
			);

			try {
				const response = await fetch(`/api/version?t=${now}`, {
					cache: "no-store",
					headers: { Accept: "application/json" },
					signal: requestController.signal,
				});
				if (!response.ok) return;

				const releaseId = readLatestRelease(await response.json());
				if (!releaseId || stopped) return;

				writeStorage(
					RELEASE_CHECK_KEY,
					JSON.stringify({ releaseId, checkedAt: Date.now() })
				);
				updateNotice(releaseId);
			} catch {
				// A version check should never interrupt the user when offline or blocked.
			} finally {
				if (requestTimeout !== null) window.clearTimeout(requestTimeout);
				requestTimeout = null;
				requestController = null;
			}
		};

		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") void checkForRelease();
		};
		const handleStorage = (event: StorageEvent) => {
			if (event.key === RELEASE_CHECK_KEY) {
				const storedCheck = parseStoredReleaseCheck(event.newValue);
				if (storedCheck) updateNotice(storedCheck.releaseId);
			}
			if (
				latestReleaseId &&
				event.key === getDismissedReleaseStorageKey(latestReleaseId)
			) {
				updateNotice(latestReleaseId);
			}
		};

		void checkForRelease();
		const interval = window.setInterval(
			() => void checkForRelease(),
			CHECK_INTERVAL_MS
		);
		window.addEventListener("focus", checkForRelease);
		window.addEventListener("online", checkForRelease);
		window.addEventListener("storage", handleStorage);
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			stopped = true;
			window.clearInterval(interval);
			if (requestTimeout !== null) window.clearTimeout(requestTimeout);
			requestController?.abort();
			window.removeEventListener("focus", checkForRelease);
			window.removeEventListener("online", checkForRelease);
			window.removeEventListener("storage", handleStorage);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, []);

	const isActiveWorkout = pathname.startsWith("/workout/active");
	const handleDismiss = () => {
		if (!availableReleaseId) return;
		const dismissalKey = getDismissedReleaseStorageKey(availableReleaseId);
		if (!dismissalKey) return;
		writeStorage(
			dismissalKey,
			JSON.stringify({
				releaseId: availableReleaseId,
				dismissedAt: Date.now(),
			})
		);
		setAvailableReleaseId(null);
	};

	return (
		<div
			role="status"
			aria-live="polite"
			aria-atomic="true"
			className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-3"
			style={{
				top: "max(0.75rem, env(safe-area-inset-top))",
				paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
				paddingRight: "max(0.75rem, env(safe-area-inset-right))",
			}}
		>
			{availableReleaseId && (
				<div className="pointer-events-auto flex w-full max-w-lg flex-col gap-3 rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-200 sm:flex-row sm:items-center">
					<div className="flex min-w-0 flex-1 items-start gap-3">
						<div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
							<RefreshCw className="size-4" aria-hidden="true" />
						</div>
						<div className="min-w-0">
							<p className="text-sm font-semibold">New version available</p>
							<p className="text-sm text-muted-foreground">
								Refresh to get the latest OpenTrainer updates.
								{isActiveWorkout &&
									" Your workout will not refresh automatically."}
							</p>
						</div>
					</div>
					<div className="flex shrink-0 items-center justify-end gap-1">
						<Button
							type="button"
							variant="ghost"
							className="h-11 px-3 sm:h-9"
							onClick={handleDismiss}
						>
							Later
						</Button>
						<Button
							type="button"
							className="h-11 px-4 sm:h-9"
							onClick={() => window.location.reload()}
						>
							Refresh
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
