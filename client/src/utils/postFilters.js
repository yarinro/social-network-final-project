/**
 * File: postFilters.js
 *
 * Purpose:
 * Shared helpers for the advanced post search UI (Posts page and group posts).
 * Keeps default filter values and query-parameter building in one place.
 *
 * Main responsibilities:
 * - Provide emptyPostFilters as the initial/reset form state.
 * - Convert React filter state into Axios `params` for the backend search API.
 *
 * Data flow:
 * - PostFilterForm edits filter objects shaped like emptyPostFilters.
 * - Pages call buildPostFilterParams before api.get('/posts', { params }) or
 *   group-specific post endpoints that accept the same query keys.
 *
 * Important concepts:
 * Controlled-form state vs HTTP query strings, omitting empty fields,
 * boolean-like filters as 'true'/'false' strings, and optional group inclusion.
 */

/** Default filter form values used when the page mounts or the user resets. */
export const emptyPostFilters = {
  text: '',
  author: '',
  group: '',
  fromDate: '',
  toDate: '',
  hasImage: 'all',
  hasVideo: 'all',
  sortOrder: 'desc'
};

/**
 * Builds a plain object of query parameters for post list/search requests.
 *
 * Empty text fields are omitted so the backend does not apply useless filters.
 * hasImage/hasVideo only become params when the user picks yes/no (not "all").
 *
 * @param {typeof emptyPostFilters} filters - Current UI filter state.
 * @param {{ includeGroup?: boolean }} [options] - When true, may send `group`
 *   (used on the global Posts page; group detail pages usually omit it).
 * @returns {object} Axios-compatible params object.
 */
export const buildPostFilterParams = (filters, options = {}) => {
  const { includeGroup = false } = options;
  const params = {};

  if (filters.text.trim()) {
    params.text = filters.text.trim();
  }

  if (filters.author.trim()) {
    params.author = filters.author.trim();
  }

  if (includeGroup && filters.group.trim()) {
    params.group = filters.group.trim();
  }

  if (filters.fromDate) {
    params.fromDate = filters.fromDate;
  }

  if (filters.toDate) {
    params.toDate = filters.toDate;
  }

  if (filters.hasImage === 'yes') {
    params.hasImage = 'true';
  } else if (filters.hasImage === 'no') {
    params.hasImage = 'false';
  }

  if (filters.hasVideo === 'yes') {
    params.hasVideo = 'true';
  } else if (filters.hasVideo === 'no') {
    params.hasVideo = 'false';
  }

  params.sortBy = 'createdAt';
  params.sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc';

  return params;
};
