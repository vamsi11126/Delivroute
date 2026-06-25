import axios from 'axios';

/**
 * Turn any thrown value (Axios error, network failure, unknown) into a short,
 * user-facing message. Prefers the backend envelope's `error.message`.
 */
export function getApiErrorMessage(
  err: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { error?: { message?: string } }
      | undefined;
    if (data?.error?.message) {
      return data.error.message;
    }
    if (err.code === 'ECONNABORTED') {
      return 'Request timed out. Check your connection and try again.';
    }
    if (!err.response) {
      return 'Network error. Check your connection and try again.';
    }
  }
  return fallback;
}
