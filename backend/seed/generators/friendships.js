const { pick, randInt } = require('../utils');

function generateFriendships({ users, acceptedMin = 10, acceptedMax = 20 }) {
  // Returns array of { userId, friendId, status }
  // We only create accepted friendships here to satisfy DailyPostLimit posting rule.
  const accepted = [];
  const existing = new Set();

  const userIds = users.map((u) => u.userId);

  for (const u of users) {
    const target = randInt(acceptedMin, acceptedMax);
    const candidates = userIds.filter((id) => id !== u.userId);

    // Shuffle candidates
    const shuffled = candidates.sort(() => Math.random() - 0.5);

    let added = 0;
    for (const fid of shuffled) {
      if (added >= target) break;
      const key = `${u.userId}-${fid}`;
      if (existing.has(key)) continue;
      existing.add(key);
      accepted.push({ userId: u.userId, friendId: fid, status: 'accepted' });
      added++;
    }
  }

  // No duplicates by construction; might create asymmetric friendships depending on direction.
  return accepted;
}

module.exports = { generateFriendships };

