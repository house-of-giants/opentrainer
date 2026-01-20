# OpenTrainer

A workout tracker that respects your time. Log sets in 2 taps, not 5 screens.

**[Try it free](https://opentrainer.app)** | **[Report a bug](https://github.com/house-of-giants/opentrainer/issues)**

## Why OpenTrainer?

Most workout apps are bloated. You're between sets, sweaty, 45 seconds on the clock, and the app wants you to tap through menus.

OpenTrainer is different:
- **2 taps per set.** Log and get back to lifting.
- **AI that knows your gym.** Tell it what equipment you have. Get a program that actually uses it.
- **Your data, your rules.** Full JSON export. No lock-in. Leave anytime.
- **No tracking pixels.** We don't sell your data.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** Convex
- **Auth:** Clerk
- **AI:** Google Gemini
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (recommended) or Node.js 18+
- Convex account (free tier works)
- Clerk account (free tier works)

### Setup

1. Clone the repo
   ```bash
   git clone https://github.com/house-of-giants/opentrainer.git
   cd opentrainer
   ```

2. Install dependencies
   ```bash
   bun install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your Convex and Clerk credentials. See `.env.example` for required variables.

4. Start Convex (in a separate terminal)
   ```bash
   bunx convex dev
   ```

5. Start the dev server
   ```bash
   bun run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/           # Next.js App Router pages
├── components/    # React components
│   ├── ui/        # Base UI components (buttons, dialogs, etc.)
│   ├── workout/   # Workout-specific components
│   └── ...
├── lib/           # Utilities and helpers
convex/
├── schema.ts      # Database schema
├── *.ts           # Backend functions (queries, mutations)
```

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[Apache 2.0](LICENSE)
