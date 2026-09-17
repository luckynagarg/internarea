const { pick, randInt, fakeDateWithinLastMonths, shuffleCopy } = require('../utils');

const TOPIC_BLOCKS = [
  {
    topic: 'internships',
    short: [
      'Internship update: shipped a feature end-to-end today—design to deployment.',
      'Quick win from my internship: cleaned up the onboarding flow and reduced drop-offs.',
      'Mentor feedback was gold—rewrote my API layer and it feels way more solid now.',
    ],
    long: [
      'Today in my internship I focused on building a reliable workflow—clear states, better validation, and meaningful error messages. The biggest improvement was how we handled edge cases during integration. If you’re applying right now, keep your projects state-driven and add small tests for the tricky parts.',
      'Internship learning log: I spent time improving performance by changing how we fetch and cache data. Instead of loading everything at once, we introduced incremental loading and made the UI respond instantly. The team also helped me structure the PRs so reviewers can easily follow what changed and why.',
    ],
  },
  {
    topic: 'resume tips',
    short: [
      'Resume tip: lead with impact numbers, not responsibilities.',
      'Added a “Tech Summary” section to mine—noticed more recruiter replies.',
      'Tightened my bullets: each line now starts with an action verb + result.',
    ],
    long: [
      'Resume tip that actually worked for me: I rewrote every bullet to answer “What did you do, how did you do it, and what changed?” For example: “Optimized API pagination, reducing load time ~25% on mid-range devices.” It turns vague work into measurable outcomes. Also, keep your skills aligned with the internship you’re targeting—recruiters scan fast.',
      'I used a simple rule: one project = one clear story. I removed generic phrases and added context like scale, constraints, and trade-offs. After updating, I got callbacks within a week. If you’re stuck, start by editing one resume entry at a time.',
    ],
  },
  {
    topic: 'interview experiences',
    short: [
      'Interview debrief: practiced system design basics and it helped a lot.',
      'One question I struggled with—how to explain trade-offs clearly under time pressure.',
      'Great panel discussion today. They cared more about reasoning than memorized answers.',
    ],
    long: [
      'Interview experience: I went in thinking I’d be judged only on DSA, but the panel pushed me on fundamentals—complexity, edge cases, and how I’d validate inputs. The best part was how they guided the conversation. I’m now building a “question bank” of patterns and refining my explanations to be structured and concise.',
      'Interviews taught me to slow down. I started answering with assumptions, then tested them out loud. That single change made my answers clearer. For your prep, rehearse how you’ll communicate: clarify requirements, outline an approach, then verify with examples.',
    ],
  },
  {
    topic: 'coding',
    short: [
      'Coding streak: solved 3 DSA problems and reviewed 2 editorial patterns.',
      'Today’s coding focus: writing readable functions + consistent naming.',
      'Debugging session paid off—found a subtle state bug and fixed it.',
    ],
    long: [
      'Coding log: I worked on implementing a graph solution and spent extra time on correctness. I wrote down invariants, tested edge cases, and only then optimized. The time invested up front saved me from chasing wrong outputs later. If you’re grinding, track mistakes by category (logic, constraints, implementation).',
      'Refactor day: split a messy component into smaller units and introduced a clean state machine for UI. The result is fewer bugs and faster iteration. Treat refactoring like feature work—plan it, execute it, and test it.',
    ],
  },
  {
    topic: 'open source',
    short: [
      'Open source update: submitted a PR with tests and got feedback within 24 hours.',
      'Maintainer replied—patched the issue and improved documentation.',
      'Learning by contribution: small PRs build confidence fast.',
    ],
    long: [
      'Open source reflections: I picked an issue with clear acceptance criteria and wrote a thorough comment before coding. It helped the maintainer understand my approach quickly. After merging, I followed up with a short note on how to reproduce the fix. Contributions feel easier when you communicate early and document changes.',
      'Today I improved a feature flag and added better error messages. What I learned: don’t rush into complex refactors—make the smallest safe change first, then iterate based on maintainers’ feedback.',
    ],
  },
];

const HASHTAGS = ['#Internshala','#BuildInPublic','#React','#Nextjs','#Nodejs','#TypeScript','#MongoDB','#Frontend','#Backend','#MERN','#AI','#OpenSource','#Hackathon','#Placements','#InterviewPrep'];

function generateCaption(i, authorName) {
  const block = pick(TOPIC_BLOCKS);
  const isLong = Math.random() < 0.45;
  const base = isLong ? pick(block.long) : pick(block.short);

  const tagCount = randInt(3, 6);
  const tags = shuffleCopy(HASHTAGS).slice(0, tagCount).join(' ');

  // Avoid repetitive patterns by varying structure.
  if (Math.random() < 0.4) {
    return `${base} — ${authorName.split(' ')[0]} ${tags}`;
  }
  if (Math.random() < 0.7) {
    return `${tags}\n\n${base}`;
  }
  return `${base} ${tags}`;
}

function generatePosts({ users, images = [] }, count = 220) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const author = pick(users);

    const useMedia = Math.random() < 0.6;
    const mediaUrl = images.length && useMedia ? pick(images) : null;

    const fallbackMedia = `https://placehold.co/1200x700/png?text=${encodeURIComponent(`Internshala+Post+${i + 1}`)}`;

    out.push({
      author: { userId: author.userId, name: author.fullName, photo: author.profilePhoto },
      caption: generateCaption(i, author.fullName),
      media: {
        mediaType: 'image',
        url: mediaUrl || fallbackMedia,
      },
      createdAt: fakeDateWithinLastMonths(12),
    });
  }
  return out;
}

module.exports = { generatePosts };

