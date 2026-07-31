import type { Due } from '../types';
import type { DueRepository } from '../types/repositories';
import { BaseAsyncStorageRepository } from './base.storage';

export class AsyncStorageDueRepository
  extends BaseAsyncStorageRepository<Due>
  implements DueRepository {

  constructor() {
    super('dues');
  }
}
