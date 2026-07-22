import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminSqlService } from './admin-sql.service';
import { ExecSqlDto } from './dto/exec-sql.dto';

/** Console SQL réservée SUPER_ADMIN (§14). */
@Controller('admin/sql')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminSqlController {
  constructor(private readonly adminSqlService: AdminSqlService) {}

  @Post('tables')
  listTables() {
    return this.adminSqlService.listTables();
  }

  @Post('exec')
  exec(@Body() dto: ExecSqlDto) {
    return this.adminSqlService.exec(dto.sql);
  }
}
