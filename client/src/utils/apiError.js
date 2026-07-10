/**
 * File: apiError.js
 *
 * Purpose:
 * Small helper that turns Axios error objects into short, user-facing messages
 * for alerts and inline error UI across pages.
 *
 * Main responsibilities:
 * - Prefer the backend `message` field when present.
 * - Map common HTTP statuses (401, 403, 404, 400, 5xx) to readable defaults.
 * - Detect network failures when there is no response object.
 *
 * Data flow:
 * - Used by pages/components inside catch blocks after api.get/post/etc.
 * - Does not call the network itself; only formats an existing error.
 *
 * Important concepts:
 * Axios error shape (response.status, response.data.message), graceful
 * fallbacks, and keeping error copy consistent across the UI.
 */

/**
 * Converts an Axios (or similar) error into a display string.
 *
 * @param {object|null|undefined} err - Error thrown by an API call.
 * @param {string} [fallback='Something went wrong.'] - Used when nothing else fits.
 * @returns {string} Message safe to show in the UI.
 */
export const getApiErrorMessage = (err, fallback = 'Something went wrong.') => {
  if (!err) {
    return fallback;
  }

  const status = err.response?.status;
  const message = err.response?.data?.message;

  if (status === 401) {
    return message || 'Please login again.';
  }

  if (status === 403) {
    return message || 'You are not allowed to view this page.';
  }

  if (status === 404) {
    return message || 'Not found.';
  }

  if (status === 400) {
    return message || 'Invalid request.';
  }

  if (status >= 500) {
    return message || 'Server error. Please try again later.';
  }

  // No HTTP response usually means the server is down or CORS/network failed.
  if (!err.response) {
    return 'Network error. Please check your connection.';
  }

  return message || fallback;
};
