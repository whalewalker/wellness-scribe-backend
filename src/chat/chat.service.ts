import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Chat, ChatDocument } from '../schemas/chat.schema';
import {
  ConversationContext,
  ConversationContextDocument,
} from '../rag/schemas/conversation-context.schema';
import {
  SendMessageDto,
  UpdateChatDto,
  ChatResponseDto,
  ChatListResponseDto,
  SummaryResponseDto,
  ChatMessageResponseDto,
} from '../dto/chat.dto';
import { AiService } from '../ai/ai.service';
import { ChatCacheService } from './services/chat-cache.service';
import { ChatMessage } from './types/chat.types';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(Chat.name)
    private readonly chatModel: Model<ChatDocument>,
    @InjectModel(ConversationContext.name)
    private readonly conversationContextModel: Model<ConversationContextDocument>,
    private readonly aiService: AiService,
    private readonly chatCacheService: ChatCacheService,
  ) {}

  async sendMessage(
    userId: string,
    sendMessageDto: SendMessageDto,
  ): Promise<ChatResponseDto> {
    const { content, chatId, tags, context } = sendMessageDto;

    // Check if this is a stop signal
    const stopKeywords = ['stop', 'end', 'quit', 'exit', 'terminate', 'halt'];
    const isStopSignal = stopKeywords.some((keyword) =>
      content.toLowerCase().includes(keyword),
    );

    let chat: ChatDocument | null;
    let isNewChat = false;

    if (chatId) {
      // Get from MongoDB (source of truth)
      chat = await this.chatModel.findOne({
        _id: chatId,
        userId: new Types.ObjectId(userId),
      });

      if (!chat) {
        throw new NotFoundException('Chat not found');
      }

      // Check if chat is already stopped
      if (chat.status === 'archived') {
        throw new NotFoundException(
          'This chat has been stopped and cannot receive new messages',
        );
      }

      // Get existing messages from ConversationContext
      const conversationContext = await this.getOrCreateConversationContext(
        userId,
        chatId,
      );
      chat.messages = conversationContext.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: msg.metadata
          ? {
              tokens: msg.metadata.topics?.length,
              model: 'wellness-scribe',
              processingTime: 0,
            }
          : undefined,
      }));
    } else {
      // Create new chat object but don't save yet
      isNewChat = true;
      chat = new this.chatModel({
        userId: new Types.ObjectId(userId),
        title: `New Chat - ${new Date().toLocaleDateString()}`, // Temporary title, will be replaced
        tags: tags || [],
        context,
        messages: [],
      });
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content,
      timestamp: new Date(),
    };

    // For new chats, we'll handle conversation context after saving the chat
    let conversationContext: ConversationContextDocument | null = null;

    if (!isNewChat) {
      // Get conversation context for existing chats
      conversationContext = await this.getOrCreateConversationContext(
        userId,
        chat._id.toString(),
      );

      // Add user message to conversation context
      conversationContext.messages.push({
        role: 'user',
        content,
        timestamp: new Date(),
      });
      conversationContext.messageCount = conversationContext.messages.length;
      conversationContext.lastUpdated = new Date();
    }

    chat.messages.push(userMessage);

    // If it's a stop signal, handle it immediately
    if (isStopSignal) {
      chat.status = 'archived';

      const stopMessage: ChatMessage = {
        role: 'system',
        content: 'Chat stopped by user request',
        timestamp: new Date(),
        metadata: {
          action: 'stop',
          reason: 'User requested to stop',
        },
      };

      chat.messages.push(stopMessage);

      // Save the chat first (especially important for new chats)
      const savedChat = await chat.save();

      // Now handle conversation context with the actual chat ID
      if (isNewChat) {
        conversationContext = await this.getOrCreateConversationContext(
          userId,
          savedChat._id.toString(),
        );
        // Add user message
        conversationContext.messages.push({
          role: 'user',
          content,
          timestamp: userMessage.timestamp,
        });
      }

      // Add stop message to conversation context
      if (conversationContext) {
        conversationContext.messages.push({
          role: 'system',
          content: 'Chat stopped by user request',
          timestamp: new Date(),
        });
        conversationContext.messageCount = conversationContext.messages.length;
        conversationContext.lastUpdated = new Date();

        // Save conversation context
        await conversationContext.save();
      }

      // Update cache with final state
      await this.chatCacheService.cacheChatMessages(
        savedChat._id.toString(),
        savedChat.messages,
      );

      // Cache the updated metadata
      await this.chatCacheService.cacheChatMetadata(savedChat._id.toString(), {
        title: savedChat.title,
      });

      // Invalidate user's chat list cache to reflect status change
      await this.chatCacheService.invalidateUserChatListCache(userId);

      return this.mapChatToResponse(savedChat);
    }

    // Generate AI response with unique generation ID
    // For new chats, use a temporary ID until we save
    const tempId = isNewChat
      ? `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      : chat._id.toString();
    const generationId = `gen_${tempId}_${Date.now()}`;
    const conversationHistory = chat.messages.slice(0, -1).map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const aiResponse = await this.aiService.generateChatResponse(
      content,
      conversationHistory,
      { userId },
      generationId,
    );

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: aiResponse.content ?? '',
      timestamp: new Date(),
      metadata: {
        tokens: aiResponse.usage?.total_tokens,
        model: aiResponse.model,
        processingTime: Date.now() - userMessage.timestamp.getTime(),
      },
    };

    chat.messages.push(assistantMessage);
    chat.totalTokens += aiResponse.usage?.total_tokens ?? 0;

    // Generate AI title for new chats (when there are only 2 messages: user + assistant)
    if (isNewChat && chat.messages.length === 2) {
      try {
        const aiTitle = await this.aiService.generateChatTitle(content);
        chat.title = aiTitle;
        this.logger.debug(`Generated AI title for new chat: ${aiTitle}`);
      } catch (error) {
        this.logger.error(
          'Failed to generate AI title, using fallback:',
          error,
        );
        // Title remains as set earlier
      }
    }

    // Now save the complete chat (for new chats, this is the first and only save with complete data)
    const savedChat = await chat.save();

    // Handle conversation context (create it now that we have a real chat ID)
    if (isNewChat) {
      conversationContext = await this.getOrCreateConversationContext(
        userId,
        savedChat._id.toString(),
      );
      // Add user message
      conversationContext.messages.push({
        role: 'user',
        content,
        timestamp: userMessage.timestamp,
      });
    }

    // Ensure conversationContext is available (should be set above for new chats or existing chats)
    if (!conversationContext) {
      throw new Error('Conversation context not found');
    }

    // Add assistant message to conversation context
    conversationContext.messages.push({
      role: 'assistant',
      content: aiResponse.content ?? '',
      timestamp: new Date(),
    });
    conversationContext.messageCount = conversationContext.messages.length;
    conversationContext.lastUpdated = new Date();

    // Save conversation context to MongoDB
    await conversationContext.save();

    // Update cache with complete conversation including messages
    await this.chatCacheService.cacheChatMessages(
      savedChat._id.toString(),
      savedChat.messages,
    );

    // Cache the chat metadata (including updated title)
    await this.chatCacheService.cacheChatMetadata(savedChat._id.toString(), {
      title: savedChat.title,
    });

    // Invalidate user's chat list cache to force refresh with new title
    await this.chatCacheService.invalidateUserChatListCache(userId);

    return this.mapChatToResponse(savedChat);
  }

  async getUserChats(userId: string): Promise<ChatListResponseDto[]> {
    // Try cache first
    const cachedChatList =
      await this.chatCacheService.getCachedUserChatList(userId);

    if (cachedChatList) {
      this.logger.debug(`Using cached chat list for user ${userId}`);
      return cachedChatList as unknown as ChatListResponseDto[];
    }

    // Get from MongoDB
    const chats = await this.chatModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .select('-messages');

    const chatList = chats.map((chat) => ({
      id: chat._id.toString(),
      title: chat.title,
      status: chat.status,
      tags: chat.tags,
      summary: chat.summary,
      totalTokens: chat.totalTokens,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    }));

    const chatListForCache = chats.map((chat) => ({
      id: chat._id.toString(),
      title: chat.title,
      status: chat.status,
      tags: chat.tags,
      summary: chat.summary,
      totalTokens: chat.totalTokens,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      lastMessageTime: chat.updatedAt,
      participantCount: 1, 
      unreadCount: 0, 
      isGroup: false,
    }));

    await this.chatCacheService.cacheUserChatList(userId, chatListForCache);

    return chatList;
  }

  async getChatById(userId: string, chatId: string): Promise<ChatResponseDto> {
    const chat = await this.chatModel.findOne({
      _id: chatId,
      userId: new Types.ObjectId(userId),
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Get messages from ConversationContext using chatId as sessionId
    const conversationContext = await this.conversationContextModel.findOne({
      userId: userId,
      sessionId: chatId,
    });

    // Convert ConversationContext messages to ChatMessage format
    let messages: ChatMessage[] = [];
    if (conversationContext && conversationContext.messages) {
      messages = conversationContext.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: msg.metadata
          ? {
              tokens: msg.metadata.topics?.length,
              model: 'wellness-scribe',
              processingTime: 0,
            }
          : undefined,
      }));
    }

    // Try cache as fallback if no conversation context found
    if (messages.length === 0) {
      const cachedMessages =
        await this.chatCacheService.getCachedChatMessages(chatId);
      if (cachedMessages) {
        messages = cachedMessages;
      }
    }

    // Update chat with the retrieved messages for response mapping
    chat.messages = messages;

    await Promise.all([
      this.chatCacheService.cacheChatMessages(chatId, messages),
      this.chatCacheService.cacheChatMetadata(chatId, {
        title: chat.title,
      }),
    ]);

    return this.mapChatToResponse(chat);
  }

  async updateChat(
    userId: string,
    chatId: string,
    updateChatDto: UpdateChatDto,
  ): Promise<ChatResponseDto> {
    const chat = await this.chatModel.findOneAndUpdate(
      {
        _id: chatId,
        userId: new Types.ObjectId(userId),
      },
      { $set: updateChatDto },
      { new: true },
    );

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Invalidate cache
    await this.chatCacheService.invalidateChatCache(chatId);
    await this.chatCacheService.invalidateUserChatListCache(userId);

    return this.mapChatToResponse(chat);
  }

  async deleteChat(
    userId: string,
    chatId: string,
  ): Promise<ChatMessageResponseDto> {
    const result = await this.chatModel.deleteOne({
      _id: chatId,
      userId: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Chat not found');
    }

    // Invalidate cache
    await this.chatCacheService.invalidateChatCache(chatId);
    await this.chatCacheService.invalidateUserChatListCache(userId);

    return { message: 'Chat deleted successfully' } as ChatMessageResponseDto;
  }

  async generateChatSummary(chatId: string): Promise<SummaryResponseDto> {
    // Get chat metadata from MongoDB
    const chat = await this.chatModel.findById(chatId).select('-messages');

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Get messages from ConversationContext
    const conversationContext = await this.conversationContextModel.findOne({
      userId: chat.userId.toString(),
      sessionId: chatId,
    });

    let messages: ChatMessage[] = [];
    if (conversationContext && conversationContext.messages) {
      messages = conversationContext.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: undefined,
      }));
    }

    // Generate summary using AI
    const conversationText = messages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const summary = await this.aiService.generateDocumentSummary(
      conversationText,
      'chat',
    );

    // Update chat with summary in MongoDB
    chat.summary = summary;
    await chat.save();

    // Invalidate cache
    await this.chatCacheService.invalidateChatCache(chatId);
    await this.chatCacheService.invalidateUserChatListCache(
      chat.userId.toString(),
    );

    return { summary };
  }

  async stopChat(
    userId: string,
    chatId: string,
    reason?: string,
  ): Promise<ChatMessageResponseDto> {
    const chat = await this.chatModel.findOne({
      _id: chatId,
      userId: new Types.ObjectId(userId),
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Try to cancel any active generation for this chat
    const activeGenerations = this.aiService.getActiveGenerationIds();
    const chatGenerationPattern = `gen_${chatId}_`;
    const activeChatGenerations = activeGenerations.filter((id) =>
      id.startsWith(chatGenerationPattern),
    );

    let generationStopped = false;
    activeChatGenerations.forEach((generationId) => {
      if (this.aiService.cancelGeneration(generationId)) {
        generationStopped = true;
        this.logger.log(`Cancelled active generation: ${generationId}`);
      }
    });

    // Update chat status to stopped
    chat.status = 'archived';

    // Add a system message indicating the chat was stopped
    const stopMessage: ChatMessage = {
      role: 'system',
      content: `Chat stopped${reason ? `: ${reason}` : ''}${generationStopped ? ' (Active generation cancelled)' : ''}`,
      timestamp: new Date(),
      metadata: {
        action: 'stop',
        reason,
        generationCancelled: generationStopped,
      },
    };

    chat.messages.push(stopMessage);
    await chat.save();

    // Invalidate cache
    await this.chatCacheService.invalidateChatCache(chatId);
    await this.chatCacheService.invalidateUserChatListCache(userId);

    return { message: 'Chat stopped successfully' } as ChatMessageResponseDto;
  }

  async stopGeneration(
    userId: string,
    chatId: string,
  ): Promise<ChatMessageResponseDto> {
    // Verify the chat belongs to the user
    const chat = await this.chatModel.findOne({
      _id: chatId,
      userId: new Types.ObjectId(userId),
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Find and cancel active generation for this chat
    const activeGenerations = this.aiService.getActiveGenerationIds();
    const chatGenerationPattern = `gen_${chatId}_`;
    const activeChatGenerations = activeGenerations.filter((id) =>
      id.startsWith(chatGenerationPattern),
    );

    if (activeChatGenerations.length === 0) {
      return {
        message: 'No active generation found for this chat',
      } as ChatMessageResponseDto;
    }

    let cancelled = false;
    activeChatGenerations.forEach((generationId) => {
      if (this.aiService.cancelGeneration(generationId)) {
        cancelled = true;
        this.logger.log(`Cancelled generation: ${generationId}`);
      }
    });

    if (cancelled) {
      // Add a system message indicating generation was stopped
      const stopMessage: ChatMessage = {
        role: 'system',
        content: 'AI response generation stopped by user',
        timestamp: new Date(),
        metadata: {
          action: 'stopGeneration',
          reason: 'User requested stop',
        },
      };

      chat.messages.push(stopMessage);
      await chat.save();

      // Update cache
      await this.chatCacheService.cacheChatMessages(chatId, chat.messages);

      return {
        message: 'Generation stopped successfully',
      } as ChatMessageResponseDto;
    }

    return { message: 'Failed to stop generation' } as ChatMessageResponseDto;
  }

  private async getOrCreateConversationContext(
    userId: string,
    sessionId: string,
  ): Promise<ConversationContextDocument> {
    let context = await this.conversationContextModel.findOne({
      userId,
      sessionId,
    });

    if (!context) {
      context = new this.conversationContextModel({
        userId,
        sessionId,
        messages: [],
        context: {},
        messageCount: 0,
        lastUpdated: new Date(),
      });
      await context.save();
    }

    return context;
  }

  private mapChatToResponse(chat: ChatDocument): ChatResponseDto {
    return {
      id: chat._id.toString(),
      title: chat.title,
      messages: chat.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: msg.metadata,
      })),
      context: chat.context,
      status: chat.status,
      tags: chat.tags,
      summary: chat.summary,
      totalTokens: chat.totalTokens,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
  }
}
