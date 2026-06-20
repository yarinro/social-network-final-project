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

  if (!err.response) {
    return 'Network error. Please check your connection.';
  }

  return message || fallback;
};
