# Version update notice

OpenTrainer detects new production frontend deployments without a manual release
marker. Each production build embeds Vercel's `VERCEL_DEPLOYMENT_ID`, while an
uncached `/api/version` route reads the deployment ID currently serving the
production alias. A mismatch means the open tab is running an older deployment.

The client checks on mount, every five minutes, and after reconnecting, focusing,
or returning to a visible tab. Successful checks are shared across tabs for one
minute. Failures are silent and do not advance the retry clock. The notice never
reloads the page automatically; the user chooses Refresh or Later, including
during an active workout. Later is stored against only the detected release for
24 hours. The same release can remind the user after that window, and a subsequent
deployment can notify immediately.

## Why the signal does not use Convex

[Convex queries are automatically realtime](https://docs.convex.dev/realtime),
so a singleton release record would deliver changes quickly. However, deploying
Convex functions does not itself mutate that record. The Vercel build would need
an authenticated post-deploy mutation with rollback, preview isolation, and
deployment-order handling. That is more operational state than this signal needs.

Vercel already supplies a unique deployment ID at build and runtime. A small
same-origin endpoint therefore makes release publication automatic with no
database writes. Custom `fetch()` calls are not pinned by Vercel Skew Protection
unless the application adds a deployment header or query parameter, so the
version request intentionally adds neither and resolves against the current
production alias. See [Vercel Skew Protection](https://vercel.com/docs/skew-protection).

## Vercel configuration

As a one-time project setting, open Project Settings > Environment Variables and
enable **Automatically expose System Environment Variables**. This makes
`VERCEL_DEPLOYMENT_ID` and `VERCEL_ENV` available during the build and at
runtime. Vercel documents both variables in [System environment
variables](https://vercel.com/docs/environment-variables/system-environment-variables).

If the setting is absent or either identifier is missing, detection fails closed:
the client makes no comparison and shows no notice.

No Convex schema, environment variable, release mutation, or deployment hook is
required. Preview and development builds intentionally embed no release ID, so
they never show production mismatch notices.

## Synthetic verification

Build an old client and start its dynamic route with a different current ID:

```sh
VERCEL_ENV=production VERCEL_DEPLOYMENT_ID=release-a bun run build
VERCEL_ENV=production VERCEL_DEPLOYMENT_ID=release-b bun run start
```

Open the local app and confirm that the notice appears. Start with `release-a`
again to confirm equality stays silent. Use Later, then restart with `release-c`
to confirm dismissal is scoped to only `release-b`.

The endpoint sends browser and CDN `no-store` headers. Do not add an
`x-deployment-id` header or `dpl` query parameter to its fetch: those would pin
the request to the old deployment and prevent detection.
