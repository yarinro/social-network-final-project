/**
 * @file PostFilterForm.jsx
 * @description Controlled filter/search form for narrowing and sorting the posts list.
 *
 * Purpose:
 * Collect filter criteria (text, author, optional group, date range, media flags, sort
 * order) and hand them to the parent via callbacks. This component does not call the API;
 * the parent applies filters when the user submits or clears.
 *
 * Responsibilities:
 * - Bind each input to a field on the `filters` object from the parent
 * - Emit immutable updates (`{ ...filters, [field]: value }`) on every change
 * - Prevent default form submit and call `onSubmit` / `onClear`
 * - Optionally show a Group field when `showGroupField` is true (e.g. global feed vs
 *   already-scoped group page)
 *
 * Data flow:
 * Props in: `filters` (controlled values), `onChange`, `onSubmit`, `onClear`,
 * `showGroupField`, `submitting`. No local state — every keystroke updates the parent.
 *
 * React concepts demonstrated:
 * Fully controlled inputs, curried change handlers (`handleFieldChange(field)`),
 * conditional field rendering, and lifting state so one filter object drives both UI
 * and the eventual API query on the parent page.
 */

/**
 * Search and filter form for posts. Parent owns filter state and applies it on submit.
 *
 * @param {Object} props
 * @param {Object} props.filters - Current filter values (text, author, group, dates, etc.)
 * @param {Function} props.onChange - Receives the next full filters object
 * @param {Function} props.onSubmit - Apply filters (parent fetches/filters)
 * @param {Function} props.onClear - Reset filters in the parent
 * @param {boolean} [props.showGroupField=false] - Whether to show the group name field
 * @param {boolean} [props.submitting=false] - Disables Apply while a request is in flight
 * @returns {JSX.Element}
 */
const PostFilterForm = ({
  filters,
  onChange,
  onSubmit,
  onClear,
  showGroupField = false,
  submitting = false
}) => {
  /**
   * Returns an onChange handler for one filter field that merges the new value into
   * a shallow copy of `filters` so React sees a new object reference.
   *
   * @param {string} field - Key on the filters object to update
   * @returns {Function} Event handler for the corresponding input/select
   */
  const handleFieldChange = (field) => (event) => {
    onChange({ ...filters, [field]: event.target.value });
  };

  return (
    <div className="post-filter-card">
      <h3>Search & Filter Posts</h3>
      <form
        className="post-filter-form"
        onSubmit={(event) => {
          // Controlled form: block native navigation and let the parent run the query
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="filter-grid">
          <label>
            Text
            <input
              type="text"
              value={filters.text}
              onChange={handleFieldChange('text')}
              placeholder="Search post content"
            />
          </label>

          <label>
            Author
            <input
              type="text"
              value={filters.author}
              onChange={handleFieldChange('author')}
              placeholder="Username or full name"
            />
          </label>

          {/* Hidden on pages already scoped to one group (avoids redundant filtering) */}
          {showGroupField && (
            <label>
              Group
              <input
                type="text"
                value={filters.group}
                onChange={handleFieldChange('group')}
                placeholder="Group name"
              />
            </label>
          )}

          <label>
            From date
            <input
              type="date"
              value={filters.fromDate}
              onChange={handleFieldChange('fromDate')}
            />
          </label>

          <label>
            To date
            <input
              type="date"
              value={filters.toDate}
              onChange={handleFieldChange('toDate')}
            />
          </label>

          <label>
            Has image
            <select
              value={filters.hasImage}
              onChange={handleFieldChange('hasImage')}
            >
              <option value="all">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>

          <label>
            Has video
            <select
              value={filters.hasVideo}
              onChange={handleFieldChange('hasVideo')}
            >
              <option value="all">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>

          <label>
            Sort order
            <select
              value={filters.sortOrder}
              onChange={handleFieldChange('sortOrder')}
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </label>
        </div>

        <div className="filter-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? 'Applying...' : 'Apply Filters'}
          </button>
          <button type="button" onClick={onClear}>
            Clear Filters
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostFilterForm;
