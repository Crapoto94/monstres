import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { SettingsModule } from './settings/settings.module';
import { EmailModule } from './email/email.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { CategoriesModule } from './categories/categories.module';
import { ImageModule } from './images/image.module';
import { ItemsModule } from './items/items.module';
import { ReservationsModule } from './reservations/reservations.module';
import { ScoringModule } from './scoring/scoring.module';
import { VotesModule } from './votes/votes.module';
import { CommentsModule } from './comments/comments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ReportsModule } from './reports/reports.module';
import { TutorialModule } from './tutorial/tutorial.module';
import { EmailTemplatesModule } from './email-templates/email-templates.module';
import { LegalModule } from './legal/legal.module';
import { ShareModule } from './share/share.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    PrismaModule,
    SettingsModule,
    EmailModule,
    WhatsAppModule,
    ImageModule,
    ScoringModule,
    NotificationsModule,
    HealthModule,
    UsersModule,
    AuthModule,
    AdminModule,
    CategoriesModule,
    SubscriptionsModule,
    ItemsModule,
    ReservationsModule,
    VotesModule,
    CommentsModule,
    ReportsModule,
    TutorialModule,
    EmailTemplatesModule,
    LegalModule,
    ShareModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
