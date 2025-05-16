# JaMoveo - Band Management Application

JaMoveo is a real-time band management application that allows band members to collaborate on songs and manage live sessions.

## Features

- User authentication (regular users and admins)
- Song management (create, read, update, delete)
- Live session management with real-time collaboration
- Instrument-specific views
- Real-time scroll synchronization
- Comprehensive error handling and logging

## Tech Stack

### Frontend
- React with TypeScript
- Vite
- Tailwind CSS
- Socket.IO Client

### Backend
- Node.js
- Express
- MongoDB
- Socket.IO
- JWT Authentication
- Winston Logger

## Project Structure

```
jamoveo/
├── client/             # Frontend React application
│   ├── src/
│   ├── public/
│   └── ...
├── server/             # Backend Node.js application
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Custom middleware
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── sockets/        # Socket.IO handlers
│   ├── tests/          # Test files
│   ├── utils/          # Utility functions
│   └── ...
└── docker-compose.yml  # Docker composition file
```

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/jamoveo.git
   cd jamoveo
   ```

2. Set up environment variables:
   - Copy `.env.example` to `.env` in both client and server directories
   - Update the variables as needed

3. Install dependencies:
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

4. Start the development servers:
   ```bash
   # Start the backend server
   cd server
   npm run dev

   # Start the frontend development server
   cd ../client
   npm run dev
   ```

## Running Tests

```bash
# Run server tests
cd server
npm test

# Run tests in watch mode
npm run test:watch
```

## Deployment

The application can be deployed using Docker:

```bash
# Build and start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f
```

### Environment Variables

Required environment variables for deployment:

- `NODE_ENV`: Application environment (development/production)
- `PORT`: Server port
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `CLIENT_URL`: Frontend application URL
- `CORS_ORIGIN`: Allowed CORS origin

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
