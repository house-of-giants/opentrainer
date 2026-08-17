"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const APP_STORE_URL = "https://apps.apple.com/app/id6800907584";
const DISMISSED_KEY = "opentrainer:ios-app-notice:dismissed";

// One-time App Store launch announcement for signed-in users. Unlike
// version-update-notice this never re-arms: any dismissal (the ✕ or
// following the badge) is permanent.
let listeners: Array<() => void> = [];

function subscribe(listener: () => void) {
	listeners.push(listener);
	return () => {
		listeners = listeners.filter((l) => l !== listener);
	};
}

function isDismissed(): boolean {
	try {
		return window.localStorage.getItem(DISMISSED_KEY) !== null;
	} catch {
		// Storage can be unavailable in private or restricted browsing
		// contexts; skip the notice rather than re-showing it forever.
		return true;
	}
}

function dismiss() {
	try {
		window.localStorage.setItem(
			DISMISSED_KEY,
			JSON.stringify({ dismissedAt: Date.now() })
		);
	} catch {
		// Ignore; without storage the notice was never shown anyway.
	}
	for (const listener of listeners) listener();
}

export function IosAppNotice() {
	// Server snapshot says "dismissed" so SSR and hydration render nothing;
	// the real storage read happens on the client.
	const dismissed = useSyncExternalStore(subscribe, isDismissed, () => true);

	if (dismissed) return null;

	return (
		<div
			role="status"
			className="relative flex flex-col gap-3 rounded-xl border bg-card p-4 pr-12 sm:flex-row sm:items-center sm:justify-between"
		>
			<div className="min-w-0">
				<p className="text-sm font-semibold">OpenTrainer is now on iPhone</p>
				<p className="text-sm text-muted-foreground">
					Same account, same data — with rest-timer alerts on your lock
					screen. Free on the App Store.
				</p>
			</div>
			<a
				href={APP_STORE_URL}
				target="_blank"
				rel="noopener noreferrer"
				aria-label="Download OpenTrainer on the App Store"
				className="shrink-0 self-start transition-opacity hover:opacity-80 sm:self-auto"
				onClick={dismiss}
			>
				<Image
					src="/images/app-store-badge.svg"
					alt="Download on the App Store"
					width={135}
					height={40}
					className="h-10 w-auto"
				/>
			</a>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="absolute right-2 top-2 size-8 text-muted-foreground"
				onClick={dismiss}
				aria-label="Dismiss iPhone app announcement"
			>
				<X className="size-4" aria-hidden="true" />
			</Button>
		</div>
	);
}
