import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RAGResponse, CacheEntry } from '../types/rag.types';
import { CacheFilters } from '../../types/common.types';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis;
  private readonly defaultTTL = 3600; // 1 hour

  constructor(private readonly configService: ConfigService) {
    const redisUrl =
      this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis');
    });
  }

  async get(key: string): Promise<RAGResponse | null> {
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        const parsed = JSON.parse(cached) as {
          timestamp: string;
          ttl: number;
          value: RAGResponse;
        };

        // Ensure we have the required fields
        if (!parsed.timestamp || !parsed.ttl || !parsed.value) {
          this.logger.warn(`Invalid cache entry format for key: ${key}`);
          await this.redis.del(key);
          return null;
        }

        // Convert timestamp string back to Date object
        const timestamp = new Date(parsed.timestamp);

        // Validate the timestamp
        if (isNaN(timestamp.getTime())) {
          this.logger.warn(`Invalid timestamp in cache entry for key: ${key}`);
          await this.redis.del(key);
          return null;
        }

        // Check if entry is still valid
        if (Date.now() - timestamp.getTime() < parsed.ttl * 1000) {
          this.logger.debug(`Cache hit for key: ${key}`);
          return parsed.value;
        } else {
          // Remove expired entry
          await this.redis.del(key);
        }
      }

      this.logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      this.logger.error('Error getting from cache:', error);
      return null;
    }
  }

  async set(
    key: string,
    value: RAGResponse,
    ttl: number = this.defaultTTL,
  ): Promise<void> {
    try {
      const cacheEntry: CacheEntry = {
        key,
        value,
        timestamp: new Date(),
        ttl,
      };

      await this.redis.setex(key, ttl, JSON.stringify(cacheEntry));
      this.logger.debug(`Cached response for key: ${key}`);
    } catch (error) {
      this.logger.error('Error setting cache:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.logger.debug(`Deleted cache entry for key: ${key}`);
    } catch (error) {
      this.logger.error('Error deleting from cache:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.logger.log('Cache cleared');
    } catch (error) {
      this.logger.error('Error clearing cache:', error);
    }
  }

  async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate: number;
  }> {
    try {
      const info = await this.redis.info('stats');
      const keyspace = await this.redis.info('keyspace');

      // Parse Redis info
      const stats = this.parseRedisInfo(info);
      const keyspaceInfo = this.parseKeyspaceInfo(keyspace);

      return {
        totalKeys: keyspaceInfo.totalKeys || 0,
        memoryUsage: stats.usedMemoryHuman || '0B',
        hitRate: this.calculateHitRate(
          stats.keyspaceHits,
          stats.keyspaceMisses,
        ),
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return {
        totalKeys: 0,
        memoryUsage: '0B',
        hitRate: 0,
      };
    }
  }

  generateCacheKey(
    query: string,
    filters?: CacheFilters,
    userId?: string,
  ): string {
    const filterString = filters ? JSON.stringify(filters) : '';
    const userString = userId ? `:user:${userId}` : '';
    const queryHash = this.simpleHash(query + filterString + userString);
    return `rag:search:${queryHash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private parseRedisInfo(info: string): Record<string, string> {
    const lines = info.split('\r\n');
    const stats: Record<string, string> = {};

    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        stats[key] = value;
      }
    }

    return stats;
  }

  private parseKeyspaceInfo(info: string): { totalKeys: number } {
    const lines = info.split('\r\n');
    let totalKeys = 0;

    for (const line of lines) {
      if (line.startsWith('db')) {
        const match = line.match(/keys=(\d+)/);
        if (match) {
          totalKeys += parseInt(match[1]);
        }
      }
    }

    return { totalKeys };
  }

  private calculateHitRate(
    hits: string | undefined,
    misses: string | undefined,
  ): number {
    const hitsNum = parseInt(hits || '0', 10);
    const missesNum = parseInt(misses || '0', 10);
    const total = hitsNum + missesNum;

    if (total === 0) return 0;
    return hitsNum / total;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return false;
    }
  }
}
