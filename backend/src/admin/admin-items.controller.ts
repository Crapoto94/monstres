import { Controller, Delete, Get, Param, Patch, Query, UseGuards, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminItemsService } from './admin-items.service';
import { AdminListItemsQueryDto } from './dto/admin-list-items-query.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';

/** §14 : recherche multi-critères, changement de statut, suppression définitive. */
@Controller('admin/items')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminItemsController {
  constructor(private readonly adminItemsService: AdminItemsService) {}

  @Get()
  findAll(@Query() query: AdminListItemsQueryDto) {
    return this.adminItemsService.findMany(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminItemsService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateItemStatusDto) {
    return this.adminItemsService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminItemsService.remove(id);
  }
}
