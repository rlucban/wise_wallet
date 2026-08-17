import type { PaymentMethodInfo } from '../types';
import type { PaymentMethodRepository } from '../types/repositories';
import { BaseAsyncStorageRepository } from './base.storage';

export class AsyncStoragePaymentMethodRepository
  extends BaseAsyncStorageRepository<PaymentMethodInfo>
  implements PaymentMethodRepository {

  constructor() {
    super('paymentMethods');
  }
}
