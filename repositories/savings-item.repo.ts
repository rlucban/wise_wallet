import type { SavingsItem } from '../types';
import type { SavingsItemRepository } from '../types/repositories';
import { BaseAsyncStorageRepository } from './base.storage';

export class AsyncStorageSavingsItemRepository
  extends BaseAsyncStorageRepository<SavingsItem>
  implements SavingsItemRepository {

  constructor() {
    super('savingsItems');
  }
}
