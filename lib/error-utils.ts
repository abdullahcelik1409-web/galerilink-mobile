export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? 'Unknown error');
  }
  return 'Unknown error';
}

export function isNetworkLikeError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('abort') ||
    message.includes('failed to fetch') ||
    message.includes('network request failed')
  );
}

export function logDevError(scope: string, error: unknown) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn(`[${scope}] ${getErrorMessage(error)}`);
  }
}
