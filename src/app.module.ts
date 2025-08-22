import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { WellnessDocumentsModule } from './wellness-documents/wellness-documents.module';
import { AiModule } from './ai/ai.module';
import { RAGModule } from './rag/rag.module';
import { WellnessCoachingModule } from './wellness-coaching/wellness-coaching.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.mongodb.uri'),
      }),
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        store: require('cache-manager-redis-store'), // eslint-disable-line @typescript-eslint/no-require-imports
        host:
          configService.get<string>('database.redis.url')?.split(':')[0] ||
          'localhost',
        port: parseInt(
          configService
            .get<string>('database.redis.url')
            ?.split(':')[1]
            ?.split('/')[0] || '6379',
        ),
        ttl: 60 * 60 * 24, // 24 hours
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('rateLimit.ttl') || 60,
            limit: configService.get<number>('rateLimit.limit') || 10,
          },
        ],
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    ChatModule,
    WellnessDocumentsModule,
    AiModule,
    RAGModule,
    WellnessCoachingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
