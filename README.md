# Markup MVP

A collaborative web annotation and feedback platform. Teams can load any web page inside an iframe, place pins at specific locations, and leave threaded comments — making it easy to collect and track visual feedback.

## Tech Stack

| Layer    | Technology                              |
| -------- | --------------------------------------- |
| Frontend | React 19, React Router 7, Tailwind CSS |
| Backend  | Express 5, Node.js                     |
| Database | MongoDB (Mongoose ODM)                 |
| Auth     | JWT, bcryptjs                           |
| Email    | Nodemailer (SMTP)                      |

## Project Structure

```
markup_mvp/
├── client/                 # React frontend
│   └── src/
│       ├── components/     # UI components (auth, dashboard, project)
│       ├── contexts/       # AuthContext
│       ├── hooks/          # useAuth, useIframeMessages
│       ├── pages/          # Page-level components
│       ├── services/       # API client modules
│       └── utils/          # Constants and helpers
├── server/                 # Express backend
│   ├── config/             # Database connection
│   ├── controllers/        # Route handlers
│   ├── middleware/          # Auth, roles, project access, uploads
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API route definitions
│   ├── utils/              # Proxy rewriter, mailer, async handler
│   └── uploads/            # Uploaded files
```

## Prerequisites

- Node.js (v18+)
- npm
- MongoDB (local or remote)

## Environment Variables

Create a `server/.env` file with the following keys:

```env
PORT=5000
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-jwt-secret>
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:3000

SMTP_HOST=<smtp-server-host>
SMTP_PORT=<smtp-port>
SMTP_USER=<smtp-username>
SMTP_PASS=<smtp-password>
SMTP_FROM=<sender-email-address>
```

## Getting Started

### Server

```bash
cd server
npm install
npm run dev      # development (nodemon)
npm start        # production
```

Server runs on `http://localhost:5000`.

### Client

```bash
cd client
npm install
npm start
```

Client runs on `http://localhost:3000`. API requests are proxied to the server automatically in development.

## Features

- **Web Annotation** — Proxy any web page in an iframe and place pins at precise coordinates
- **Threaded Comments** — Add discussions and file attachments to each pin
- **Pin Status** — Track feedback as pending or resolved
- **Project Management** — Create projects, invite members via email, assign roles
- **Role-Based Access** — Admin and member roles with middleware-enforced permissions
- **Email Invitations** — Send invite links with 7-day expiring tokens

## API Endpoints

### Auth
| Method | Endpoint             | Description        |
| ------ | -------------------- | ------------------ |
| POST   | `/api/auth/signup`   | Register           |
| POST   | `/api/auth/login`    | Log in             |
| GET    | `/api/auth/me`       | Get current user   |

### Projects
| Method | Endpoint                                    | Description     |
| ------ | ------------------------------------------- | --------------- |
| POST   | `/api/projects`                             | Create project  |
| GET    | `/api/projects`                             | List projects   |
| GET    | `/api/projects/:projectId`                  | Get project     |
| PATCH  | `/api/projects/:projectId`                  | Update project  |
| DELETE | `/api/projects/:projectId`                  | Delete project  |
| POST   | `/api/projects/:projectId/members`          | Invite member   |
| DELETE | `/api/projects/:projectId/members/:userId`  | Remove member   |

### Pins
| Method | Endpoint                        | Description          |
| ------ | ------------------------------- | -------------------- |
| POST   | `/api/projects/:projectId/pins` | Create pin           |
| GET    | `/api/projects/:projectId/pins` | List pins            |
| PATCH  | `/api/pins/:pinId`              | Update pin status    |
| DELETE | `/api/pins/:pinId`              | Delete pin           |

### Comments
| Method | Endpoint                        | Description          |
| ------ | ------------------------------- | -------------------- |
| POST   | `/api/pins/:pinId/comments`     | Add comment          |
| GET    | `/api/pins/:pinId/comments`     | Get comments         |

### Other
| Method | Endpoint            | Description          |
| ------ | ------------------- | -------------------- |
| GET    | `/api/proxy`        | Proxy web page       |
| POST   | `/api/invitations`  | Create invitation    |
| GET    | `/api/invitations`  | List invitations     |
