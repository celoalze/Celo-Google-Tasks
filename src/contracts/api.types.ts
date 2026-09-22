/**
 * Result pattern for explicit error handling across the application.
 */
export type Result<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: string };

export function success<T>(data: T): Result<T> {
  return Object.freeze({ ok: true, data });
}

export function failure<T = never>(error: string): Result<T> {
  return Object.freeze({ ok: false, error });
}
