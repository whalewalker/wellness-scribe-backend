# RAG (Retrieval-Augmented Generation) System

## Overview

The RAG system enhances the wellness AI by integrating real user data, chat history, and wellness documents with vector search capabilities. This provides personalized, context-aware responses based on actual user interactions and documents.

## Architecture

### Core Components

1. **RAGService** - Main orchestrator that coordinates all RAG operations
2. **VectorSearchService** - Handles similarity search and document ranking
3. **EmbeddingService** - Generates vector embeddings for documents and queries
4. **CacheService** - Redis-based caching for improved performance
5. **MongoDB Schemas** - Store wellness documents and conversation context

### Data Flow

```
User Query → RAGService → VectorSearchService → EmbeddingService → MongoDB/Redis → Response
```

## Features

### Real User Data Integration
- **User Wellness Documents**: Personal health records, symptoms, treatments
- **Chat History**: Conversation context and user preferences
- **User Context**: Health conditions, medications, wellness goals

### Intelligent Search
- **Hybrid Search**: Combines vector similarity and text search
- **Context-Aware Ranking**: Prioritizes user-specific documents
- **Real-time Relevance**: Updates based on conversation context

### Performance Optimization
- **Redis Caching**: Caches search results and embeddings
- **Vector Indexing**: Fast similarity search on document embeddings
- **Smart Chunking**: Breaks large documents into searchable chunks

## API Endpoints

### RAG Search
```http
POST /rag/search
{
  "query": "diabetes management",
  "userId": "user123",
  "context": {
    "healthConditions": ["diabetes"],
    "medications": ["metformin"],
    "wellnessGoals": ["blood sugar control"]
  },
  "filters": {
    "categories": ["treatment", "lifestyle"],
    "evidenceLevels": ["high", "medium"]
  }
}
```

### Add User Document
```http
POST /rag/documents?userId=user123
{
  "title": "Blood Sugar Log",
  "content": "Morning reading: 120 mg/dL...",
  "category": "condition",
  "keywords": ["diabetes", "blood sugar", "glucose"],
  "evidence_level": "high",
  "source": "user_log"
}
```

### Get User Documents
```http
GET /rag/documents/user123
```

### Generate Chat Response
```http
POST /rag/chat
{
  "message": "How can I manage my blood sugar?",
  "userId": "user123",
  "sessionId": "session456",
  "context": {
    "healthConditions": ["diabetes"],
    "medications": ["metformin"]
  }
}
```

## Configuration

### Environment Variables
```env
# Mistral AI
MISTRAL_API_KEY=your_mistral_api_key

# Redis
REDIS_URL=redis://localhost:6379

# MongoDB
MONGODB_URI=mongodb://localhost:27017/wellness
```

### RAG Configuration
```typescript
{
  embeddingModel: {
    name: 'mistral-embed',
    dimensions: 1024,
    maxTokens: 8192,
    provider: 'mistral',
  },
  vectorSearchConfig: {
    indexName: 'wellness_documents',
    similarityMetric: 'cosine',
    topK: 10,
    threshold: 0.7,
  },
  cacheConfig: {
    enabled: true,
    ttl: 3600,
    maxSize: 1000,
  }
}
```

## Usage Examples

### Adding User Wellness Document
```typescript
const document = {
  title: "Sleep Pattern Analysis",
  content: "Average sleep duration: 6.5 hours...",
  category: "lifestyle",
  keywords: ["sleep", "insomnia", "rest"],
  evidence_level: "medium",
  source: "user_tracking"
};

await ragService.addUserWellnessDocument(userId, document);
```

### Generating Contextual Response
```typescript
const response = await ragService.generateContextualResponse(
  "I'm having trouble sleeping",
  userId,
  sessionId,
  {
    healthConditions: ["insomnia"],
    wellnessGoals: ["better sleep"]
  }
);
```

### Searching Documents
```typescript
const results = await ragService.searchDocuments({
  query: "sleep improvement techniques",
  userId,
  context: {
    healthConditions: ["insomnia"],
    recentTopics: ["sleep", "stress"]
  },
  limit: 5
});
```

## Benefits

1. **Personalization**: Responses based on actual user data and history
2. **Accuracy**: Evidence-based information from user documents
3. **Context Awareness**: Maintains conversation context across sessions
4. **Performance**: Fast retrieval with intelligent caching
5. **Scalability**: Vector search handles large document collections

## Security

- JWT authentication required for all RAG endpoints
- User data isolation - documents are user-specific
- Rate limiting to prevent abuse
- Input validation and sanitization

## Monitoring

The system includes comprehensive logging for:
- Search performance metrics
- Cache hit rates
- Embedding generation times
- User interaction patterns

## Future Enhancements

1. **Multi-modal RAG**: Support for images, audio, and video
2. **Real-time Learning**: Update embeddings based on user feedback
3. **Advanced Filtering**: Semantic filtering and faceted search
4. **Collaborative Filtering**: Learn from similar user patterns
5. **A/B Testing**: Compare different RAG strategies 