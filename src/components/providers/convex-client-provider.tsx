"use client";

import { ReactNode, useMemo } from "react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ClerkProvider, useAuth, SignedIn } from "@clerk/nextjs";
import { FeedbackButton } from "@/components/feedback/feedback-button";

interface ConvexClientProviderProps {
	children: ReactNode;
}

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function MissingEnvWarning() {
	return (
		<div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
			<h1 className="text-2xl font-bold mb-4">Configuration Required</h1>
			<p className="text-muted-foreground mb-4">
				Please set up your environment variables to continue.
			</p>
			<code className="bg-muted p-4 rounded text-sm">
				NEXT_PUBLIC_CONVEX_URL
				<br />
				NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
			</code>
		</div>
	);
}

export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
	const convex = useMemo(() => {
		if (!CONVEX_URL) return null;
		return new ConvexReactClient(CONVEX_URL);
	}, []);

	if (!CONVEX_URL || !CLERK_KEY || !convex) {
		return <MissingEnvWarning />;
	}

	return (
		<ClerkProvider publishableKey={CLERK_KEY} afterSignOutUrl="/">
			<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
				{children}
				<SignedIn>
					<FeedbackButton />
				</SignedIn>
			</ConvexProviderWithClerk>
		</ClerkProvider>
	);
}
