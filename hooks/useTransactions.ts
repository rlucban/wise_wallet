import { useTransactionsData, useTransactionsActions, useTransactionsContext } from "../context/TransactionsContext";

export function useTransactions() {
  return useTransactionsContext();
}

export { useTransactionsData, useTransactionsActions };
