# ⚽ Football Match Management App

A mobile-first web application for managing weekly football matches among friends. Built with Next.js 14+, TypeScript, Tailwind CSS, and SQLite.

## Features

### For Players
- **Simple Join Flow**: Join via shareable link with first name, last name, and username
- **Cookie-based Authentication**: Automatic login with 90-day cookie persistence
- **Username Recovery**: Recover account access by entering username
- **Match Availability**: Mark yourself as available or unavailable for upcoming matches
- **First-come-first-served**: First 18 players confirmed, rest on reserve list
- **Priority System**: Previous reserves get priority for next match
- **Balance Tracking**: View your current balance (£4 per match played)
- **Games Played Counter**: Track total matches you've participated in
- **Mobile-Optimized**: Large touch targets, clean UI, fast loading

### For Managers
- **Manager Access Link**: Special access via unique manager code
- **Match Creation**: Create matches with date, time, and location
- **Share Match Info**: Auto-generate WhatsApp-ready share text
- **Availability Management**: View all available players in order
- **Team Generation**: Auto-split confirmed players into Blue and Red teams
- **Team Sharing**: Copy teams to clipboard for WhatsApp sharing
- **Match Completion**: Mark matches complete and automatically charge players £4
- **Player Management**: View all players, balances, and games played
- **Payment Recording**: Record payments and update balances
- **Transaction Audit**: All balance changes tracked with audit trail
- **Managers Play Free**: Manager accounts don't get charged for matches

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS (mobile-first)
- **Database**: SQLite with Drizzle ORM
- **Authentication**: Cookie-based with localStorage backup

## Database Schema

- **Users**: Player/manager accounts with balance and stats
- **Matches**: Match details and status
- **Availability**: Player availability for each match
- **Teams**: Blue/Red team assignments
- **Transactions**: Audit trail for all balance changes
- **ManagerLinks**: Secure manager access codes

## Getting Started

### Installation

```bash
# Install dependencies
npm install

# Initialize the database
npm run db:push

# Generate manager access link
npm run init
```

This will output a manager link like: `http://localhost:3000/manager/YOUR_CODE`

### Development

```bash
# Start the dev server
npm run dev
```

Visit `http://localhost:3000`

### First-Time Setup

1. **Set up Manager Account**
   - Visit the manager link from `npm run init`
   - Enter your name and username
   - Bookmark this link for future access

2. **Create First Match**
   - Go to Manager Dashboard
   - Click "Create Match"
   - Fill in date, time, location
   - Share the generated text in WhatsApp

3. **Players Join**
   - Share `http://localhost:3000/join` with players
   - Players create accounts and mark availability

## User Flows

### Player Journey

1. Click join link → Enter details → Auto-logged in
2. View upcoming matches on main page
3. Click "I'm in" for matches they can play
4. See if confirmed (first 18) or on reserve
5. Check balance and games played in header
6. If cookie expires: enter username to recover account

### Manager Journey

1. Access via manager link → Set up account (first time)
2. Create new match → Copy share text for WhatsApp
3. View match availability → See all available players
4. Generate teams → Auto-split into Blue and Red
5. Copy teams to share on WhatsApp
6. After match → Mark as completed
7. System auto-charges each player £4 (except managers)
8. Manage players → Record payments, update balances

## Business Logic

### Availability System
- Players mark availability → timestamped
- First 18 by timestamp = confirmed
- Remaining = reserve list
- If reserve didn't make previous team → priority next match
- Priority players sorted ahead of regular availability

### Match Completion
- Mark match complete → charge all team players
- Non-managers: +£4 to balance, +1 to games played
- Managers: +1 to games played (no charge)
- Reset priority flags for players who made the team
- Set priority flag for reserves who didn't make it

### Payment System
- All balance changes create transaction record
- Types: match_charge, payment, adjustment
- Transaction includes: amount, type, creator, timestamp
- Positive balance = owes money (red)
- Negative/zero balance = paid up (green)

## API Routes

### Authentication
- `POST /api/auth/join` - Create new player account
- `POST /api/auth/recover` - Recover account by username
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Clear session

### Matches
- `GET /api/matches` - List matches (filter by status)
- `POST /api/matches` - Create new match (manager only)
- `GET /api/matches/[id]` - Get match details with availability
- `PATCH /api/matches/[id]` - Update match (complete, etc.)

### Availability
- `POST /api/availability` - Mark in/out for match

### Teams
- `POST /api/teams` - Create/update teams (manager only)
- `PUT /api/teams` - Auto-generate teams (manager only)

### Players
- `GET /api/players` - List all players
- `PATCH /api/players/[id]` - Update player (payment, adjustment)
- `DELETE /api/players/[id]` - Remove player (manager only)

### Manager
- `POST /api/manager/verify` - Verify manager code
- `POST /api/manager/setup` - Set up new manager

## Mobile-First Design

- Optimized for phones (90% of usage)
- Minimum 44px touch targets
- Simple, clean UI inspired by WhatsApp/Monzo
- Color coding:
  - Blue team → blue background
  - Red team → red background
  - Owes money → red text
  - Paid up → green text
- Fast loading with server-side rendering
- Sticky header for easy navigation

## Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production, set to your actual domain.

## Production Deployment

1. Build the app: `npm run build`
2. Start production server: `npm start`
3. Or deploy to Vercel/Netlify/Railway

## License

MIT
