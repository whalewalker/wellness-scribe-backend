import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  SendMessageDto,
  UpdateChatDto,
  ChatResponseDto,
  ChatListResponseDto,
  SummaryResponseDto,
  ChatMessageResponseDto,
  StopChatDto,
  StopGenerationDto,
} from '../dto/chat.dto';
import { CurrentUser } from '../decorators';
import { UserDocument } from '../schemas/user.schema';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('message')
  @ApiOperation({
    summary: 'Send a message to AI',
    description:
      'Sends a message to the AI assistant and receives a response. If no chatId is provided, a new chat will be automatically created with the first message. You can optionally include tags and context when starting a new chat.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Message sent successfully. Returns the chat with all messages including the new user message and AI response.',
    type: ChatResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Chat not found (when providing an existing chatId)',
  })
  async sendMessage(
    @CurrentUser('_id') userId: string,
    @Body() sendMessageDto: SendMessageDto,
  ): Promise<ChatResponseDto> {
    return this.chatService.sendMessage(userId, sendMessageDto);
  }

  @Post('stop')
  @ApiOperation({
    summary: 'Stop an active chat',
    description:
      'Stops an active chat and archives it. The AI will respect this stop signal and not continue the conversation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat stopped successfully',
    type: ChatMessageResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Chat not found',
  })
  async stopChat(
    @CurrentUser('_id') userId: string,
    @Body() stopChatDto: StopChatDto,
  ): Promise<ChatMessageResponseDto> {
    return this.chatService.stopChat(
      userId,
      stopChatDto.chatId,
      stopChatDto.reason,
    );
  }

  @Post('stop-generation')
  @ApiOperation({
    summary: 'Stop active AI generation',
    description:
      'Stops an active AI response generation for a specific chat without archiving the chat. Useful for implementing a stop button during AI response generation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Generation stopped successfully',
    type: ChatMessageResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Chat not found or no active generation',
  })
  async stopGeneration(
    @CurrentUser('_id') userId: string,
    @Body() stopGenerationDto: StopGenerationDto,
  ): Promise<ChatMessageResponseDto> {
    return this.chatService.stopGeneration(userId, stopGenerationDto.chatId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get user chats',
    description:
      'Retrieves all chat conversations for the authenticated user, sorted by most recent.',
  })
  @ApiResponse({
    status: 200,
    description: 'Chats retrieved successfully',
    type: [ChatListResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getUserChats(
    @CurrentUser('_id') userId: string,
  ): Promise<ChatListResponseDto[]> {
    return this.chatService.getUserChats(userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get chat by ID',
    description:
      'Retrieves a specific chat conversation with all messages and context.',
  })
  @ApiParam({
    name: 'id',
    description: 'Chat ID',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat retrieved successfully',
    type: ChatResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Chat not found',
  })
  async getChatById(
    @CurrentUser('_id') userId: string,
    @Param('id') chatId: string,
  ): Promise<ChatResponseDto> {
    return this.chatService.getChatById(userId, chatId);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update chat',
    description: 'Updates chat information such as title, tags, and status.',
  })
  @ApiParam({
    name: 'id',
    description: 'Chat ID',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat updated successfully',
    type: ChatResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Chat not found',
  })
  async updateChat(
    @CurrentUser('_id') userId: string,
    @Param('id') chatId: string,
    @Body() updateChatDto: UpdateChatDto,
  ): Promise<ChatResponseDto> {
    return this.chatService.updateChat(userId, chatId, updateChatDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete chat',
    description:
      'Permanently deletes a chat conversation and all its messages.',
  })
  @ApiParam({
    name: 'id',
    description: 'Chat ID',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat deleted successfully',
    type: ChatMessageResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Chat not found',
  })
  async deleteChat(
    @CurrentUser('_id') userId: string,
    @Param('id') chatId: string,
  ): Promise<ChatMessageResponseDto> {
    return this.chatService.deleteChat(userId, chatId);
  }

  @Post(':id/summary')
  @ApiOperation({
    summary: 'Generate chat summary',
    description:
      'Generates an AI-powered summary of the chat conversation for quick reference.',
  })
  @ApiParam({
    name: 'id',
    description: 'Chat ID',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiResponse({
    status: 200,
    description: 'Summary generated successfully',
    type: SummaryResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Chat not found',
  })
  async generateChatSummary(
    @CurrentUser() user: UserDocument,
    @Param('id') chatId: string,
  ): Promise<SummaryResponseDto> {
    return this.chatService.generateChatSummary(chatId);
  }
}
