# Backend Seed (Demo Data)

This folder contains scripts to generate realistic demo content for local development.

## Run

1) Create/ensure `backend/.env` contains:
- `DATABASE_URL=<your-mongodb-connection-string>`

2) (Optional) clear existing data:
- `npm run seed:clear`

3) Seed:
- `npm run seed`

## Optional env overrides

You can set these in `backend/.env` or when running:
- `SEED_COUNT_USERS` (default 20)
- `SEED_COUNT_JOBS` (default 30)
- `SEED_COUNT_INTERNSHIPS` (default 60)
- `SEED_COUNT_POSTS` (default 12)  
- `SEED_COUNT_APPLICATIONS` (default 120)

## Seeded collections
- Job, Internship
- Resume
- Friendship (accepted only)
- PublicPost, PostLike, PostComment
- Application

Notes:
- This backend project appears to be Firebase-auth based; therefore we seed `userId` values (Firebase-like UIDs) and use them as references for posts/friendships/applications.
- Notifications/messages are not seeded because there are no corresponding backend models/collections in this codebase.
