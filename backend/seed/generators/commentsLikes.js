const { pick, randInt, fakeDateWithinLastMonths, shuffleCopy } = require('../utils');

const COMMENT_TOPICS = [
  'internship',
  'resume',
  'interview',
  'coding',
  'open source',
  'React',
  'Node.js',
  'career growth',
  'placements',
  'AI tools',
  'projects',
  'networking',
];

function buildComment({ topic, userName, extraTech }) {
  const variants = [
    `Solid breakdown for ${topic}—I’m using this approach for my next prep round.`,
    `Quick question: how did you decide on the trade-offs in ${extraTech}?`,
    `This is exactly the clarity I needed for ${topic}. Thanks for sharing!`,
    `Loved the details—especially the part about ${topic}.`,
    `Respect. The way you structured it makes it easy to follow and apply.`,
    `What helped you the most to improve here? Any resources you recommend for ${topic}?`,
    `The execution is strong. Would you do anything differently if you had to redo this?`,
    `Great experience write-up, ${userName}. I’m preparing a similar plan for placements.`,
    `Nice! Your focus on fundamentals shows. How long did it take you to feel confident?`,
    `This feels practical—not just theory. Thanks for posting.`,
  ];
  return pick(variants);
}

function generateLikes({ users, posts, likeMin = 15, likeMax = 250 }) {
  const out = [];
  const usedPairs = new Set();

  for (const post of posts) {
    const likeTarget = randInt(likeMin, likeMax);
    const shuffledUsers = shuffleCopy(users);
    let added = 0;

    for (const user of shuffledUsers) {
      if (added >= likeTarget) break;
      const key = `${post._id}-${user.userId}`;
      if (usedPairs.has(key)) continue;
      usedPairs.add(key);
      out.push({ postId: String(post._id), userId: user.userId });
      added++;
    }
  }

  return out;
}

function generateComments({ users, posts, commentMin = 5, commentMax = 25 }) {
  const out = [];

  const extraTechPool = [
    'React state management',
    'API design',
    'caching strategy',
    'error handling',
    'DSA patterns',
    'component architecture',
    'authentication flow',
    'performance optimizations',
    'testing approach',
  ];

  // Create a stronger variety so we don't repeat the same text.
  for (const post of posts) {
    const count = randInt(commentMin, commentMax);
    for (let i = 0; i < count; i++) {
      const user = pick(users);
      const topic = pick(COMMENT_TOPICS);
      const extraTech = pick(extraTechPool);
      const text = buildComment({ topic, userName: user.fullName.split(' ')[0], extraTech });

      out.push({
        postId: String(post._id),
        author: { userId: user.userId, name: user.fullName, photo: user.profilePhoto },
        text,
        createdAt: fakeDateWithinLastMonths(6),
      });
    }
  }

  return out;
}

module.exports = { generateLikes, generateComments };

