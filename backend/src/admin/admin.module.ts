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

@Module({
  imports: [UsersModule, CategoriesModule],
  controllers: [
    AdminUsersController,
    AdminItemsController,
    AdminCategoriesController,
    AdminSettingsController,
    AdminDashboardController,
  ],
  providers: [AdminUsersService, AdminItemsService, AdminDashboardService],
})
export class AdminModule {}
