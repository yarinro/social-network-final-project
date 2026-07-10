/**
 * File: Post.js
 *
 * Purpose:
 * Mongoose schema and model for posts published inside groups.
 *
 * Main responsibilities:
 * - Link each post to an author (User) and a group (Group).
 * - Store text content plus optional imageUrl / videoUrl strings.
 * - Track visibility ('public' | 'group') and likes (array of User ids).
 *
 * Connections:
 * - postController creates/lists/updates/deletes posts and toggles likes.
 * - Feed and search queries filter by group membership and visibility.
 * - statsController aggregates posts by group and by month.
 * - Seed script inserts demo posts with explicit createdAt dates.
 *
 * Important concepts:
 * Required author/group refs, URL fields as strings (not binary blobs),
 * visibility enum for feed rules, likes as ObjectId[], and timestamps
 * used for sorting and monthly statistics.
 */

const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    // Optional media URLs (HTTPS or site-relative). Files themselves are not in MongoDB.
    imageUrl: {
      type: String,
      default: ''
    },
    videoUrl: {
      type: String,
      default: ''
    },
    visibility: {
      type: String,
      // 'public' posts can appear more broadly in the feed; 'group' is members-oriented.
      enum: ['public', 'group'],
      default: 'group'
    },
    // Each like is a User ObjectId. Toggle logic uses $addToSet / pull patterns in the controller.
    likes: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      ],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Post', postSchema);
