const Post = require('../models/Post');

// Count posts per group for the D3 bar chart
const getPostsByGroup = async (req, res) => {
  try {
    const data = await Post.aggregate([
      {
        $lookup: {
          from: 'groups',
          localField: 'group',
          foreignField: '_id',
          as: 'groupInfo'
        }
      },
      {
        $group: {
          _id: '$group',
          postCount: { $sum: 1 },
          groupName: {
            $first: {
              $arrayElemAt: ['$groupInfo.name', 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          groupName: {
            $ifNull: ['$groupName', 'Unknown Group']
          },
          postCount: 1
        }
      },
      { $sort: { postCount: -1 } }
    ]);

    res.json(data || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Count posts per month for the D3 line chart
const getPostsByMonth = async (req, res) => {
  try {
    const data = await Post.aggregate([
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m',
              date: '$createdAt'
            }
          },
          postCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          month: '$_id',
          postCount: 1
        }
      },
      { $sort: { month: 1 } }
    ]);

    res.json(data || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPostsByGroup,
  getPostsByMonth
};
