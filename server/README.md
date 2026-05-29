# Vitalis AI — Backend API

Production-grade Node.js/Express/MongoDB backend for the Vitalis AI wellness platform.

## Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB Atlas + Mongoose ODM
- **Auth**: JWT + bcryptjs
- **Validation**: express-validator

## Quick Start

### 1. Install dependencies
```bash
cd server
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env` and set your `MONGO_URI` and `JWT_SECRET`.

### 3. Run development server
```bash
npm run dev
```

### 4. Run production
```bash
npm start
```

Server starts on `http://localhost:5000`

---

## API Reference

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login, returns JWT |
| GET | `/api/auth/profile` | ✅ | Get current user |

### User
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/user/dashboard` | ✅ | Full dashboard data |
| PUT | `/api/user/update-profile` | ✅ | Update profile & goals |

### Wellness
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/wellness/checkin` | ✅ | Submit daily check-in |
| GET | `/api/wellness/history` | ✅ | Get log history |
| PUT | `/api/wellness/update` | ✅ | Update a log entry |

### AI Chat
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/ai/chat` | ✅ | Send message, get AI response |
| GET | `/api/ai/history` | ✅ | Get chat history |

### Analytics
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/analytics/mood` | ✅ | Mood trend data |
| GET | `/api/analytics/sleep` | ✅ | Sleep analytics |
| GET | `/api/analytics/hydration` | ✅ | Hydration analytics |
| GET | `/api/analytics/wellness-score` | ✅ | Wellness score history |

---

## Request Examples

### Signup
```json
POST /api/auth/signup
{
  "username": "alexjohnson",
  "email": "alex@example.com",
  "password": "SecurePass1",
  "age": 28,
  "gender": "prefer-not-to-say"
}
```

### Daily Check-in
```json
POST /api/wellness/checkin
Authorization: Bearer <token>
{
  "sleep": { "hours": 7.5, "bedtime": "22:30", "wakeTime": "06:00", "quality": 4 },
  "hydration": { "glasses": 6 },
  "mood": { "label": "Focused", "value": 5, "note": "Productive morning" },
  "stressLevel": 3,
  "energyLevel": 8,
  "completedRoutines": ["r1", "r2", "r3"]
}
```

### AI Chat
```json
POST /api/ai/chat
Authorization: Bearer <token>
{ "message": "I feel stressed and tired today" }
```

---

## Architecture

```
server/
├── config/db.js              # MongoDB connection
├── controllers/              # Route handlers (MVC)
│   ├── authController.js
│   ├── userController.js
│   ├── wellnessController.js
│   ├── aiController.js
│   └── analyticsController.js
├── middleware/
│   ├── authMiddleware.js     # JWT verification
│   └── errorMiddleware.js    # Global error handler
├── models/                   # Mongoose schemas
│   ├── User.js
│   ├── WellnessLog.js
│   ├── ChatHistory.js
│   └── Routine.js
├── routes/                   # Express routers
├── utils/                    # Business logic engines
│   ├── wellnessCalculator.js # Scoring algorithm
│   ├── aiResponseEngine.js   # AI intent + response
│   ├── predictionEngine.js   # Burnout/sleep/care predictions
│   └── notificationEngine.js # Smart notifications
└── server.js                 # Entry point
```

## Wellness Score Algorithm

| Factor | Weight |
|--------|--------|
| Sleep | 35% |
| Hydration | 25% |
| Mood | 20% |
| Stress | 10% |
| Energy | 5% |
| Routine | 5% |

## Frontend Connection

Add `api.js` to your HTML pages:
```html
<script src="api.js"></script>
```

On dashboard load:
```js
// Sync backend data into localStorage
await syncDashboardFromBackend();

// Auto-save after any data change
await autoSaveToBackend();

// Use AI chat via backend
const { data } = await VitalisAI.chat("I feel tired today");
```
