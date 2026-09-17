const { pick, randInt, fakeDateWithinLastMonths } = require('../utils');

const STATUSES = ['pending','accepted','rejected'];

function generateCoverLetter(company, roleTitle) {
  const body = [
    `I am excited to apply for the ${roleTitle} role at ${company}. I have hands-on experience building projects using modern web development practices and collaborative workflows.`,
    `My focus is on writing reliable code, improving performance, and delivering user-centric features with clean architecture.`,
    `I would love the opportunity to contribute to ${company} and learn from your team.`
  ];
  return body.join(' ');
}

function generateApplicationDoc({ users, internships, resumes }) {
  const applicant = pick(users);
  const internship = pick(internships);
  const resume = pick(resumes.filter((r) => r.userId === applicant.userId));

  const createdAt = fakeDateWithinLastMonths(12);

  // Map status: keep more pending/shortlisted-like than rejected.
  const statusRoll = Math.random();
  let status = 'pending';
  if (statusRoll > 0.82) status = 'rejected';
  else if (statusRoll > 0.55) status = 'accepted';

  return {
    company: internship.company,
    category: internship.category,
    coverLetter: generateCoverLetter(internship.company, internship.title),
    userId: applicant.userId,
    Application: internship._id ? String(internship._id) : internship.id,
    createdAt,
    status,
    // backend schema also has loose fields: Application: Object/ legacy, body etc.
    body: {
      resumeUsed: resume ? resume.resumePdfPath : null,
    },
  };
}

function generateApplications({ users, internships, resumes, count = 120 }) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(generateApplicationDoc({ users, internships, resumes }));
  }
  return out;
}

module.exports = { generateApplications };

