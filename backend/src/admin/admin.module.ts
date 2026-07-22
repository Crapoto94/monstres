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

@Module({
  imports: [UsersModule, CategoriesModule, EmailTemplatesModule],
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
  ],
  providers: [
    AdminUsersService,
    AdminItemsService,
    AdminDashboardService,
    AdminReportsService,
    AdminSqlService,
    AdminAuditService,
    AdminEmailLogService,
  ],
})
export class AdminModule {}
