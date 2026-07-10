/**
 * @file statsController.js
 * @description Aggregation-based statistics endpoints that power D3 charts on the client.
 *
 * Purpose:
 *   Exposes read-only analytics over the Post collection: how many posts exist per
 *   group (bar chart) and how many posts were created per calendar month (line chart).
 *   These handlers do not mutate data; they only run MongoDB aggregation pipelines.
 *
 * Responsibilities:
 *   - Join posts to groups and count posts per group name
 *   - Bucket posts by YYYY-MM from createdAt and count per month
 *   - Return simple JSON arrays shaped for front-end chart libraries (D3)
 *
 * Connections:
 *   - Model: Post (aggregations also read the 'groups' collection via $lookup)
 *   - Used by stats routes (typically under /api/stats)
 *   - Client charts consume { groupName, postCount } and { month, postCount }
 *
 * Key concepts for defense:
 *   - Aggregation pipeline: ordered stages that transform documents step by step
 *   - $lookup: left join from posts.group → groups._id (array result in groupInfo)
 *   - $group: collapse many posts into one row per group or per month, with $sum: 1
 *   - $project / $ifNull: reshape fields and supply a fallback label for missing groups
 *   - $sort: order chart data (highest post count, or chronological months)
 *   - $dateToString: format createdAt as '%Y-%m' for monthly buckets
 */

const Post = require('../models/Post');

/**
 * Aggregate post counts per group for the D3 bar chart.
 *
 * Pipeline (executed in order):
 *   1. $lookup — join each post's `group` ObjectId to the `groups` collection.
 *      localField 'group' matches foreignField '_id'; results land in `groupInfo` (array).
 *   2. $group — one output document per distinct post.group id.
 *      postCount: $sum: 1 counts posts in that bucket.
 *      groupName: $first of $arrayElemAt on groupInfo.name (index 0) takes the joined name.
 *   3. $project — drop the internal _id; keep postCount; map groupName through
 *      $ifNull so a missing/deleted group still shows as 'Unknown Group'.
 *   4. $sort — descending by postCount so the tallest bars appear first.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res - JSON array of { groupName, postCount }
 */
const getPostsByGroup = async (req, res) => {
  try {
    const data = await Post.aggregate([
      {
        // Stage 1: left-join group documents onto each post
        $lookup: {
          from: 'groups',
          localField: 'group',
          foreignField: '_id',
          as: 'groupInfo'
        }
      },
      {
        // Stage 2: bucket by group id and count posts; capture group name from lookup
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
        // Stage 3: reshape for the chart; $ifNull guards against empty lookups
        $project: {
          _id: 0,
          groupName: {
            $ifNull: ['$groupName', 'Unknown Group']
          },
          postCount: 1
        }
      },
      // Stage 4: highest activity first for the bar chart
      { $sort: { postCount: -1 } }
    ]);

    res.json(data || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Aggregate post counts per calendar month for the D3 line chart.
 *
 * Pipeline (executed in order):
 *   1. $group — bucket by $dateToString of createdAt with format '%Y-%m'
 *      (e.g. "2026-07"). postCount uses $sum: 1 per post in that month.
 *   2. $project — rename _id to month and omit the aggregation _id from the payload.
 *   3. $sort — ascending by month string so the line chart reads left-to-right in time.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res - JSON array of { month, postCount }
 */
const getPostsByMonth = async (req, res) => {
  try {
    const data = await Post.aggregate([
      {
        // Stage 1: one bucket per year-month string derived from createdAt
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
        // Stage 2: expose `month` for the client instead of `_id`
        $project: {
          _id: 0,
          month: '$_id',
          postCount: 1
        }
      },
      // Stage 3: chronological order for the line chart x-axis
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
