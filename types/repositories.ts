import type {
  Transaction,
  Category,
  Due,
  SavingsItem,
  UserProfile,
  TransactionType,
} from './index';

export interface Repository<T, TID = string> {
  getAll(): Promise<T[]>;
  getById(id: TID): Promise<T | undefined>;
  upsert(entity: T): Promise<void>;
  upsertBulk(entities: T[]): Promise<void>;
  deleteById(id: TID): Promise<void>;
}

export interface TransactionRepository extends Repository<Transaction> {
  getByDateRange(start: string, end: string): Promise<Transaction[]>;
}

export interface CategoryRepository extends Repository<Category> {
  getByType(type: TransactionType): Promise<Category[]>;
}

export interface DueRepository extends Repository<Due> {}

export interface SavingsItemRepository extends Repository<SavingsItem> {}

export interface ProfileRepository extends Repository<UserProfile> {}
