import type { Subscription } from '../types';
import type { SubscriptionRepository } from '../types/repositories';
import { BaseAsyncStorageRepository } from './base.storage';

export class AsyncStorageSubscriptionRepository
  extends BaseAsyncStorageRepository<Subscription>
  implements SubscriptionRepository {

  constructor() {
    super('subscriptions');
  }
}
