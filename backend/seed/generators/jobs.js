const { pick, randInt, fakeDateWithinLastMonths } = require('../utils');

const SKILL_POOL = [
  'JavaScript','TypeScript','React','Next.js','Node.js','Express','MongoDB','SQL','Python','Java','C++','HTML','CSS','Redux','Tailwind',
  'REST APIs','GraphQL','Docker','AWS','GCP','Firebase','Git','CI/CD','System Design','Problem Solving','Data Structures','Algorithms'
];

function generateJobDescription(title) {
  return `Looking for a ${title} to build impactful features, collaborate with teammates, and ship high-quality code in a fast-paced environment.`;
}

function generateSkills() {
  const count = randInt(6, 12);
  const shuffled = [...SKILL_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

const COMPANIES = [
  'Orbit Labs','Nimbus Technologies','CloudPeak','DevSprint','BrightByte','DataQuarry','QuantumWorks','PixelCraft','Atlas Systems','Horizon AI'
];

const TITLES = [
  'Software Engineer Intern','Frontend Developer Intern','Backend Developer Intern','Full-stack Developer Intern','Data Analyst Intern','ML Engineer Intern'
];

const LOCATIONS = ['Remote','Bengaluru, IN','Hyderabad, IN','Mumbai, IN','Pune, IN','Chennai, IN','Delhi, IN','Gurugram, IN'];

const DURATIONS = ['2 months','3 months','4 months','6 months','8 months'];

function generateJobBase() {
  const title = pick(TITLES);
  const company = pick(COMPANIES);
  const location = pick(LOCATIONS);
  const category = pick(['Engineering','Data','Design','Product']);
  const aboutCompany = `${company} builds tools that help teams move faster and learn smarter.`;
  const aboutJob = `You will work with experienced engineers to develop features, improve systems reliability, and contribute to code reviews.`;
  const whoCanApply = `Open to students with strong fundamentals in ${pick(['web development','data structures','backend development','react ecosystem'])}.`;
  const perks = shufflePick([
    'Flexible working hours','Mentorship','Certificate','Real-world projects','Performance bonus','Learning stipend'
  ], randInt(3, 6));

  const AdditionalInfo = `This role is part-time/full-time hybrid depending on schedule. Emphasis on collaboration and ownership.`;
  const CTC = `${randInt(6, 18)} LPA`;
  const StartDate = fakeStartDate();

  return {
    title,
    company,
    location,
    Experience: pick(['0-1 years','1-2 years','Freshers','1 year','2 years']),
    category,
    aboutCompany,
    aboutJob,
    whoCanApply,
    perks,
    AdditionalInfo,
    CTC,
    StartDate,
  };
}

function fakeStartDate() {
  const d = fakeDateWithinLastMonths(12);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function shufflePick(arr, count) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, count);
}

function generateJobs(count = 30) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({ ...generateJobBase() });
  }
  return out;
}

module.exports = { generateJobs };

