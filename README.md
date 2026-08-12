# OpenTrainer

A workout tracker that respects your time. Log sets in 2 taps, not 5 screens.

**[Try it free](https://opentrainer.app)** | **[Report a bug](https://github.com/house-of-giants/opentrainer/issues)**

OpenTrainer keeps the next action, sets remaining, elapsed time, and training progress close at hand. It supports focused workout logging, equipment-aware routine generation, and full JSON data export.

## Workspaces

OpenTrainer is a Bun-workspaces monorepo with a hoisted dependency linker.

| Workspace | Description |
| --- | --- |
| `apps/web` | Next.js 16 web app with the App Router and Tailwind CSS |
| `apps/mobile` | Expo SDK 57 iOS app using Expo Router, NativeWind, Clerk, and Convex |
| `packages/backend` | Convex schema and functions; exports the generated `api` and data-model types |
| `packages/lib` | Pure shared logic, including units and progression utilities |

## Quickstart

### Prerequisites

- [Bun](https://bun.sh)
- Convex and Clerk projects
- For local iOS builds, macOS with Xcode

Clone the repository and install all workspace dependencies from its root:

```bash
git clone https://github.com/house-of-giants/opentrainer.git
cd opentrainer
bun install
```

### Web

Copy `apps/web/.env.example` to `apps/web/.env.local` and add your Convex and Clerk credentials. Then run the backend and web app in separate terminals:

```bash
cd packages/backend
bun run dev
```

```bash
cd apps/web
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Mobile

Create the mobile environment file and fill in the two required values shown in the example:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

The required variables are `EXPO_PUBLIC_CONVEX_URL` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`. Then start Expo:

```bash
cd apps/mobile
bun run start
```

See the [mobile README](apps/mobile/README.md) for development builds, tests, and EAS builds.

## Checks

Run repository-wide commands from the root:

```bash
bun run build
bun run lint
bun run typecheck
bun run test
```

`build` and `lint` target the web app, `typecheck` covers every `@opentrainer/*` workspace, and `test` runs the Bun web/package tests followed by the mobile Jest suite.

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

See [LICENSE](LICENSE).
