import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findActive() {
    return this.prisma.category.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    });
  }

  /** §14 : vue admin, catégories actives et inactives incluses. */
  findAllForAdmin() {
    return this.prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { items: true } } },
    });
  }

  create(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOrThrow(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  /** §14 : suppression refusée si des Monstres sont encore rattachés à la catégorie. */
  async remove(id: string) {
    await this.findOrThrow(id);
    const linkedItems = await this.prisma.item.count({ where: { categoryId: id } });
    if (linkedItems > 0) {
      throw new BadRequestException(
        `Impossible de supprimer : ${linkedItems} Monstre(s) rattaché(s) à cette catégorie.`,
      );
    }
    await this.prisma.category.delete({ where: { id } });
    return { deleted: true };
  }

  private async findOrThrow(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Catégorie introuvable.');
    return category;
  }
}
