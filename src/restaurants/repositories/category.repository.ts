import { EntityRepository, Repository } from 'typeorm';
import { Category } from '../entities/category.entity';

@EntityRepository(Category)
export class CategoryRepository extends Repository<Category> {
  async getOrCreate(categoryName: string) {
    const trimmedName = categoryName.trim().toLowerCase();
    const slug = trimmedName.replace(/ /g, '-');
    let category = await this.findOne({ slug });
    if (!category) {
      category = await this.save(this.create({ slug, name: categoryName }));
    }
    return category;
  }
}
