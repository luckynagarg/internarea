const { uid, pick, fakeDateWithinLastMonths } = require('../utils');

const FIRST_NAMES = [
  'Aarav','Vihaan','Aditya','Arjun','Reyansh','Kabir','Ishaan','Dhruv','Manav','Raghav',
  'Meera','Ananya','Kiara','Sanya','Ira','Aditi','Riya','Neha','Divya','Aanya',
  'Vivaan','Nakul','Shaurya','Kunal','Dev','Pranav','Kritika','Siddhi','Aditi','Tanya'
];

const LAST_NAMES = [
  'Sharma','Verma','Gupta','Singh','Kapoor','Iyer','Nair','Chatterjee','Kulkarni','Mehta',
  'Patel','Rao','Bose','Roy','Desai','Chaudhary','Ganguly','Banerjee','Jain','Khan'
];

const HEADLINES = [
  'Software Engineer | Full-stack Developer','Frontend Engineer | React','Backend Developer | Node.js','Data Enthusiast | ML','Product-minded Engineer'
];

const COLLEGES = [
  'National Institute of Technology, Karnataka','Vellore Institute of Technology','Indian Institute of Technology, Delhi',
  'Birla Institute of Technology and Science, Pilani','Manipal Institute of Technology','SRM Institute of Science and Technology'
];

const DEGREES = ['B.Tech','M.Tech','BCA','MCA','B.E.','M.S.'];

const SKILL_POOL = [
  'JavaScript','TypeScript','React','Next.js','Node.js','Express','MongoDB','SQL','Python','Java','C++','HTML','CSS','Redux','Tailwind',
  'REST APIs','GraphQL','Docker','Kubernetes','AWS','GCP','Firebase','Git','CI/CD','Linux','System Design','Problem Solving','Data Structures','Algorithms'
];

const SOCIAL_DOMAINS = ['github.com','linkedin.com/in','x.com','medium.com'];

function generateSkills() {
  const count = Math.floor(Math.random() * 6) + 5; // 5-10
  const shuffled = [...SKILL_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateProjects() {
  const PROJECT_TITLES = [
    'CampusConnect','MedTrack','TaskFlow','StudyBuddy','ShopEase','WeatherWise','ExpensePilot','MealPlanner','HabitForge','NewsNest'
  ];
  const count = Math.floor(Math.random() * 4) + 2; // 2-5
  const shuffled = [...PROJECT_TITLES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((t) => ({
    title: t,
    summary: `Built ${t} with modern web technologies and real-time UX improvements.`,
    stack: pick([
      ['React','TypeScript','Node.js'],
      ['Next.js','MongoDB','Express'],
      ['React','Redux','REST APIs'],
      ['Next.js','Firebase','Tailwind'],
    ]),
    url: `https://example.com/${t.toLowerCase()}`
  }));
}

function generateExperience() {
  const xpOptions = [
    { role: 'Frontend Intern', company: 'Orbit Labs', months: rand(3,6) },
    { role: 'Software Engineering Intern', company: 'Nimbus Technologies', months: rand(4,9) },
    { role: 'Backend Intern', company: 'CloudPeak', months: rand(3,7) },
    { role: 'Full-stack Intern', company: 'DevSprint', months: rand(2,6) },
  ];
  const count = Math.floor(Math.random() * 3); // 0-2
  const shuffled = [...xpOptions].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count + 1);
  return selected.map((x) => ({
    role: x.role,
    company: x.company,
    duration: `${x.months} months`,
    highlights: [
      'Improved performance and user experience through optimizations and refactors.',
      'Built reusable components and contributed to feature delivery.',
      'Collaborated with cross-functional teams using Agile practices.'
    ]
  }));
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateCertifications() {
  const certs = [
    'Google Cloud Fundamentals','AWS Cloud Practitioner','React Advanced','Node.js APIs','MongoDB Basics','TypeScript Mastery','System Design 101'
  ];
  const count = rand(1,3);
  return [...certs].sort(() => Math.random() - 0.5).slice(0, count);
}

function generateSocialLinks(name) {
  const first = name.split(' ')[0].toLowerCase();
  const last = name.split(' ')[1].toLowerCase();
  const github = `https://github.com/${first}${last}`;
  const linkedin = `https://linkedin.com/in/${first}-${last}`;
  const x = `https://x.com/${first}${rand(10,99)}`;
  const medium = `https://medium.com/@${first}.${last}`;
  const links = [github, linkedin, x, medium];
  // pick 2-4
  return shuffleSlice(links, rand(2,4));
}

function shuffleSlice(arr, count) {
  const a = [...arr].sort(() => Math.random() - 0.5);
  return a.slice(0, count);
}

function generateUserProfile(index) {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  const fullName = `${first} ${last}`;

  const email = `${first}.${last}${index}@example.com`.toLowerCase();
  const photo = `https://placehold.co/160x160/png?text=${encodeURIComponent(first[0] + last[0])}`;

  const joinedAt = fakeDateWithinLastMonths(12);
  const dob = fakeDateWithinLastMonths(10);
  const gender = pick(['Male','Female','Non-binary','Prefer not to say']);
  const phone = `+91-${rand(600, 999)}-${rand(10000000, 99999999)}`;

  const headline = pick(HEADLINES);
  const bio = `Passionate about building user-centric products. I enjoy solving challenging problems using ${pick(['React','Node.js','TypeScript','MongoDB'])} and continuously learning through real-world projects.`;

  const college = pick(COLLEGES);
  const degree = pick(DEGREES);

  const skills = generateSkills();
  const experience = generateExperience();
  const projects = generateProjects();
  const certifications = generateCertifications();

  const socialLinks = generateSocialLinks(fullName);
  const location = pick(['Bengaluru, IN','Hyderabad, IN','Mumbai, IN','Delhi, IN','Pune, IN','Chennai, IN','Kolkata, IN']);

  return {
    userId: uid(20),
    fullName,
    email,
    profilePhoto: photo,
    headline,
    about: bio,
    college,
    degree,
    skills,
    experience,
    projects,
    certifications,
    socialLinks,
    location,
    phone,
    gender,
    dateOfBirth: dob.toISOString(),
    joinedDate: joinedAt.toISOString(),
  };
}

function generateUsers(count = 20) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(generateUserProfile(i));
  }
  return out;
}

module.exports = { generateUsers };

