const { pick, randInt, fakeDateWithinLastMonths } = require('../utils');

const SKILL_POOL = [
  'JavaScript','TypeScript','React','Next.js','Node.js','Express','MongoDB','SQL','Python','Java','C++','HTML','CSS','Redux','Tailwind',
  'REST APIs','GraphQL','Docker','AWS','GCP','Firebase','Git','CI/CD','System Design','Problem Solving','Data Structures','Algorithms'
];

const COMPANIES = [
  'Orbit Labs','Nimbus Technologies','CloudPeak','DevSprint','BrightByte','DataQuarry','QuantumWorks','PixelCraft','Atlas Systems','Horizon AI'
];

const TITLES = [
  'Software Engineer Intern','Frontend Developer Intern','Backend Developer Intern','Full-stack Developer Intern','Data Analyst Intern','ML Engineer Intern'
];

const LOCATIONS = ['Remote','Bengaluru, IN','Hyderabad, IN','Mumbai, IN','Pune, IN','Chennai, IN','Delhi, IN','Gurugram, IN'];

const DURATIONS = ['2 months','3 months','4 months','6 months','8 months'];

function shufflePick(arr, count) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, count);
}

function generateInternshipBase() {
  const title = pick(TITLES);
  const company = pick(COMPANIES);
  const location = pick(LOCATIONS);
  const category = pick(['Engineering','Data','Design','Product']);
  const aboutCompany = `${company} builds tools that help teams ship faster and learn from real usage.`;
  const aboutInternship = `As an intern, you will deliver production-ready features, improve performance, and collaborate closely with mentors.`;
  const whoCanApply = `Open to students with solid fundamentals and hands-on practice in ${pick(['web development','data structures','backend systems','react ecosystem','ML basics'])}.`;
  const perks = shufflePick(
    [
      'Mentorship','Flexible hours','Certificate','Internship stipend','Real-world projects','Performance bonus','Learning budget','Guided code reviews'
    ],
    randInt(3, 7)
  );
  const numberOfOpening = `${randInt(1, 8)}`;
  const stipend = `${randInt(15000, 60000)} INR/month`;
  const startDate = fakeStartDate();
  const additionalInfo = `Mentor-led onboarding, weekly demos, and clear project milestones. Work mode can be remote/hybrid depending on team needs.`;

  return {
    title,
    company,
    location,
    category,
    aboutCompany,
    aboutInternship,
    whoCanApply,
    perks,
    numberOfOpening,
    stipend,
    startDate,
    additionalInfo,
  };
}

function fakeStartDate() {
  const d = fakeDateWithinLastMonths(12);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function generateInternships(count = 30) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({ ...generateInternshipBase() });
  }
  return out;
}

module.exports = { generateInternships };

