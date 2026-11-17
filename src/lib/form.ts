export type FormState = { ok: boolean | null; message?: string; errors?: Record<string, string[] | undefined>; values?: Record<string, string> };
export type CommandResult = { ok: boolean; message: string; result?: import('./security/verify-stream').VerifyResult; id?: string };

/** FormData → plain object; repeated keys become arrays; files are ignored. */
export function formToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(fd.keys())) {
    const vals = fd.getAll(key).filter((v): v is string => typeof v === 'string');
    out[key] = vals.length > 1 ? vals : vals[0];
  }
  return out;
}
export const invalid = (fd: FormData, errors: FormState['errors'], message = 'Revisa los campos marcados.'): FormState => ({
  ok: false, message, errors, values: Object.fromEntries([...fd].filter(([, v]) => typeof v === 'string')) as Record<string, string>,
});
