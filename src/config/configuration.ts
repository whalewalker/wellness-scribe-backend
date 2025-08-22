export default () => ({
  port: parseInt(process.env.PORT || '3001', 10) || 3001,
  database: {
    mongodb: {
      uri:
        process.env.MONGODB_URI || 'mongodb://localhost:27017/wellness-scribe',
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
  },
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY,
  },
  cors: {
    origin: [
      'http://localhost:3000',
      'https://wellness-scribe-frontend.vercel.app',
      'https://wellness-scribe.vercel.app',
      'https://wellness-scribe-frontend-8zqojwq00-whalewalkers-projects.vercel.app',
      'https://wellness-scribe-frontend-git-main-whalewalkers-projects.vercel.app',
    ],
  },
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10) || 60,
    limit: parseInt(process.env.RATE_LIMIT_LIMIT || '100', 10) || 100,
  },
});
