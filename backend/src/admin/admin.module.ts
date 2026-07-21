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

@Module({
  imports: [UsersModule, CategoriesModule],
  controllers: [
    AdminUsersController,
    AdminItemsController,
    AdminCategoriesController,
    AdminSettingsController,
    AdminDashboardController,
    AdminReportsController,
  ],
  providers: [AdminUsersService, AdminItemsService, AdminDashboardService, AdminReportsService],
})
export class AdminModule {}
