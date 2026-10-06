/** Shape returned by every Server Action so the UI can show toasts / field errors. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export function fail(error: string, fieldErrors?: Record<string, string[] | undefined>) {
  return { ok: false, error, fieldErrors } as const;
}
