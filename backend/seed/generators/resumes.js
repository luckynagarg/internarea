const { pick, randInt, fakeDateWithinLastMonths } = require('../utils');

const EDUCATIONS = [
  'B.Tech in Computer Science',
  'BCA in Information Technology',
  'B.E. in Electronics & Communication',
  'MCA in Software Engineering',
  'B.Tech in Information Technology'
];

const SKILL_POOL = [
  'JavaScript','TypeScript','React','Next.js','Node.js','Express','MongoDB','SQL','Python','Java','C++','HTML','CSS','Redux','Tailwind',
  'REST APIs','GraphQL','Docker','AWS','GCP','Firebase','Git','CI/CD','System Design','Data Structures','Algorithms'
];

function generateResumeData() {
  const skills = [...SKILL_POOL].sort(() => Math.random() - 0.5).slice(0, randInt(8, 14));

  const education = [
    {
      degree: pick(EDUCATIONS),
      college: pick([
        'National Institute of Technology, Karnataka',
        'Vellore Institute of Technology',
        'Indian Institute of Technology, Delhi',
        'BITS Pilani',
        'SRM Institute of Science and Technology',
        'Manipal Institute of Technology',
      ]),
      startYear: String(randInt(2018, 2022)),
      endYear: String(randInt(2021, 2026)),
      score: `${randInt(7, 10)}.${randInt(0, 9)} CGPA`
    }
  ];

  const experience = [
    {
      title: pick([
        'Software Engineering Intern','Frontend Intern','Backend Intern','Full-stack Intern','Data Intern'
      ]),
      company: pick([
        'Orbit Labs','Nimbus Technologies','CloudPeak','DevSprint','BrightByte','DataQuarry'
      ]),
      start: String(randInt(2022, 2023)),
      end: String(randInt(2023, 2024)),
      description: pick([
        'Built features end-to-end with clean UI and reliable APIs.',
        'Improved performance by optimizing data fetching and caching.',
        'Developed reusable components and improved developer experience.'
      ]),
      achievements: [
        'Reduced load time by ~25% through caching and pagination.',
        'Implemented robust form validation and error handling.'
      ]
    }
  ];

  const projects = [
    {
      name: pick([
        'TaskFlow','MedTrack','ExpensePilot','MealPlanner','NewsNest','StudyBuddy'
      ]),
      description: 'A production-ready project with intuitive UX and solid backend architecture.',
      techStack: pick([
        ['React','TypeScript','Node.js','MongoDB'],
        ['Next.js','MongoDB','Express'],
        ['React','Redux','REST APIs'],
        ['Next.js','Firebase','Tailwind']
      ])
    }
  ];

  const certifications = [
    pick([
      'AWS Cloud Practitioner','React Advanced','TypeScript Mastery','MongoDB Basics','System Design 101'
    ])
  ];

  const languages = [...new Set([pick(['English','Hindi','Bengali','Telugu','Marathi']), pick(['English','Hindi','Tamil','Kannada'])])];

  const achievements = [
    'Solved 250+ DSA problems across platforms.',
    'Built 10+ portfolio projects and open-sourced tools.'
  ];

  return {
    education,
    experience,
    projects,
    skills,
    languages,
    certifications,
    achievements
  };
}

function generateResumesForUsers(users) {
  return users.map((u) => {
    // snapshot should include realistic dummy resume content
    const resumeData = generateResumeData();

    const resumePdfPath = `uploads/resumes/resume_${u.userId}_${Date.now()}.pdf`;

    const createdAt = fakeDateWithinLastMonths(12);

    return {
      userId: u.userId,
      resumeData,
      photoUrl: u.profilePhoto,
      resumePdfPath,
      status: 'generated',
      createdAt,
      atsScore: randInt(60, 95),
      resumeTitle: pick([
        'Full-Stack Software Developer','Frontend Engineer','Backend Engineer','Data & ML Enthusiast','Product-minded Developer'
      ]),
    };
  });
}

module.exports = { generateResumesForUsers };

