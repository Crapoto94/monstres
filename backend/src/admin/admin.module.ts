import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { CategoriesModule } from '../categories/categories.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminItemsController } from './admin-items.controller';
import { AdminItemsService } from './admin-items.service';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from './admin-reports.service';
import { AdminSqlController } from './admin-sql.controller';
import { AdminSqlService } from './admin-sql.service';
import { AdminTutorialController } from './admin-tutorial.controller';
import { AdminEmailTemplatesController } from './admin-email-templates.controller';
import { EmailTemplatesModule } from '../email-templates/email-templates.module';
import { AdminAuditController } from './admin-audit.controller';
import { AdminAuditService } from './admin-audit.service';
import { AdminEmailLogController } from './admin-email-log.controller';
import { AdminEmailLogService } from './admin-email-log.service';
import { AdminWhatsAppLogController } from './admin-whatsapp-log.controller';
import { AdminWhatsAppLogService } from './admin-whatsapp-log.service';
import { AdminImportLogController } from './admin-import-log.controller';
import { AdminImportLogService } from './admin-import-log.service';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminNewsletterController } from './admin-newsletter.controller';
import { AdminNewsletterService } from './admin-newsletter.service';
import { AdminCommentsController } from './admin-comments.controller';
import { AdminCommentsService } from './admin-comments.service';
import { AdminTestEmailController } from './admin-test-email.controller';
import { AdminBackupController } from './admin-backup.controller';
import { BackupModule } from '../backup/backup.module';
import { AdminFilesController } from './admin-files.controller';
import { AdminFilesService } from './admin-files.service';

@Module({
  imports: [UsersModule, CategoriesModule, EmailTemplatesModule, BackupModule],
  controllers: [
    AdminUsersController,
    AdminItemsController,
    AdminCategoriesController,
    AdminSettingsController,
    AdminDashboardController,
    AdminReportsController,
    AdminSqlController,
    AdminTutorialController,
    AdminEmailTemplatesController,
    AdminAuditController,
    AdminEmailLogController,
    AdminWhatsAppLogController,
    AdminImportLogController,
    AdminAnalyticsController,
    AdminNewsletterController,
    AdminCommentsController,
    AdminTestEmailController,
    AdminBackupController,
    AdminFilesController,
  ],
  providers: [
    AdminUsersService,
    AdminItemsService,
    AdminDashboardService,
    AdminReportsService,
    AdminSqlService,
    AdminAuditService,
    AdminEmailLogService,
    AdminWhatsAppLogService,
    AdminImportLogService,
    AdminAnalyticsService,
    AdminNewsletterService,
    AdminCommentsService,
    AdminFilesService,
  ],
})
export class AdminModule {}
