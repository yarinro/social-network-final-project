const PostFilterForm = ({
  filters,
  onChange,
  onSubmit,
  onClear,
  showGroupField = false,
  submitting = false
}) => {
  const handleFieldChange = (field) => (event) => {
    onChange({ ...filters, [field]: event.target.value });
  };

  return (
    <div className="post-filter-card">
      <h3>Search & Filter Posts</h3>
      <form
        className="post-filter-form"
        onSubmit={(event) => {
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
