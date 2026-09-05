# InternArea

InternArea is a full-stack internship platform connecting students and graduates with internship and job opportunities. It features a social "Public Space" feed, friend connections, real-time messaging, a resume builder, subscription-based application quotas, and a multi-language interface.

## Quick Start

```bash
# Clone and install
git clone <repository-url>
cd internarea

# Frontend
cd internarea && npm install
cp .env.example .env.local   # fill in Firebase + backend URL

# Backend
cd ../backend && npm install
cp .env.example .env          # fill in MongoDB, Firebase Admin, email, payment keys

# Run both (separate terminals)
cd ../internarea && npm run dev   # http://localhost:3000
cd ../backend && npm run dev       # http://localhost:5000
```

See [docs/setup.md](docs/setup.md) for detailed instructions.

## Key Features

- **Platform**: Internship and job listings with search and filtering
- **Authentication**: Email/password, Google sign-in, phone OTP (Firebase Auth)
- **Social**: Public Space posting with friend-based daily limits, likes, comments
- **Connections**: Friend request system, user search
- **Messaging**: Real-time 1-to-1 chat (Socket.IO)
- **Resume Builder**: Create, preview, download (PDF), and manage resumes with OTP-protected payment
- **Subscriptions**: Razorpay-powered subscription plans with monthly application quotas
- **Admin Panel**: Full admin dashboard for user/content/application management and analytics
- **Multi-language**: 6 languages (English, Spanish, Hindi, Portuguese, Chinese, French)
- **Notifications**: Real-time notifications for applications, social interactions, and system events

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (Pages Router), TypeScript, React 19, Tailwind CSS, Redux Toolkit |
| Backend | Node.js, Express 4, Mongoose, Firebase Admin |
| Database | MongoDB (Atlas) |
| Authentication | Firebase Authentication |
| File Storage | Firebase Storage |
| Email | Resend (primary), SMTP/Nodemailer (fallback) |
| Payments | Razorpay |
| Realtime | Socket.IO |
| i18n | Custom runtime engine (6 languages, English source-of-truth) |
| Deployment | Frontend: Vercel; Backend: Render |

## Documentation

| Topic | Link |
|---|---|
| Architecture | [docs/architecture.md](docs/architecture.md) |
| Setup Guide | [docs/setup.md](docs/setup.md) |
| Environment Variables | [docs/environment.md](docs/environment.md) |
| Authentication | [docs/authentication.md](docs/authentication.md) |
| API Reference | [docs/api.md](docs/api.md) |
| Database | [docs/database.md](docs/database.md) |
| Admin Panel | [docs/admin.md](docs/admin.md) |
| Features | [docs/features.md](docs/features.md) |
| Deployment | [docs/deployment.md](docs/deployment.md) |
| Testing | [docs/testing.md](docs/testing.md) |
| Troubleshooting | [docs/troubleshooting.md](docs/troubleshooting.md) |

## Project Structure

```
internarea/
├── internarea/              # Next.js frontend (src/pages, src/Components, src/i18n, src/lib)
├── backend/                 # Express API (Routes/, Middleware/, Model/, Services/)
├── docs/                    # Project documentation
└── .gitignore
```

## Development Commands

```bash
# Frontend (internarea/)
npm run dev          # Dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npm test             # Jest (no tests currently)

# Backend (backend/)
npm run dev          # nodemon dev server (port 5000)
npm start            # Production start
node --check <file>  # Syntax check
```

## Security

- All authentication is handled by Firebase — passwords are never stored in MongoDB
- Backend verifies Firebase ID tokens on every protected request
- Admin access requires server-side verification (admin session token or admin claim)
- User identity is derived from verified tokens, never from request bodies
- Firebase service-account credentials are excluded from version control via `.gitignore`
- Security headers (Helmet), rate limiting, and body-size limits are enforced

See [docs/authentication.md](docs/authentication.md) for details.

## License

This project is provided as-is for portfolio use. See source headers for individual component licenses.
