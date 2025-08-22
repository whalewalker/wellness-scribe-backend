import { Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { ChatMessage, ChatCacheData } from '../types/chat.types';
import { ChatMetadata, ChatListItem } from '../../types/common.types';

@Injectable()
export class ChatCacheService {
  private readonly logger = new Logger(ChatCacheService.name);
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly MESSAGE_TTL = 1800; // 30 minutes

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async cacheChatMessages(
    chatId: string,
    messages: ChatMessage[],
  ): Promise<void> {
    try {
      const cacheKey = `chat:${chatId}:messages`;
      const cacheData: ChatCacheData = {
        messages,
        lastUpdated: new Date(),
        messageCount: messages.length,
      };

      await this.cacheManager.set(cacheKey, cacheData, this.CACHE_TTL);
      this.logger.debug(
        `Cached ${messages.length} messages for chat ${chatId}`,
      );
    } catch (error) {
      this.logger.error(`Error caching chat messages for ${chatId}:`, error);
    }
  }

  async getCachedChatMessages(chatId: string): Promise<ChatMessage[] | null> {
    try {
      const cacheKey = `chat:${chatId}:messages`;
      const cachedData = await this.cacheManager.get<ChatCacheData>(cacheKey);

      if (cachedData && cachedData.messages) {
        this.logger.debug(
          `Retrieved ${cachedData.messages.length} cached messages for chat ${chatId}`,
        );
        return cachedData.messages;
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Error retrieving cached messages for ${chatId}:`,
        error,
      );
      return null;
    }
  }

  async cacheChatMetadata(
    chatId: string,
    metadata: ChatMetadata,
  ): Promise<void> {
    try {
      const cacheKey = `chat:${chatId}:metadata`;
      await this.cacheManager.set(cacheKey, metadata, this.CACHE_TTL);
      this.logger.debug(`Cached metadata for chat ${chatId}`);
    } catch (error) {
      this.logger.error(`Error caching chat metadata for ${chatId}:`, error);
    }
  }

  async getCachedChatMetadata(chatId: string): Promise<ChatMetadata | null> {
    try {
      const cacheKey = `chat:${chatId}:metadata`;
      const result = await this.cacheManager.get<ChatMetadata>(cacheKey);
      return result || null;
    } catch (error) {
      this.logger.error(
        `Error retrieving cached metadata for ${chatId}:`,
        error,
      );
      return null;
    }
  }

  async cacheUserChatList(
    userId: string,
    chatList: ChatListItem[],
  ): Promise<void> {
    try {
      const cacheKey = `user:${userId}:chats`;
      await this.cacheManager.set(cacheKey, chatList, this.CACHE_TTL);
      this.logger.debug(`Cached chat list for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error caching chat list for user ${userId}:`, error);
    }
  }

  async getCachedUserChatList(userId: string): Promise<ChatListItem[] | null> {
    try {
      const cacheKey = `user:${userId}:chats`;
      const result = await this.cacheManager.get<ChatListItem[]>(cacheKey);
      return result || null;
    } catch (error) {
      this.logger.error(
        `Error retrieving cached chat list for user ${userId}:`,
        error,
      );
      return null;
    }
  }

  async invalidateChatCache(chatId: string): Promise<void> {
    try {
      const messageKey = `chat:${chatId}:messages`;
      const metadataKey = `chat:${chatId}:metadata`;

      await this.cacheManager.del(messageKey);
      await this.cacheManager.del(metadataKey);

      this.logger.debug(`Invalidated cache for chat ${chatId}`);
    } catch (error) {
      this.logger.error(`Error invalidating cache for chat ${chatId}:`, error);
    }
  }

  async invalidateUserChatListCache(userId: string): Promise<void> {
    try {
      const cacheKey = `user:${userId}:chats`;
      await this.cacheManager.del(cacheKey);
      this.logger.debug(`Invalidated chat list cache for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Error invalidating chat list cache for user ${userId}:`,
        error,
      );
    }
  }

  async cacheMessage(chatId: string, message: ChatMessage): Promise<void> {
    try {
      const cacheKey = `chat:${chatId}:message:${message.timestamp.getTime()}`;
      await this.cacheManager.set(cacheKey, message, this.MESSAGE_TTL);
      this.logger.debug(`Cached message for chat ${chatId}`);
    } catch (error) {
      this.logger.error(`Error caching message for chat ${chatId}:`, error);
    }
  }

  async getCachedMessage(
    chatId: string,
    timestamp: Date,
  ): Promise<ChatMessage | null> {
    try {
      const cacheKey = `chat:${chatId}:message:${timestamp.getTime()}`;
      const result = await this.cacheManager.get<ChatMessage>(cacheKey);
      return result || null;
    } catch (error) {
      this.logger.error(
        `Error retrieving cached message for chat ${chatId}:`,
        error,
      );
      return null;
    }
  }
}
