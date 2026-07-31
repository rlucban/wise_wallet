import type { Category, TransactionType } from '../types';
import type { CategoryRepository } from '../types/repositories';
import { BaseAsyncStorageRepository } from './base.storage';

export class AsyncStorageCategoryRepository
  extends BaseAsyncStorageRepository<Category>
  implements CategoryRepository {

  constructor() {
    super('categories');
  }

  async getByType(type: TransactionType): Promise<Category[]> {
    const items = await this.getAll();
    return items.filter(c => c.type === type);
  }
}
