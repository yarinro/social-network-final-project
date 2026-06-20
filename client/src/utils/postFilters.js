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
