# DB-MANAGER

A full-stack database management application built with React frontend and Flask backend, designed for MongoDB database operations including backup, restore, and collection management.

## Architecture

- **Frontend**: React 19 with TailwindCSS and Heroicons
- **Backend**: Flask 3.0 with MongoDB integration
- **Database**: MongoDB with pymongo driver

## Features

- Database management and monitoring
- Collection operations (copy, manage)
- Automated backup and restore functionality
- Real-time database status monitoring
- Rate limiting and CORS protection
- Comprehensive logging system

## Project Structure

```
DB-MANAGER/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── features/       # Feature-specific components
│   │   ├── pages/          # Main application pages
│   │   └── routes/         # Application routing
│   └── package.json
├── server/                 # Flask backend
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic services
│   ├── backups/            # Database backup storage
│   ├── logs/               # Application logs
│   └── requirements.txt
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Python 3.8+
- MongoDB instance
- pipenv (recommended) or pip

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd DB-MANAGER
   ```

2. **Setup Backend**
   ```bash
   cd server
   pip install -r requirements.txt
   # or with pipenv
   pipenv install
   ```

3. **Setup Frontend**
   ```bash
   cd client
   npm install
   ```

4. **Seed Database (Optional)**
   ```bash
   cd server
   python seed/seed.py
   ```
   This will create sample databases for testing and development.

### Configuration

Create a `.env` file in the server directory:

```env
MONGODB_URI=mongodb://localhost:27017
# Server Configuration
FLASK_ENV=development
PORT=5000
HOST=127.0.0.1

# MongoDB Configuration
MONGODB_TIMEOUT=30000

# File Storage
BACKUP_DIRECTORY=./backups
TEMP_DIRECTORY=./temp
LOG_DIRECTORY=./logs
MAX_BACKUP_SIZE=1073741824

# Logging
LOG_LEVEL=INFO

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Application
APP_NAME=MongoDB Utility
APP_VERSION=1.0.0

# Rate Limiting
RATELIMIT_STORAGE_URL=memory://
```

### Running the Application

1. **Start the Backend**
   ```bash
   cd server
   python app.py
   # or with pipenv
   pipenv run python app.py
   ```

2. **Start the Frontend**
   ```bash
   cd client
   npm start
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## API Endpoints

- `/api/database/*` - Database management operations
- `/api/collection/*` - Collection operations and management
- `/api/backup/*` - Backup and restore functionality
- `/health` - Health check endpoint

## Development

### Frontend Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

### Backend Features

- Rate limiting (200 requests/day, 50/hour)
- CORS protection
- Comprehensive logging
- Automated directory creation
- Error handling middleware

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license information here]
