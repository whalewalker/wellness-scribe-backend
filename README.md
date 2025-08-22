# Wellness Scribe Backend

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
  <a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
  <a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
</p>

## Description

**Wellness Scribe Backend** is an AI-powered wellness documentation and coaching platform built with NestJS. It provides intelligent health tracking, personalized wellness coaching, and AI-enhanced documentation management for healthcare professionals and individuals.

## Features

### Core Modules

- **AI Services** - Integration with Mistral AI for intelligent responses and document analysis
- **Chat System** - AI-powered conversational interface with context awareness
- **RAG System** - Retrieval-Augmented Generation for personalized, evidence-based responses
- **Wellness Documents** - Comprehensive health document management and storage
- **Wellness Coaching** - SMART goal setting, progress tracking, and AI-powered coaching
- **Authentication** - JWT-based secure authentication and authorization
- **Progress Analytics** - Real-time dashboards and comprehensive reporting

### Key Capabilities

- **AI-Powered Health Insights** - Generate personalized wellness recommendations
- **Smart Document Management** - Organize and search health documents intelligently
- **Goal Tracking** - Set, monitor, and achieve wellness goals with AI assistance
- **Progress Visualization** - Interactive charts and analytics for health metrics
- **Context-Aware Responses** - AI that remembers user history and preferences
- **Real-time Updates** - Live progress tracking and milestone celebrations

## Architecture

The application follows a modular NestJS architecture with the following key components:

```
src/
├── ai/                 # AI services and integrations
├── auth/               # Authentication and authorization
├── chat/               # Chat system and conversation management
├── rag/                # RAG system for intelligent document retrieval
├── wellness-documents/ # Health document management
├── wellness-coaching/  # Goal setting and progress tracking
└── config/             # Configuration and environment management
```

## Technology Stack

- **Framework**: NestJS 11.x (Node.js)
- **Language**: TypeScript 5.x
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis with cache-manager
- **AI**: Mistral AI API, LangChain
- **Authentication**: JWT with Passport
- **Validation**: Class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest with supertest

## Prerequisites

- Node.js 18+ 
- MongoDB 6+
- Redis 6+
- Mistral AI API key

## Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd wellness-scribe-backend

# Install dependencies
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/wellness-scribe
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# AI Services
MISTRAL_API_KEY=your_mistral_api_key

# CORS
CORS_ORIGIN=http://localhost:8080

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_LIMIT=100
```

### 3. Database Setup

```bash
# Start MongoDB (if using Docker)
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Start Redis (if using Docker)
docker run -d -p 6379:6379 --name redis redis:latest
```

### 4. Run the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod

# Debug mode
npm run start:debug
```

The application will be available at:
- **API**: http://localhost:3001
- **Swagger Documentation**: http://localhost:3001/api

## API Documentation

### Authentication Endpoints

- `POST /auth/register` - User registration
- `POST /auth/login` - User authentication
- `POST /auth/refresh` - Refresh JWT token

### Wellness Documents

- `GET /wellness-documents` - Retrieve user documents
- `POST /wellness-documents` - Create new document
- `PUT /wellness-documents/:id` - Update document
- `DELETE /wellness-documents/:id` - Delete document

### Wellness Coaching

- `POST /wellness-coaching/goals` - Create SMART goal
- `GET /wellness-coaching/goals` - Get user goals
- `POST /wellness-coaching/goals/:id/progress` - Add progress entry
- `GET /wellness-coaching/dashboard` - Get progress dashboard

### RAG System

- `POST /rag/search` - Search wellness documents
- `POST /rag/chat` - Generate contextual responses
- `POST /rag/documents` - Add user documents

### Chat System

- `POST /chat/conversations` - Start new conversation
- `POST /chat/messages` - Send message
- `GET /chat/conversations/:id` - Get conversation history

## Development

### Available Scripts

```bash
# Build the application
npm run build

# Run in development mode
npm run start:dev

# Run tests
npm run test

# Run e2e tests
npm run test:e2e

# Lint and fix code
npm run lint

# Format code
npm run format
```

### Code Structure

The project follows NestJS best practices with:

- **Modular Architecture** - Each feature is a separate module
- **Service Layer** - Business logic separated from controllers
- **DTO Validation** - Request/response validation using class-validator
- **Guards** - Route protection and rate limiting
- **Interceptors** - Request/response transformation
- **Pipes** - Data validation and transformation

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Test in watch mode
npm run test:watch
```

## Monitoring & Performance

- **Rate Limiting** - Built-in throttling to prevent abuse
- **Caching** - Redis-based caching for improved performance
- **Logging** - Comprehensive application logging
- **Health Checks** - Built-in health monitoring endpoints

## Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt-based password security
- **CORS Protection** - Configurable cross-origin resource sharing
- **Input Validation** - Comprehensive request validation
- **Rate Limiting** - Protection against brute force attacks

## Deployment

### Docker Deployment

```bash
# Build the image
docker build -t wellness-scribe-backend .

# Run the container
docker run -p 3001:3001 wellness-scribe-backend
```

### Environment Variables

Ensure all required environment variables are set in your production environment:

- `NODE_ENV=production`
- `MONGODB_URI` - Production MongoDB connection string
- `REDIS_URL` - Production Redis connection string
- `JWT_SECRET` - Strong, unique JWT secret
- `MISTRAL_API_KEY` - Valid Mistral AI API key

## Additional Documentation

- [RAG System Documentation](./RAG_README.md) - Detailed RAG system guide
- [Wellness Coaching Features](./WELLNESS_COACHING_README.md) - Coaching system documentation

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [Swagger API Docs](http://localhost:3001/api)
- **Issues**: Create an issue in the repository

## Acknowledgments

- Built with [NestJS](https://nestjs.com/) - A progressive Node.js framework
- AI powered by [Mistral AI](https://mistral.ai/)
- Vector search capabilities with [LangChain](https://langchain.com/)

---

**Wellness Scribe Backend** - Empowering wellness through intelligent AI assistance and comprehensive health tracking.
