import { getCustomRepository, getRepository } from 'typeorm';

import Category from '../models/Category';
import TransactionRepository from '../repositories/TransactionsRepository';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

interface FormattedTransaction {
  id: string;
  title: string;
  type: string;
  value: number;
  category: Category | undefined;
  created_at: Date;
  updated_at: Date;
}

interface Transaction {
  transactions: FormattedTransaction[] | undefined;
  balance: Balance;
}

class ListTransactionsService {
  public async execute(): Promise<Transaction> {
    console.log('ListTransactionsService acionado');
    const categoryRepository = getRepository(Category);
    const transactionsRepository = getCustomRepository(TransactionRepository);

    const allCategories = await categoryRepository.find();
    const transactions = await transactionsRepository.find();

    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      title: transaction.title,
      type: transaction.type,
      value: transaction.value,
      category_id: transaction.category_id,
      created_at: transaction.created_at,
      updated_at: transaction.updated_at,
      category: allCategories.find(category => category.id === transaction.category_id),
    }));

    console.log(formattedTransactions);
    const balance = await transactionsRepository.getBalance();

    return { transactions: formattedTransactions, balance };
  }
}
export default ListTransactionsService;
