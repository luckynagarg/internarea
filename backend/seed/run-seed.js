const mongoose = require('mongoose');
require('dotenv').config();

const { generateUsers } = require('./generators/users');
const { generateJobs } = require('./generators/jobs');
const { generateInternships } = require('./generators/internships');
const { generatePosts } = require('./generators/posts');
const { generateFriendships } = require('./generators/friendships');
const { generateResumesForUsers } = require('./generators/resumes');
const { generateApplications } = require('./generators/applications');
const { generateLikes, generateComments } = require('./generators/commentsLikes');

async function main() {
  const {
    DATABASE_URL,
    SEED_CLEAR,
    SEED_COUNT_USERS,
    SEED_COUNT_JOBS,
    SEED_COUNT_INTERNSHIPS,
    SEED_COUNT_POSTS,
    SEED_COUNT_APPLICATIONS,
  } = process.env;

  const uri = DATABASE_URL;
  if (!uri) {
    console.error('Missing DATABASE_URL in environment. Create backend/.env');
    process.exit(1);
  }

  const countUsers = Number(SEED_COUNT_USERS || 220);
  const countJobs = Number(SEED_COUNT_JOBS || 30);
  const countInternships = Number(SEED_COUNT_INTERNSHIPS || 60);
  const countPosts = Number(SEED_COUNT_POSTS || 240); // demo-friendly posts (200+)
  const countApplications = Number(SEED_COUNT_APPLICATIONS || 220);

  const conn = await mongoose.connect(uri);
  console.log('Connected:', conn.connection.host);

  if (String(SEED_CLEAR).toLowerCase() === 'true') {
    console.log('Clearing collections...');
    await Promise.all([
      clear('PublicPost'),
      clear('PostLike'),
      clear('PostComment'),
      clear('Friendship'),
      clear('Application'),
      clear('Job'),
      clear('Internship'),
      clear('Resume'),
    ]);
  }

  // Load models
  const Job = require('../Model/Job');
  const Internship = require('../Model/Internship');
  const Application = require('../Model/Application');
  const PublicPost = require('../Model/PublicPost');
  const PostLike = require('../Model/PostLike');
  const PostComment = require('../Model/PostComment');
  const Friendship = require('../Model/Friendship');
  const Resume = require('../Model/Resume');

  // Generate users, jobs, internships
  const users = generateUsers(countUsers);
  const jobs = generateJobs(countJobs);
  const internships = generateInternships(countInternships);

  // Seed jobs/internships
  await Job.insertMany(jobs);
  const seededJobs = await Job.find().lean();

  const internshipDocs = internships.map((x) => ({ ...x }));
  await Internship.insertMany(internshipDocs);
  const seededInternships = await Internship.find().lean();

  // Generate resumes (frontend uses its own resume creation; backend resume model exists)
  const resumes = generateResumesForUsers(users);
  await Resume.insertMany(
    resumes.map((r) => ({
      userId: r.userId,
      resumeData: r.resumeData,
      photoUrl: r.photoUrl,
      resumePdfPath: r.resumePdfPath,
      status: 'generated',
      // store dummy atsScore inside resumeData if schema doesn't have it
    }))
  );
  const seededResumes = await Resume.find().lean();

  // Seed friendships (accepted only so feed posting limit works)
  const friendships = generateFriendships({ users });
  await Friendship.insertMany(friendships);

  // Seed posts
  const placeholderImages = [];
  const postsInput = generatePosts({ users, images: placeholderImages }, countPosts);
  const seededPosts = await PublicPost.insertMany(postsInput);
  const posts = await PublicPost.find().lean();

  // Seed likes & comments
  const likes = generateLikes({ users, posts, likeMin: 2, likeMax: 18 });
  await PostLike.insertMany(likes);

  const comments = generateComments({ users, posts, commentMin: 1, commentMax: 6 });
  await PostComment.insertMany(comments);

  // Seed applications
  // applications reference Internship ids in Application model
  const internshipById = seededInternships;
  const appResumes = seededResumes.map((r) => ({ ...r, userId: r.userId }));

  const applications = [];
  for (let i = 0; i < countApplications; i++) {
    const doc = require('./generators/applications').generateApplications({
      users,
      internships: internshipById,
      resumes: appResumes,
      count: 1,
    })[0];
    // ensure internship id exists
    if (!doc.Application) continue;
    applications.push(doc);
  }

  if (applications.length) {
    await Application.insertMany(applications);
  }

  console.log('Seed complete.');
  console.log({
    users: users.length,
    jobs: seededJobs.length,
    internships: seededInternships.length,
    resumes: seededResumes.length,
    friendships: friendships.length,
    posts: posts.length,
    likes: likes.length,
    comments: comments.length,
    applications: applications.length,
  });

  await mongoose.disconnect();
}

async function clear(modelName) {
  const map = {
    PublicPost: require('../Model/PublicPost'),
    PostLike: require('../Model/PostLike'),
    PostComment: require('../Model/PostComment'),
    Friendship: require('../Model/Friendship'),
    Application: require('../Model/Application'),
    Job: require('../Model/Job'),
    Internship: require('../Model/Internship'),
    Resume: require('../Model/Resume'),
  };

  const Model = map[modelName];
  if (!Model) return;
  await Model.deleteMany({});
}

// Start
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

