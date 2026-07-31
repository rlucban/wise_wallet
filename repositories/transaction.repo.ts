import type { Transaction } from '../types';
import type { TransactionRepository } from '../types/repositories';
import { BaseAsyncStorageRepository } from './base.storage';

export class AsyncStorageTransactionRepository
  extends BaseAsyncStorageRepository<Transaction>
  implements TransactionRepository {

  constructor() {
    super('transactions');
  }

  async getByDateRange(start: string, end: string): Promise<Transaction[]> {
    const items = await this.getAll();
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    return items.filter(t => {
      const tMs = new Date(t.date).getTime();
      return tMs >= startMs && tMs <= endMs;
    });
  }
}
