import type { Agenda } from '../types';
import type { AgendaRepository } from '../types/repositories';
import { BaseAsyncStorageRepository } from './base.storage';

export class AsyncStorageAgendaRepository
  extends BaseAsyncStorageRepository<Agenda>
  implements AgendaRepository {

  constructor() {
    super('agendas');
  }
}
