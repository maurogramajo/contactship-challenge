declare module "bun:test" {
  export const describe: (...args: readonly unknown[]) => unknown;
  export const it: (...args: readonly unknown[]) => unknown;
  export const expect: (...args: readonly unknown[]) => unknown;
}
