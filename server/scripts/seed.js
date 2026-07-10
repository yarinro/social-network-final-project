require('dotenv').config();

const dns = require('dns');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const User = require('../src/models/User');
const Group = require('../src/models/Group');
const Post = require('../src/models/Post');
const Message = require('../src/models/Message');

dns.setServers(['8.8.8.8', '1.1.1.1']);

const DEMO_PASSWORD = 'Demo123!';
const DEMO_VIDEO_URLS = [
  'https://media.w3.org/2010/05/sintel/trailer.mp4',
  'https://media.w3.org/2010/05/bunny/trailer.mp4',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
];
const VIDEO_1 = DEMO_VIDEO_URLS[0];
const VIDEO_2 = DEMO_VIDEO_URLS[1];
const VIDEO_3 = DEMO_VIDEO_URLS[2];

const date = (year, month, day, hour = 12, minute = 0) =>
  new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

const uniqueIds = (ids) => {
  const seen = new Set();
  const result = [];

  ids.forEach((id) => {
    const key = id.toString();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(id);
    }
  });

  return result;
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const seed = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed: NODE_ENV is production.');
  }

  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI is missing. Add it to server/.env before seeding.');
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // Clear in dependency-safe order
  await Message.deleteMany({});
  await Post.deleteMany({});
  await Group.deleteMany({});
  await User.deleteMany({});
  console.log('Cleared existing Messages, Posts, Groups, and Users');

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const userDefs = [
    {
      key: 'admin',
      username: 'admin_demo',
      fullName: 'Demo Administrator',
      email: 'admin@demo.com',
      role: 'admin',
      bio: 'Platform administrator for the social network demo.',
      createdAt: date(2025, 9, 1)
    },
    {
      key: 'maya',
      username: 'maya_manager',
      fullName: 'Maya Cohen',
      email: 'maya@demo.com',
      role: 'user',
      bio: 'Full-stack developer and group manager. Loves React and Node.',
      createdAt: date(2025, 9, 5)
    },
    {
      key: 'alex',
      username: 'alex_dev',
      fullName: 'Alex Johnson',
      email: 'alex@demo.com',
      role: 'user',
      bio: 'Software engineer focused on JavaScript, MongoDB, and clean APIs.',
      createdAt: date(2025, 9, 8)
    },
    {
      key: 'nina',
      username: 'nina_pending',
      fullName: 'Nina Levi',
      email: 'nina@demo.com',
      role: 'user',
      bio: 'Student waiting to join private startup and project groups.',
      createdAt: date(2025, 10, 2)
    },
    {
      key: 'daniel',
      username: 'daniel_photo',
      fullName: 'Daniel Ben-David',
      email: 'daniel.photo@demo.com',
      role: 'user',
      bio: 'Photography enthusiast and hiking weekend planner.',
      createdAt: date(2025, 10, 10)
    },
    {
      key: 'sara',
      username: 'sara_films',
      fullName: 'Sara Mizrahi',
      email: 'sara.films@demo.com',
      role: 'user',
      bio: 'Movie fan and weekend cinema organizer.',
      createdAt: date(2025, 11, 3)
    },
    {
      key: 'omar',
      username: 'omar_hike',
      fullName: 'Omar Haddad',
      email: 'omar.hike@demo.com',
      role: 'user',
      bio: 'Trail runner and Hiking Club manager.',
      createdAt: date(2025, 11, 12)
    },
    {
      key: 'lina',
      username: 'lina_code',
      fullName: 'Lina Rosenberg',
      email: 'lina.code@demo.com',
      role: 'user',
      bio: 'Frontend developer who writes about React and CSS.',
      createdAt: date(2025, 12, 4)
    },
    {
      key: 'tom',
      username: 'tom_startup',
      fullName: 'Tom Adler',
      email: 'tom.startup@demo.com',
      role: 'user',
      bio: 'Startup founder mentoring student project teams.',
      createdAt: date(2026, 1, 9)
    },
    {
      key: 'yael',
      username: 'yael_uni',
      fullName: 'Yael Shapira',
      email: 'yael.uni@demo.com',
      role: 'user',
      bio: 'University student working on the final MERN project.',
      createdAt: date(2026, 1, 20)
    }
  ];

  const createdUsers = await User.insertMany(
    userDefs.map((user) => ({
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      passwordHash,
      role: user.role,
      bio: user.bio,
      profileImageUrl: `https://picsum.photos/seed/${user.username}/300/300`,
      friends: [],
      groups: [],
      createdAt: user.createdAt,
      updatedAt: user.createdAt
    }))
  );

  const users = {};
  userDefs.forEach((def, index) => {
    users[def.key] = createdUsers[index];
  });

  // Symmetrical friendships
  const friendPairs = [
    ['alex', 'maya'],
    ['alex', 'lina'],
    ['alex', 'daniel'],
    ['maya', 'lina'],
    ['maya', 'tom'],
    ['daniel', 'omar'],
    ['daniel', 'sara'],
    ['sara', 'omar'],
    ['tom', 'yael'],
    ['lina', 'yael'],
    ['admin', 'maya'],
    ['nina', 'yael']
  ];

  const friendMap = {};
  Object.keys(users).forEach((key) => {
    friendMap[key] = [];
  });

  friendPairs.forEach(([a, b]) => {
    friendMap[a].push(users[b]._id);
    friendMap[b].push(users[a]._id);
  });

  await Promise.all(
    Object.keys(users).map((key) =>
      User.findByIdAndUpdate(users[key]._id, {
        friends: uniqueIds(friendMap[key])
      })
    )
  );

  // Groups with varied privacy, managers, and member counts
  const groupDefs = [
    {
      key: 'web',
      name: 'Web Developers',
      description: 'Discuss React, Node, MongoDB, and modern web development.',
      isPrivate: false,
      manager: 'maya',
      members: ['maya', 'alex', 'lina', 'admin', 'tom'],
      pendingMembers: [],
      createdAt: date(2025, 9, 15)
    },
    {
      key: 'photo',
      name: 'Photography Lovers',
      description: 'Share photography tips, gear reviews, and weekend shoots.',
      isPrivate: false,
      manager: 'daniel',
      members: ['daniel', 'sara', 'omar', 'nina'],
      pendingMembers: [],
      createdAt: date(2025, 10, 5)
    },
    {
      key: 'hike',
      name: 'Hiking Club',
      description: 'Plan hiking trips and share trail recommendations.',
      isPrivate: false,
      manager: 'omar',
      members: ['omar', 'daniel', 'alex'],
      pendingMembers: [],
      createdAt: date(2025, 11, 1)
    },
    {
      key: 'movie',
      name: 'Movie Fans',
      description: 'Talk about movies, series, and cinema nights.',
      isPrivate: false,
      manager: 'sara',
      members: ['sara', 'yael'],
      pendingMembers: [],
      createdAt: date(2025, 12, 8)
    },
    {
      key: 'startup',
      name: 'Startup Founders',
      description: 'Private group for founders and product discussions.',
      isPrivate: true,
      manager: 'maya',
      members: ['maya', 'tom', 'alex'],
      pendingMembers: ['nina'],
      createdAt: date(2026, 1, 12)
    },
    {
      key: 'uni',
      name: 'University Project Team',
      description: 'Private team workspace for the HIT final project.',
      isPrivate: true,
      manager: 'tom',
      members: ['tom', 'yael', 'lina'],
      pendingMembers: ['nina'],
      createdAt: date(2026, 2, 3)
    }
  ];

  const createdGroups = await Group.insertMany(
    groupDefs.map((group) => ({
      name: group.name,
      description: group.description,
      isPrivate: group.isPrivate,
      manager: users[group.manager]._id,
      members: uniqueIds(group.members.map((key) => users[key]._id)),
      pendingMembers: uniqueIds(group.pendingMembers.map((key) => users[key]._id)),
      createdAt: group.createdAt,
      updatedAt: group.createdAt
    }))
  );

  const groups = {};
  groupDefs.forEach((def, index) => {
    groups[def.key] = createdGroups[index];
  });

  // Sync User.groups with approved membership only
  const userGroupMap = {};
  Object.keys(users).forEach((key) => {
    userGroupMap[key] = [];
  });

  groupDefs.forEach((def) => {
    def.members.forEach((memberKey) => {
      userGroupMap[memberKey].push(groups[def.key]._id);
    });
  });

  await Promise.all(
    Object.keys(users).map((key) =>
      User.findByIdAndUpdate(users[key]._id, {
        groups: uniqueIds(userGroupMap[key])
      })
    )
  );

  // Posts across groups and months (Sep 2025 – Mar 2026)
  const postDefs = [
    // Web Developers (many posts for chart contrast)
    {
      author: 'alex',
      group: 'web',
      content: 'Learning React hooks this week. useEffect finally makes sense!',
      imageUrl: 'https://picsum.photos/seed/alex-react-hooks/900/500',
      videoUrl: '',
      visibility: 'public',
      likes: ['maya', 'lina', 'tom', 'admin'],
      createdAt: date(2026, 3, 10, 14, 30)
    },
    {
      author: 'maya',
      group: 'web',
      content: 'Node and Express tips for clean REST APIs.',
      imageUrl: '',
      videoUrl: '',
      visibility: 'public',
      likes: ['alex', 'lina'],
      createdAt: date(2025, 9, 20)
    },
    {
      author: 'lina',
      group: 'web',
      content: 'JavaScript array methods cheat sheet for interviews.',
      imageUrl: 'https://picsum.photos/seed/lina-js/900/500',
      videoUrl: '',
      visibility: 'group',
      likes: ['alex'],
      createdAt: date(2025, 10, 12)
    },
    {
      author: 'alex',
      group: 'web',
      content: 'MongoDB indexes improved our feed query a lot.',
      imageUrl: '',
      videoUrl: '',
      visibility: 'public',
      likes: ['maya'],
      createdAt: date(2025, 11, 5)
    },
    {
      author: 'tom',
      group: 'web',
      content: 'Deploy checklist for a MERN app before the demo.',
      imageUrl: 'https://picsum.photos/seed/tom-deploy/900/500',
      videoUrl: '',
      visibility: 'public',
      likes: ['maya', 'alex', 'lina'],
      createdAt: date(2025, 12, 14)
    },
    {
      author: 'maya',
      group: 'web',
      content: 'Short demo video of our Node API health check.',
      imageUrl: '',
      videoUrl: VIDEO_1,
      visibility: 'group',
      likes: ['alex'],
      createdAt: date(2026, 1, 18)
    },
    {
      author: 'lina',
      group: 'web',
      content: 'React Router nested routes for group details pages.',
      imageUrl: 'https://picsum.photos/seed/lina-router/900/500',
      videoUrl: VIDEO_2,
      visibility: 'public',
      likes: ['alex', 'maya'],
      createdAt: date(2026, 2, 8)
    },
    {
      author: 'admin',
      group: 'web',
      content: 'Reminder: keep JWT secrets out of the repository.',
      imageUrl: '',
      videoUrl: '',
      visibility: 'group',
      likes: [],
      createdAt: date(2026, 2, 20)
    },
    {
      author: 'alex',
      group: 'web',
      content: 'Working on MongoDB aggregation for statistics charts.',
      imageUrl: 'https://picsum.photos/seed/alex-mongo-agg/900/500',
      videoUrl: '',
      visibility: 'public',
      likes: ['maya', 'lina'],
      createdAt: date(2026, 3, 2)
    },
    {
      author: 'maya',
      group: 'web',
      content: 'Socket.IO chat is live between friends now.',
      imageUrl: '',
      videoUrl: '',
      visibility: 'public',
      likes: ['alex', 'tom'],
      createdAt: date(2026, 3, 15)
    },

    // Photography Lovers
    {
      author: 'daniel',
      group: 'photo',
      content: 'Golden hour photography tips for city skylines.',
      imageUrl: 'https://picsum.photos/seed/daniel-golden/900/500',
      videoUrl: '',
      visibility: 'public',
      likes: ['sara', 'omar', 'nina'],
      createdAt: date(2025, 10, 18)
    },
    {
      author: 'sara',
      group: 'photo',
      content: 'Tried a new lens for portrait photography today.',
      imageUrl: 'https://picsum.photos/seed/sara-portrait/900/500',
      videoUrl: '',
      visibility: 'group',
      likes: ['daniel'],
      createdAt: date(2025, 11, 22)
    },
    {
      author: 'omar',
      group: 'photo',
      content: 'Trail photography from last weekend hike.',
      imageUrl: 'https://picsum.photos/seed/omar-trail-photo/900/500',
      videoUrl: '',
      visibility: 'public',
      likes: ['daniel', 'sara'],
      createdAt: date(2025, 12, 3)
    },
    {
      author: 'nina',
      group: 'photo',
      content: 'Looking for photography partners near campus.',
      imageUrl: '',
      videoUrl: '',
      visibility: 'public',
      likes: [],
      createdAt: date(2026, 1, 25)
    },
    {
      author: 'daniel',
      group: 'photo',
      content: 'Short photography process video from editing to export.',
      imageUrl: '',
      videoUrl: VIDEO_3,
      visibility: 'group',
      likes: ['sara'],
      createdAt: date(2026, 2, 14)
    },
    {
      author: 'sara',
      group: 'photo',
      content: 'Street photography challenge: one roll, one theme.',
      imageUrl: 'https://picsum.photos/seed/sara-street/900/500',
      videoUrl: '',
      visibility: 'public',
      likes: ['daniel', 'omar', 'nina'],
      createdAt: date(2026, 3, 5)
    },

    // Hiking Club
    {
      author: 'omar',
      group: 'hike',
      content: 'Hiking this Saturday at 7am. Bring water and snacks.',
      imageUrl: 'https://picsum.photos/seed/omar-hike-plan/900/500',
      videoUrl: '',
      visibility: 'public',
      likes: ['daniel', 'alex'],
      createdAt: date(2025, 11, 8)
    },
    {
      author: 'daniel',
      group: 'hike',
      content: 'Best hiking shoes for rocky trails this season.',
      imageUrl: '',
      videoUrl: '',
      visibility: 'group',
      likes: ['omar'],
      createdAt: date(2025, 12, 19)
    },
    {
      author: 'alex',
      group: 'hike',
      content: 'Loved the sunrise hiking route near the lake.',
      imageUrl: 'https://picsum.photos/seed/alex-hike/900/500',
      videoUrl: '',
      visibility: 'public',
      likes: ['omar', 'daniel'],
      createdAt: date(2026, 1, 11)
    },
    {
      author: 'omar',
      group: 'hike',
      content: 'Quick hiking clip from the ridge trail.',
      imageUrl: '',
      videoUrl: VIDEO_1,
      visibility: 'public',
      likes: ['alex'],
      createdAt: date(2026, 2, 22)
    },
    {
      author: 'daniel',
      group: 'hike',
      content: 'Packing list for a full-day hiking trip.',
      imageUrl: 'https://picsum.photos/seed/daniel-pack/900/500',
      videoUrl: VIDEO_2,
      visibility: 'group',
      likes: ['omar', 'alex'],
      createdAt: date(2026, 3, 8)
    },

    // Movie Fans
    {
      author: 'sara',
      group: 'movie',
      content: 'Movie night Friday: classic sci-fi marathon.',
      imageUrl: 'https://picsum.photos/seed/sara-movie-night/900/500',
      videoUrl: '',
      visibility: 'public',
      likes: ['yael'],
      createdAt: date(2025, 12, 12)
    },
    {
      author: 'yael',
      group: 'movie',
      content: 'Looking for movie recommendations with strong soundtracks.',
      imageUrl: '',
      videoUrl: '',
      visibility: 'group',
      likes: ['sara'],
      createdAt: date(2026, 1, 28)
    },
    {
      author: 'sara',
      group: 'movie',
      content: 'Trailer discussion for the new adventure movie.',
      imageUrl: '',
      videoUrl: VIDEO_1,
      visibility: 'public',
      likes: ['yael'],
      createdAt: date(2026, 2, 16)
    },
    {
      author: 'yael',
      group: 'movie',
      content: 'Best movie quotes from last semester cinema club.',
      imageUrl: 'https://picsum.photos/seed/yael-quotes/900/500',
      videoUrl: '',
      visibility: 'public',
      likes: [],
      createdAt: date(2026, 3, 12)
    },

    // Startup Founders (private)
    {
      author: 'maya',
      group: 'startup',
      content: 'Pitch deck feedback session next Monday.',
      imageUrl: '',
      videoUrl: '',
      visibility: 'group',
      likes: ['tom', 'alex'],
      createdAt: date(2026, 1, 16)
    },
    {
      author: 'tom',
      group: 'startup',
      content: 'Customer interviews taught us more than any dashboard.',
      imageUrl: 'https://picsum.photos/seed/tom-customers/900/500',
      videoUrl: '',
      visibility: 'group',
      likes: ['maya'],
      createdAt: date(2026, 2, 5)
    },
    {
      author: 'alex',
      group: 'startup',
      content: 'MVP checklist: auth, posts, groups, and messaging.',
      imageUrl: '',
      videoUrl: '',
      visibility: 'group',
      likes: ['maya', 'tom'],
      createdAt: date(2026, 2, 25)
    },
    {
      author: 'maya',
      group: 'startup',
      content: 'Founder update video from this week.',
      imageUrl: 'https://picsum.photos/seed/maya-founder/900/500',
      videoUrl: VIDEO_2,
      visibility: 'group',
      likes: ['alex'],
      createdAt: date(2026, 3, 6)
    },

    // University Project Team (private)
    {
      author: 'tom',
      group: 'uni',
      content: 'University Project Team kickoff notes and deadlines.',
      imageUrl: '',
      videoUrl: '',
      visibility: 'group',
      likes: ['yael', 'lina'],
      createdAt: date(2026, 2, 6)
    },
    {
      author: 'yael',
      group: 'uni',
      content: 'Finished the Users page search filters for the demo.',
      imageUrl: 'https://picsum.photos/seed/yael-users/900/500',
      videoUrl: '',
      visibility: 'group',
      likes: ['tom'],
      createdAt: date(2026, 2, 18)
    },
    {
      author: 'lina',
      group: 'uni',
      content: 'CSS polish for cards and the post filter form.',
      imageUrl: '',
      videoUrl: '',
      visibility: 'group',
      likes: ['yael'],
      createdAt: date(2026, 3, 1)
    },
    {
      author: 'tom',
      group: 'uni',
      content: 'Practice defense recording for the final presentation.',
      imageUrl: '',
      videoUrl: VIDEO_1,
      visibility: 'group',
      likes: ['lina', 'yael'],
      createdAt: date(2026, 3, 14)
    },
    {
      author: 'yael',
      group: 'uni',
      content: 'MongoDB seed data makes the statistics charts look great.',
      imageUrl: 'https://picsum.photos/seed/yael-stats/900/500',
      videoUrl: '',
      visibility: 'group',
      likes: ['tom', 'lina'],
      createdAt: date(2026, 3, 18)
    },

    // Extra posts for month/group balance
    {
      author: 'lina',
      group: 'web',
      content: 'CSS Grid vs Flexbox notes for responsive layouts.',
      imageUrl: '',
      videoUrl: '',
      visibility: 'public',
      likes: ['alex'],
      createdAt: date(2025, 9, 28)
    },
    {
      author: 'alex',
      group: 'web',
      content: 'Debugging JWT auth middleware step by step.',
      imageUrl: 'https://picsum.photos/seed/alex-jwt/900/500',
      videoUrl: '',
      visibility: 'group',
      likes: ['maya', 'admin'],
      createdAt: date(2025, 10, 25)
    },
    {
      author: 'daniel',
      group: 'photo',
      content: 'Night photography settings that actually work.',
      imageUrl: 'https://picsum.photos/seed/daniel-night/900/500',
      videoUrl: '',
      visibility: 'public',
      likes: ['sara'],
      createdAt: date(2026, 1, 7)
    }
  ];

  assert(postDefs.length >= 35 && postDefs.length <= 40, 'Expected 35–40 posts in seed data');

  await Post.insertMany(
    postDefs.map((post) => ({
      author: users[post.author]._id,
      group: groups[post.group]._id,
      content: post.content,
      imageUrl: post.imageUrl,
      videoUrl: post.videoUrl,
      visibility: post.visibility,
      likes: uniqueIds(post.likes.map((key) => users[key]._id)),
      createdAt: post.createdAt,
      updatedAt: post.createdAt
    }))
  );

  // Messages across several conversations
  const messageDefs = [
    // Alex <-> Maya
    {
      from: 'alex',
      to: 'maya',
      content: 'Hey Maya, can we review the Web Developers posts before the demo?',
      isRead: true,
      createdAt: date(2026, 3, 9, 9, 0)
    },
    {
      from: 'maya',
      to: 'alex',
      content: 'Sure. Your React post looks perfect for the filter demo.',
      isRead: true,
      createdAt: date(2026, 3, 9, 9, 12)
    },
    {
      from: 'alex',
      to: 'maya',
      content: 'Great. I also added likes from a few members.',
      isRead: true,
      createdAt: date(2026, 3, 9, 9, 20)
    },
    {
      from: 'maya',
      to: 'alex',
      content: 'Can you join the Startup Founders call tomorrow?',
      isRead: false,
      createdAt: date(2026, 3, 10, 16, 5)
    },
    {
      from: 'alex',
      to: 'maya',
      content: 'Yes, I will prepare the MVP checklist.',
      isRead: false,
      createdAt: date(2026, 3, 10, 16, 18)
    },

    // Alex <-> Lina
    {
      from: 'lina',
      to: 'alex',
      content: 'Did you finish the feed filters for image and video?',
      isRead: true,
      createdAt: date(2026, 2, 10, 11, 0)
    },
    {
      from: 'alex',
      to: 'lina',
      content: 'Yes, and the React post is dated March 10 for the defense.',
      isRead: true,
      createdAt: date(2026, 2, 10, 11, 8)
    },
    {
      from: 'lina',
      to: 'alex',
      content: 'Nice. I polished the CSS for the filter card.',
      isRead: false,
      createdAt: date(2026, 3, 11, 13, 40)
    },

    // Daniel <-> Omar
    {
      from: 'daniel',
      to: 'omar',
      content: 'Are we still hiking on Saturday?',
      isRead: true,
      createdAt: date(2026, 2, 20, 8, 0)
    },
    {
      from: 'omar',
      to: 'daniel',
      content: 'Yes. Bring the camera for trail photography.',
      isRead: true,
      createdAt: date(2026, 2, 20, 8, 10)
    },
    {
      from: 'daniel',
      to: 'omar',
      content: 'I posted a packing list in Hiking Club.',
      isRead: false,
      createdAt: date(2026, 3, 8, 19, 0)
    },

    // Sara <-> Yael
    {
      from: 'sara',
      to: 'yael',
      content: 'Movie night this Friday?',
      isRead: true,
      createdAt: date(2026, 3, 4, 17, 0)
    },
    {
      from: 'yael',
      to: 'sara',
      content: 'I am in. Sci-fi marathon sounds good.',
      isRead: true,
      createdAt: date(2026, 3, 4, 17, 15)
    },
    {
      from: 'sara',
      to: 'yael',
      content: 'I uploaded a trailer discussion post.',
      isRead: false,
      createdAt: date(2026, 3, 12, 20, 5)
    },

    // Tom <-> Yael
    {
      from: 'tom',
      to: 'yael',
      content: 'Please update the University Project Team notes.',
      isRead: true,
      createdAt: date(2026, 2, 7, 10, 0)
    },
    {
      from: 'yael',
      to: 'tom',
      content: 'Done. Also added a post about the Users search page.',
      isRead: true,
      createdAt: date(2026, 2, 7, 10, 25)
    },
    {
      from: 'tom',
      to: 'yael',
      content: 'Thanks. Practice defense recording is uploaded.',
      isRead: false,
      createdAt: date(2026, 3, 14, 15, 30)
    },

    // Nina <-> Yael
    {
      from: 'nina',
      to: 'yael',
      content: 'I requested to join Startup Founders. Still pending.',
      isRead: true,
      createdAt: date(2026, 3, 7, 12, 0)
    },
    {
      from: 'yael',
      to: 'nina',
      content: 'Ask Maya to approve you from the Groups page.',
      isRead: true,
      createdAt: date(2026, 3, 7, 12, 10)
    },
    {
      from: 'nina',
      to: 'yael',
      content: 'Will do. I also requested University Project Team.',
      isRead: false,
      createdAt: date(2026, 3, 7, 12, 22)
    },

    // Maya <-> Tom
    {
      from: 'maya',
      to: 'tom',
      content: 'Can you manage the University Project Team approvals?',
      isRead: true,
      createdAt: date(2026, 2, 4, 9, 0)
    },
    {
      from: 'tom',
      to: 'maya',
      content: 'Yes. Nina is pending on my side too.',
      isRead: true,
      createdAt: date(2026, 2, 4, 9, 12)
    },
    {
      from: 'maya',
      to: 'tom',
      content: 'Perfect. See you at the founders meeting.',
      isRead: false,
      createdAt: date(2026, 3, 13, 18, 0)
    }
  ];

  assert(messageDefs.length >= 20 && messageDefs.length <= 25, 'Expected 20–25 messages');

  await Message.insertMany(
    messageDefs.map((message) => ({
      from: users[message.from]._id,
      to: users[message.to]._id,
      content: message.content,
      isRead: message.isRead,
      createdAt: message.createdAt,
      updatedAt: message.createdAt
    }))
  );

  // Reload and verify relationships
  const allUsers = await User.find();
  const allGroups = await Group.find();
  const allPosts = await Post.find();
  const allMessages = await Message.find();

  assert(allUsers.length === 10, `Expected 10 users, got ${allUsers.length}`);
  assert(allGroups.length === 6, `Expected 6 groups, got ${allGroups.length}`);
  assert(allPosts.length === postDefs.length, `Expected ${postDefs.length} posts`);
  assert(allMessages.length === messageDefs.length, `Expected ${messageDefs.length} messages`);

  const publicGroups = allGroups.filter((group) => !group.isPrivate);
  const privateGroups = allGroups.filter((group) => group.isPrivate);
  assert(publicGroups.length === 4, 'Expected 4 public groups');
  assert(privateGroups.length === 2, 'Expected 2 private groups');

  // Managers must be members
  allGroups.forEach((group) => {
    const managerInMembers = group.members.some(
      (memberId) => memberId.toString() === group.manager.toString()
    );
    assert(managerInMembers, `Manager is not a member of group ${group.name}`);

    group.pendingMembers.forEach((pendingId) => {
      const alsoMember = group.members.some(
        (memberId) => memberId.toString() === pendingId.toString()
      );
      assert(!alsoMember, `Pending member is also a member in group ${group.name}`);
    });
  });

  // Friendships must be symmetrical
  const userById = new Map(allUsers.map((user) => [user._id.toString(), user]));
  allUsers.forEach((user) => {
    user.friends.forEach((friendId) => {
      const friend = userById.get(friendId.toString());
      assert(friend, `Missing friend user for ${user.username}`);
      const reverse = friend.friends.some(
        (id) => id.toString() === user._id.toString()
      );
      assert(reverse, `Friendship not symmetrical: ${user.username} -> ${friend.username}`);
    });
  });

  // User.groups must match approved membership
  allUsers.forEach((user) => {
    const expectedGroupIds = allGroups
      .filter((group) =>
        group.members.some((memberId) => memberId.toString() === user._id.toString())
      )
      .map((group) => group._id.toString())
      .sort();

    const actualGroupIds = user.groups.map((id) => id.toString()).sort();
    assert(
      JSON.stringify(expectedGroupIds) === JSON.stringify(actualGroupIds),
      `User.groups out of sync for ${user.username}`
    );
  });

  // Nina pending on Startup Founders, not a member
  const startup = allGroups.find((group) => group.name === 'Startup Founders');
  const nina = allUsers.find((user) => user.username === 'nina_pending');
  assert(startup, 'Startup Founders group missing');
  assert(nina, 'Nina user missing');
  assert(
    startup.pendingMembers.some((id) => id.toString() === nina._id.toString()),
    'Nina should be pending in Startup Founders'
  );
  assert(
    !startup.members.some((id) => id.toString() === nina._id.toString()),
    'Nina should not be a member of Startup Founders'
  );
  assert(
    !nina.groups.some((id) => id.toString() === startup._id.toString()),
    'Nina.groups should not include pending Startup Founders'
  );

  // Known advanced group search target
  const webDev = allGroups.find((group) => group.name === 'Web Developers');
  const maya = allUsers.find((user) => user.username === 'maya_manager');
  assert(webDev && !webDev.isPrivate, 'Web Developers should be public');
  assert(webDev.members.length >= 4, 'Web Developers should have at least 4 members');
  assert(
    webDev.manager.toString() === maya._id.toString(),
    'Web Developers manager should be Maya'
  );

  // Every post author belongs to the post group
  const postsPerGroup = {};
  const monthSet = new Set();

  allPosts.forEach((post) => {
    const group = allGroups.find((item) => item._id.toString() === post.group.toString());
    assert(group, 'Post references missing group');

    const authorIsMember = group.members.some(
      (memberId) => memberId.toString() === post.author.toString()
    );
    assert(authorIsMember, `Post author is not a member of group ${group.name}`);

    postsPerGroup[group.name] = (postsPerGroup[group.name] || 0) + 1;

    const created = new Date(post.createdAt);
    monthSet.add(`${created.getUTCFullYear()}-${created.getUTCMonth() + 1}`);
  });

  assert(monthSet.size >= 6, `Expected at least 6 post months, got ${monthSet.size}`);

  // Known React post for advanced search demo
  const reactPost = allPosts.find(
    (post) =>
      post.content.includes('React') &&
      post.imageUrl &&
      !post.videoUrl &&
      post.author.toString() === users.alex._id.toString() &&
      post.group.toString() === groups.web._id.toString()
  );
  assert(reactPost, 'Known Alex React post in Web Developers is missing');
  assert(reactPost.likes.length >= 3, 'Known React post should have several likes');

  // Alex should not be friends with everyone (e.g. not with Sara)
  const alex = allUsers.find((user) => user.username === 'alex_dev');
  const sara = allUsers.find((user) => user.username === 'sara_films');
  assert(
    !alex.friends.some((id) => id.toString() === sara._id.toString()),
    'Alex should not be friends with Sara (variety check)'
  );

  console.log('\nSeed completed successfully');
  console.log('---------------------------');
  console.log(`Users created: ${allUsers.length}`);
  console.log(`Groups created: ${allGroups.length} (${publicGroups.length} public, ${privateGroups.length} private)`);
  console.log(`Posts created: ${allPosts.length}`);
  console.log(`Messages created: ${allMessages.length}`);
  console.log(`Months represented: ${monthSet.size}`);
  console.log('Posts per group:');
  Object.keys(postsPerGroup)
    .sort()
    .forEach((name) => {
      console.log(`  - ${name}: ${postsPerGroup[name]}`);
    });
  console.log('\nDemo login accounts:');
  console.log('  admin@demo.com');
  console.log('  maya@demo.com');
  console.log('  alex@demo.com');
  console.log('  nina@demo.com');
  console.log(`Shared demo password: ${DEMO_PASSWORD}`);
  console.log('\nKnown demo search targets:');
  console.log('  Group: Web Developers (public, manager Maya, 5 members)');
  console.log('  Post: Alex React post in Web Developers (image, likes, date 2026-03-10)');
};

const run = async () => {
  try {
    await seed();
  } catch (error) {
    console.error('\nSeed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

run();
