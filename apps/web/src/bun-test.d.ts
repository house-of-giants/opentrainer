// The web app does not install @types/bun. This types the one bun:test API
// that web tests use.
declare module "bun:test" {
  export const mock: {
    module(specifier: string, factory: () => Record<string, unknown>): void;
  };
}
