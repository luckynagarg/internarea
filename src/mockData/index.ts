// Centralized mock dataset for demo + fallback when backend returns empty.
// IMPORTANT: Components must NOT hardcode dummy data.

export type MockUser = {
  uid: string;
  name: string;
  username: string;
  email: string;
  photo: string;
  headline: string;
  bio: string;
  skills: string[];
  college: string;
  company: string;
  location: string;
  experienceYears: number;
  joinedDateISO: string;
};

export type MockInternship = {
  _id: string;
  title: string;
  company: string;
  companyLogo: string;
  location: string;
  stipend: string;
  duration: string;
  skills: string[];
  category: string;
  postedAtISO: string;
  mode: 'Remote' | 'Hybrid' | 'Onsite';
};

export type MockCompany = {
  _id: string;
  name: string;
  logo: string;
  industry: string;
  description: string;
  rating: number;
  openInternships: number;
};

export type MockPost = {
  _id: string;
  author: { userId: string; name: string; photo: string; headline?: string };
  caption: string;
  media?: { mediaType: 'image' | 'video'; url: string };
  createdAtISO: string;
  likesCount: number;
  commentsCount: number;
  shareCount: number;
  images?: string[];
};

export type MockComment = {
  _id: string;
  postId: string;
  author: { userId: string; name: string; photo: string };
  text: string;
  createdAtISO: string;
};

export type MockNotification = {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'social' | 'post' | 'application' | 'resume' | 'message';
  read: boolean;
  createdAtISO: string;
};

export type MockChatMessage = {
  _id: string;
  conversationId: string;
  fromUserId: string;
  text: string;
  createdAtISO: string;
};

export type MockConversation = {
  _id: string;
  userIdA: string;
  userIdB: string;
  unreadCount: number;
  lastMessage: MockChatMessage;
};

export type MockResume = {
  _id: string;
  userId: string;
  resumeTitle: string;
  createdAtISO: string;
  updatedAtISO: string;
  resumePdfPath: string;
};

export type MockApplication = {
  _id: string;
  userId: string;
  internshipId: string;
  company: string;
  status:
    | 'Applied'
    | 'Under Review'
    | 'Shortlisted'
    | 'Interview Scheduled'
    | 'Rejected'
    | 'Selected';
  createdAtISO: string;
};

export type MockFriendRequest = {
  _id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAtISO: string;
};

function stableHashToInt(input: string, mod: number) {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h % mod;
}

function makeUid(prefix: string, i: number) {
  return `${prefix}_${String(i).padStart(4, '0')}`;
}

function daysAgoISO(daysAgo: number) {
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

const AVATAR_POOL = [
  '/Assets/1.jpg',
  '/Assets/2.jpg',
  '/Assets/3.jpg',
  '/Assets/4.png',
  '/Assets/5.jpg',
  '/Assets/6.jpg',
  '/Assets/7.jpg',
  '/Assets/admin.jpg',
  '/Assets/org.png',
  '/Assets/dulongo.png',
];

const COMPANY_LOGO_POOL = [
  '/Assets/logo.png',
  '/Assets/org.png',
  '/Assets/google.png',
  '/Assets/netflix.png',
  '/Assets/amezon.png',
  '/Assets/puma.png',
  '/Assets/adidas.png',
  '/Assets/ck.png',
  '/Assets/goog.png',
  '/Assets/netflix.png',
];

const SKILL_WORDS = [
  'React',
  'Next.js',
  'TypeScript',
  'Node.js',
  'Express',
  'MongoDB',
  'SQL',
  'Data Structures',
  'Algorithms',
  'System Design',
  'REST APIs',
  'GraphQL',
  'Docker',
  'AWS',
  'Firebase',
  'Machine Learning',
  'Open Source',
  'CI/CD',
  'Testing',
  'Performance',
];

const NAMES = [
  'Aarav Sharma',
  'Vihaan Verma',
  'Meera Iyer',
  'Ananya Patel',
  'Arjun Singh',
  'Kiara Roy',
  'Kabir Khan',
  'Sanya Jain',
  'Dhruv Chatterjee',
  'Kritika Rao',
  'Riya Desai',
  'Nakul Bose',
  'Ishaan Kulkarni',
  'Aditi Ganguly',
  'Neha Mehta',
  'Siddhi Nair',
  'Tanya Chaudhary',
  'Vivaan Rao',
  'Manav Sharma',
  'Raghav Patel',
  // international
  'Amélie Martin',
  'Noah Müller',
  'Sofia Rossi',
  'Liam Johnson',
  'Ethan Nguyen',
  'Priya Singh',
  'Maya Almeida',
  'Owen Smith',
  'Anya Petrov',
  'Mateo García',
];

function pickFrom<T>(arr: T[], i: number) {
  return arr[i % arr.length];
}

function pickSkills(i: number) {
  const count = 6 + (stableHashToInt(`skills_${i}`, 5) % 5); // 6..10
  const out: string[] = [];
  for (let k = 0; k < count; k++) {
    out.push(SKILL_WORDS[(i * 7 + k * 3) % SKILL_WORDS.length]);
  }
  return Array.from(new Set(out)).slice(0, 10);
}

function makeUsers(count = 250): MockUser[] {
  const users: MockUser[] = [];
  for (let i = 0; i < count; i++) {
    const name = pickFrom(NAMES, i);
    const [first, ...rest] = name.split(' ');
    const last = rest.join(' ') || 'User';
    const username = `${first.toLowerCase()}${last.replace(/[^a-z]/gi, '').toLowerCase()}${(i % 97) + 3}`;
    const email = `${first}.${last}`
      .replace(/\s+/g, '')
      .replace(/[^a-zA-Z]/g, '')
      .toLowerCase();

    users.push({
      uid: makeUid('u', i),
      name,
      username,
      email: `${email}${i}@mail.demo`,
      photo: pickFrom(AVATAR_POOL, i),
      headline: pickFrom(
        [
          'Software Engineer | Full-stack Developer',
          'Frontend Engineer | React & Next.js',
          'Backend Developer | Node.js & Systems',
          'Data Enthusiast | ML & Analytics',
          'Product-minded Engineer | Build in public',
        ],
        i + 2
      ),
      bio: `I build user-centric products and enjoy turning messy ideas into clean systems. Recent work focuses on performance, reliability, and mentoring teammates through practical code reviews.`,
      skills: pickSkills(i),
      college: pickFrom(
        [
          'NIT Karnataka',
          'VIT Vellore',
          'IIT Delhi',
          'BITS Pilani',
          'Manipal University',
          'SRM Institute of Science & Technology',
          'University of Toronto',
          'University of Sydney',
        ],
        i + 1
      ),
      company: pickFrom(
        [
          'Orbit Labs',
          'Nimbus Technologies',
          'CloudPeak',
          'DevSprint',
          'BrightByte',
          'DataQuarry',
          'QuantumWorks',
          'PixelCraft',
          'Atlas Systems',
          'Horizon AI',
        ],
        i + 6
      ),
      location: pickFrom(
        [
          'Bengaluru, IN',
          'Hyderabad, IN',
          'Mumbai, IN',
          'Delhi, IN',
          'Pune, IN',
          'Chennai, IN',
          'Remote',
          'Berlin, DE',
          'Toronto, CA',
          'Barcelona, ES',
        ],
        i + 4
      ),
      experienceYears: 0 + (stableHashToInt(`exp_${i}`, 6) % 5),
      joinedDateISO: daysAgoISO(20 + stableHashToInt(`join_${i}`, 240)),
    });
  }
  return users;
}

function makeInternships(count = 300): MockInternship[] {
  const titles = [
    'Software Engineer Intern',
    'Frontend Developer Intern',
    'Backend Developer Intern',
    'Full-stack Developer Intern',
    'Data Analyst Intern',
    'ML Engineer Intern',
    'React UI Intern',
    'Open Source Mentorship Intern',
  ];

  const companies = [
    'Orbit Labs',
    'Nimbus Technologies',
    'CloudPeak',
    'DevSprint',
    'BrightByte',
    'DataQuarry',
    'QuantumWorks',
    'PixelCraft',
    'Atlas Systems',
    'Horizon AI',
  ];

  const locations = [
    'Remote',
    'Bengaluru, IN',
    'Hyderabad, IN',
    'Mumbai, IN',
    'Pune, IN',
    'Chennai, IN',
    'Delhi, IN',
    'Gurugram, IN',
    'Berlin, DE',
  ];

  const categories = ['Engineering', 'Data Science', 'Design', 'MBA'];
  const modes: MockInternship['mode'][] = ['Remote', 'Hybrid', 'Onsite'];

  const durations = ['2 months', '3 months', '4 months', '6 months', '8 months'];

  const stipends = [
    '₹15,000 / month',
    '₹20,000 / month',
    '₹30,000 / month',
    '₹45,000 / month',
    '₹60,000 / month',
  ];

  const out: MockInternship[] = [];
  for (let i = 0; i < count; i++) {
    const company = pickFrom(companies, i);
    const category = pickFrom(categories, i + 3);
    const mode = modes[(i + stableHashToInt(company, 3)) % modes.length];

    out.push({
      _id: makeUid('int', i),
      title: pickFrom(titles, i + 1),
      company,
      companyLogo: pickFrom(COMPANY_LOGO_POOL, i),
      location: pickFrom(locations, i + 5),
      stipend: pickFrom(stipends, i + 2),
      duration: pickFrom(durations, i + 4),
      skills: pickSkills(i + 10).slice(0, 8),
      category,
      postedAtISO: daysAgoISO(1 + stableHashToInt(`post_${i}`, 45)),
      mode,
    });
  }

  return out;
}

function makeCompanies(count = 120): MockCompany[] {
  const industries = [
    'SaaS',
    'FinTech',
    'AdTech',
    'EdTech',
    'AI/ML',
    'Developer Tools',
    'E-commerce',
    'Cloud Infrastructure',
    'Healthcare Tech',
  ];

  const descriptions = [
    'Builds developer-first platforms with measurable performance and reliable systems.',
    'Applies machine learning to improve user outcomes at scale.',
    'Designs clean UX and fast APIs for modern product teams.',
    'Invests in mentorship, code quality, and engineering excellence.',
    'Offers internships focused on ownership, feedback loops, and shipping real features.',
  ];

  const out: MockCompany[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      _id: makeUid('c', i),
      name: pickFrom(
        [
          'Orbit Labs',
          'Nimbus Technologies',
          'CloudPeak',
          'DevSprint',
          'BrightByte',
          'DataQuarry',
          'QuantumWorks',
          'PixelCraft',
          'Atlas Systems',
          'Horizon AI',
        ],
        i
      ),
      logo: pickFrom(COMPANY_LOGO_POOL, i),
      industry: pickFrom(industries, i + 2),
      description: pickFrom(descriptions, i + 3),
      rating: 3.8 + (stableHashToInt(`r_${i}`, 20) / 50),
      openInternships: 2 + (stableHashToInt(`o_${i}`, 20) % 12),
    });
  }
  return out;
}

function makePosts(users: MockUser[], count = 220): MockPost[] {
  const topics = [
    'Internship',
    'Internships',
    'Resume tips',
    'Interview experience',
    'Coding',
    'Open source',
    'AI',
    'React',
    'Node',
    'Hackathons',
    'Placements',
    'College life',
  ];

  const snippets = [
    'Today I shipped a feature end-to-end and learned where the real edge cases hide.',
    'My resume tip: make impact measurable and keep the story consistent across projects.',
    'Interview debrief: complexity questions improved when I started validating assumptions out loud.',
    'Open source update: submitted a PR with tests, got reviewer feedback, and iterated quickly.',
    'React lesson: predictable state beats clever state—refactor for clarity and you’ll move faster.',
    'Node.js takeaway: caching needs careful invalidation or you’ll debug phantom bugs for days.',
    'AI practical: build small prototypes first, then improve evaluation before scaling.',
  ];

  const out: MockPost[] = [];
  for (let i = 0; i < count; i++) {
    const author = users[i % users.length];
    const topic = topics[i % topics.length];
    const base = snippets[i % snippets.length];
    const includeMedia = i % 3 === 0;

    const likes = 15 + stableHashToInt(`likes_${i}`, 1500);
    const comments = 5 + stableHashToInt(`c_${i}`, 20);
    const shares = 1 + stableHashToInt(`s_${i}`, 60);

    out.push({
      _id: makeUid('p', i),
      author: { userId: author.uid, name: author.name, photo: author.photo, headline: author.headline },
      caption: `${topic} — ${base} ${i % 2 === 0 ? 'If you’re preparing too, share what you’re working on!' : 'Here’s the approach I used: plan → build → test → iterate.'}`,
      media: includeMedia
        ? { mediaType: 'image', url: pickFrom(AVATAR_POOL, i + 2) }
        : undefined,
      createdAtISO: daysAgoISO(0 + stableHashToInt(`postdate_${i}`, 90)),
      likesCount: likes,
      commentsCount: comments,
      shareCount: shares,
    });
  }
  return out;
}

const users250 = makeUsers(250);
const internships300 = makeInternships(320);
const companies120 = makeCompanies(120);
const posts240 = makePosts(users250, 240);

export const mockData = {
  users: users250,
  internships: internships300,
  companies: companies120,
  posts: posts240,

  // Derived mock datasets (generated deterministically to avoid repetition)
  commentsByPostId: (() => {
    const map: Record<string, MockComment[]> = {};
    const commentsTemplates = [
      'Solid breakdown—this matches how I approached my last project.',
      'How did you handle edge cases during integration?',
      'Great clarity. I’ll apply this pattern in my next iteration.',
      'What tech stack did you use for this?',
      'Thanks for sharing—very useful for interview prep.',
      'Loved the structure. Can you share more details?',
      'This is practical, not just theoretical.',
      'Nice work. Any resources you recommend?',
      'Respect. The reasoning is easy to follow.',
      'Good takeaway—especially the part about state and validation.',
    ];

    for (const p of posts240) {
      const authorIndex = stableHashToInt(`author_${p._id}`, users250.length);
      const count = 5 + stableHashToInt(`cc_${p._id}`, 21); // 5..25
      const arr: MockComment[] = [];
      for (let j = 0; j < count; j++) {
        const u = users250[(authorIndex + j * 7) % users250.length];
        arr.push({
          _id: `${p._id}_c_${j}`,
          postId: p._id,
          author: { userId: u.uid, name: u.name, photo: u.photo },
          text: commentsTemplates[(j + stableHashToInt(p._id, 7)) % commentsTemplates.length],
          createdAtISO: daysAgoISO(0 + (j % 25) + stableHashToInt(`cd_${p._id}_${j}`, 12)),
        });
      }
      map[p._id] = arr;
    }
    return map;
  })(),

  friendRequests: (() => {
    const out: MockFriendRequest[] = [];
    for (let i = 0; i < 900; i++) {
      const sender = users250[i % users250.length];
      const receiver = users250[(i * 13 + 7) % users250.length];
      if (sender.uid === receiver.uid) continue;
      const roll = stableHashToInt(`fr_${i}`, 100);
      const status = roll < 55 ? 'pending' : roll < 85 ? 'accepted' : 'rejected';
      out.push({
        _id: `fr_${i}`,
        senderId: sender.uid,
        receiverId: receiver.uid,
        status,
        createdAtISO: daysAgoISO(1 + stableHashToInt(`frd_${i}`, 40)),
      });
    }
    return out;
  })(),

  notifications: (() => {
    const out: MockNotification[] = [];
    for (let i = 0; i < 1200; i++) {
      const u = users250[i % users250.length];
      const typeRoll = stableHashToInt(`nt_${i}`, 100);
      const read = typeRoll % 3 === 0;
      const type: MockNotification['type'] =
        typeRoll < 20
          ? 'social'
          : typeRoll < 45
            ? 'application'
            : typeRoll < 70
              ? 'message'
              : typeRoll < 85
                ? 'post'
                : 'resume';

      const templates: Record<MockNotification['type'], { title: string; message: string }[]> = {
        social: [
          { title: 'Friend request', message: 'You have a new friend request. Tap to review.' },
          { title: 'Friend accepted', message: 'Your connection is now confirmed. Say hi!' },
        ],
        post: [
          { title: 'Post liked', message: 'Someone liked your post. Keep sharing updates!' },
          { title: 'Comment added', message: 'New comment on your post—check the discussion.' },
        ],
        application: [
          { title: 'Application updated', message: 'Your application status has changed. Review the details.' },
          { title: 'New internship', message: 'A matching internship is now live—apply quickly.' },
        ],
        resume: [
          { title: 'Resume event', message: 'Your resume was downloaded/submitted during selection.' },
          { title: 'Subscription renewed', message: 'Your subscription was renewed successfully.' },
        ],
        message: [
          { title: 'New message', message: 'You received a message in chat. Reply to stay in sync.' },
          { title: 'Conversation update', message: 'You have unread messages—open chat to continue.' },
        ],
      };

      const t = templates[type][stableHashToInt(`tpl_${i}`, templates[type].length)];

      out.push({
        _id: `n_${i}`,
        userId: u.uid,
        title: t.title,
        message: t.message,
        type,
        read,
        createdAtISO: daysAgoISO(stableHashToInt(`nd_${i}`, 45)),
      });
    }
    return out;
  })(),

  chats: (() => {
    const conversations: MockConversation[] = [];
    const messages: MockChatMessage[] = [];

    for (let i = 0; i < 420; i++) {
      const a = users250[i % users250.length];
      const b = users250[(i * 17 + 9) % users250.length];
      if (a.uid === b.uid) continue;
      const conversationId = `conv_${a.uid}_${b.uid}_${i}`;

      const lastFrom = stableHashToInt(`lm_${i}`, 2) === 0 ? a.uid : b.uid;
      const lastText = pickFrom(
        [
          'Hey, did you apply?',
          'Interview kaisa gaya?',
          'Resume bhej de.',
          "Let's connect—I'm also applying this week.",
          'Which role did you shortlist?',
          'Send me the problem statement you solved.',
          'Any tips for the HR round?',
        ],
        i
      );
      const lastMessage: MockChatMessage = {
        _id: `${conversationId}_m_last`,
        conversationId,
        fromUserId: lastFrom,
        text: lastText,
        createdAtISO: daysAgoISO(stableHashToInt(`lmd_${i}`, 20)),
      };

      const unreadCount = stableHashToInt(`uc_${i}`, 7);
      conversations.push({
        _id: conversationId,
        userIdA: a.uid,
        userIdB: b.uid,
        unreadCount,
        lastMessage,
      });

      const msgCount = 5 + stableHashToInt(`mc_${i}`, 12);
      for (let j = 0; j < msgCount; j++) {
        const from = j % 2 === 0 ? a.uid : b.uid;
        messages.push({
          _id: `${conversationId}_m_${j}`,
          conversationId,
          fromUserId: from,
          text: pickFrom(
            [
              'Hey, did you apply?',
              'Interview kaisa gaya?',
              'Resume bhej de.',
              'I’m revising React hooks today—any suggestions?',
              'Which company did you apply to?',
              'Let’s connect for placements prep.',
              'The coding round felt easier than expected.',
              'Can you share your resume bullet format?',
              'What topics came up for interviews?',
            ],
            i + j
          ),
          createdAtISO: daysAgoISO(stableHashToInt(`mdd_${i}_${j}`, 30) + j),
        });
      }
    }

    return { conversations, messages };
  })(),

  resumes: (() => {
    return users250.slice(0, 160).map((u, i) => ({
      _id: `r_${u.uid}`,
      userId: u.uid,
      resumeTitle: i % 2 === 0 ? 'Full-Stack Software Developer' : 'Data & ML Enthusiast',
      createdAtISO: daysAgoISO(stableHashToInt(`rd_${i}`, 120)),
      updatedAtISO: daysAgoISO(stableHashToInt(`ru_${i}`, 60)),
      resumePdfPath: `uploads/resumes/${u.uid}.pdf`,
    }));
  })(),

  applications: (() => {
    const statuses: MockApplication['status'][] = [
      'Applied',
      'Under Review',
      'Shortlisted',
      'Interview Scheduled',
      'Rejected',
      'Selected',
    ];

    const out: MockApplication[] = [];
    for (let i = 0; i < 620; i++) {
      const u = users250[i % users250.length];
      const internship = internships300[i % internships300.length];
      const status = statuses[stableHashToInt(`as_${i}`, statuses.length)];
      out.push({
        _id: `a_${i}`,
        userId: u.uid,
        internshipId: internship._id,
        company: internship.company,
        status,
        createdAtISO: daysAgoISO(stableHashToInt(`ad_${i}`, 180)),
      });
    }
    return out;
  })(),
};

