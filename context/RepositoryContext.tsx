import React, { createContext, useContext, useMemo, ReactNode } from "react";
import type {
  TransactionRepository,
  CategoryRepository,
  DueRepository,
  SavingsItemRepository,
  SubscriptionRepository,
  AgendaRepository,
  PaymentMethodRepository,
  ProfileRepository,
} from "../types/repositories";
import { AsyncStorageTransactionRepository } from "../repositories/transaction.repo";
import { AsyncStorageCategoryRepository } from "../repositories/category.repo";
import { AsyncStorageDueRepository } from "../repositories/due.repo";
import { AsyncStorageSavingsItemRepository } from "../repositories/savings-item.repo";
import { AsyncStorageSubscriptionRepository } from "../repositories/subscription.repo";
import { AsyncStorageAgendaRepository } from "../repositories/agenda.repo";
import { AsyncStoragePaymentMethodRepository } from "../repositories/payment-method.repo";
import { AsyncStorageProfileRepository } from "../repositories/profile.repo";

export interface Repositories {
  transactions: TransactionRepository;
  categories: CategoryRepository;
  dues: DueRepository;
  savingsItems: SavingsItemRepository;
  subscriptions: SubscriptionRepository;
  agendas: AgendaRepository;
  paymentMethods: PaymentMethodRepository;
  profiles: ProfileRepository;
}

const RepositoryContext = createContext<Repositories | undefined>(undefined);

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const repos = useMemo<Repositories>(() => ({
    transactions: new AsyncStorageTransactionRepository(),
    categories: new AsyncStorageCategoryRepository(),
    dues: new AsyncStorageDueRepository(),
    savingsItems: new AsyncStorageSavingsItemRepository(),
    subscriptions: new AsyncStorageSubscriptionRepository(),
    agendas: new AsyncStorageAgendaRepository(),
    paymentMethods: new AsyncStoragePaymentMethodRepository(),
    profiles: new AsyncStorageProfileRepository(),
  }), []);

  return (
    <RepositoryContext.Provider value={repos}>
      {children}
    </RepositoryContext.Provider>
  );
}

export function useRepositories(): Repositories {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error("useRepositories must be used within a RepositoryProvider");
  }
  return context;
}
