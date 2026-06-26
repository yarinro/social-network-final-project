# Social Network Final Project

A full-stack social network web application built as a final project for HIT.

Users can register, login, manage profiles, connect with friends, create and join groups (including private groups with manager approval), publish posts with images and videos, like posts, send real-time messages, and view statistics with D3 charts and a canvas animation on the home page.

## Main Features

- User authentication (register, login, JWT)
- User profiles and public profiles
- Friends list and user search
- Groups (create, search, join, edit, delete)
- Private groups with pending member approval
- Posts (create, edit, delete, feed, filters, likes)
- Group details page with group posts
- Real-time messaging with Socket.IO
- Statistics page (D3.js charts)
- Home page network canvas animation

## Technologies

- **Frontend:** React, Axios, React Router, D3.js, HTML Canvas
- **Backend:** Node.js, Express, MongoDB, Mongoose, Socket.IO, JWT, bcrypt

## Project Structure

```
social-network-final-project/
  client/          React frontend (Create React App)
  server/          Node.js / Express backend
  README.md
  .gitignore
```

## Backend Setup

```bash
cd server
npm install
```

Create a `.env` file in the `server` folder based on `.env.example`:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string_here
JWT_SECRET=your_jwt_secret_here
CLIENT_URL=http://localhost:3000
```

Start the backend:

```bash
npm run dev
```

The API runs at `http://localhost:5000`.

Optional MongoDB connection test:

```bash
npm run test:mongo
```

## Frontend Setup

Open a second terminal:

```bash
cd client
npm install
npm start
```

The React app runs at `http://localhost:3000`.

## Environment Variables

Create `server/.env` from `server/.env.example`:

| Variable | Description |
|----------|-------------|
| `PORT` | Backend port (default 5000) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `CLIENT_URL` | Frontend URL (reference; Socket.IO uses `http://localhost:3000`) |

## Demo Users

There are no built-in demo users. Register your own accounts for testing (for example User A and User B).

## Manual Testing Flow

1. Register two users (for example User A and User B).
2. Login as User A.
3. Create a public group and a private group.
4. Login as User B and join the public group.
5. Request to join the private group.
6. Login as User A (group manager) and approve User B.
7. Create, edit, and delete posts in the feed and on a group details page.
8. Like and unlike posts with both users.
9. Add each other as friends from the Users page.
10. Send messages between the two users on the Messages page.
11. Open the Statistics page and check the charts.
12. Refresh nested routes (for example `/groups/:id`, `/users/:id`) to confirm the app does not crash.

## Notes for Submission

Create a ZIP with only:

- `client/` (without `node_modules` and `build`)
- `server/` (without `node_modules`, include `.env.example`, not `.env`)
- `README.md`
- `.gitignore`

Do **not** include: `node_modules/`, `client/build/`, `.env` files, or `.git/`.
