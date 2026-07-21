import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
	"Cache-Control": "private, no-store, max-age=0, must-revalidate",
	"CDN-Cache-Control": "no-store",
	"Vercel-CDN-Cache-Control": "no-store",
	"X-Robots-Tag": "noindex, nofollow",
};

export function GET() {
	const releaseId =
		process.env.VERCEL_ENV === "production"
			? (process.env.VERCEL_DEPLOYMENT_ID ?? null)
			: null;

	return NextResponse.json({ releaseId }, { headers: NO_STORE_HEADERS });
}
