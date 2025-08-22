import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health Check')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Health check endpoint',
    description:
      'Returns a simple health check message to verify the API is running.',
  })
  @ApiResponse({
    status: 200,
    description: 'API is running successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Wellness Scribe API is running',
        },
        version: {
          type: 'string',
          example: '1.0.0',
        },
        timestamp: {
          type: 'string',
          example: '2024-01-01T12:00:00.000Z',
        },
      },
    },
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
