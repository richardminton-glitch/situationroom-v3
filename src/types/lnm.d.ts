// @ln-markets/api SDK is no longer used.
// LNM v3 API calls are handled by src/lib/lnm/client.ts (custom HMAC client).
// This file is kept empty to prevent TS errors if the package is still installed.

declare module '@ln-markets/api' {
  export function createRestClient(options?: Record<string, unknown>): unknown;
}
