import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

class CreateTutorialPageDto {
  @IsInt()
  order: number;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsBoolean()
  active: boolean;
}

class UpdateTutorialPageDto {
  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@Controller('admin/tutorial')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminTutorialController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll() {
    return this.prisma.tutorialPage.findMany({ orderBy: { order: 'asc' } });
  }

  @Post()
  create(@Body() dto: CreateTutorialPageDto) {
    return this.prisma.tutorialPage.create({ data: dto });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTutorialPageDto) {
    return this.prisma.tutorialPage.update({ where: { id }, data: dto });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.prisma.tutorialPage.delete({ where: { id } });
  }

  @Post('reorder')
  reorder(@Body() body: { ids: string[] }) {
    return this.prisma.$transaction(
      body.ids.map((id, index) =>
        this.prisma.tutorialPage.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
  }
}
