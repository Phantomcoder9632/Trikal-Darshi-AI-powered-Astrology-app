/**
 * Translate raw network/API errors into kind, human sentences.
 * New users shouldn't have to know what a "timeout" or "ECONNREFUSED" is.
 */

export function friendlyError(err: unknown): string {
  const e = err as any;
  const code = e?.code as string | undefined;

  if (e?.response?.status === 401) {
    return 'Your session gently expired — please sign in again to continue.';
  }
  if (e?.response?.status === 403) {
    return 'This reading belongs to a different account.';
  }
  if (e?.response?.status === 429) {
    return 'The stars need a short rest — you are doing that a little too quickly. Try again in a minute.';
  }
  if (e?.response?.status && e.response.status >= 500) {
    return 'Our servers are catching their breath. Please try again in a few moments.';
  }
  if (code === 'ECONNABORTED' || /timeout/i.test(e?.message ?? '')) {
    return 'This is taking longer than usual — the observatory may be waking up. Please try once more.';
  }
  if (/network error|fetch failed|ECONNREFUSED|ENOTFOUND|offline/i.test(e?.message ?? '')) {
    return 'We could not reach the observatory. Please check your internet connection.';
  }
  return (
    e?.response?.data?.detail ||
    'Something unexpected happened. Please try again.'
  );
}
