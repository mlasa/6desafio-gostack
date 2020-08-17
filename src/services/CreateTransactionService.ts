// import AppError from '../errors/AppError';

import { getRepository, getCustomRepository } from 'typeorm';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import transactionsRouter from '../routes/transactions.routes';
import TransactionRepository from '../repositories/TransactionsRepository';

import AppError from '../errors/AppError';

interface RequestDTO {
  title: string;
  value: number;
  type: 'outcome' | 'income';
  category: string;
}

class CreateTransactionService {
  public async execute({ title, value, type, category }: RequestDTO): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionRepository);
    const categoryRepository = getRepository(Category);

    // verificando saldo
    if (type === 'outcome') {
      const balance = await transactionsRepository.getBalance();
      if (balance.total < value) throw new AppError('Balance is not sufficient', 400);
    }

    // checando existencia da categoria
    let categoryExists = await categoryRepository.findOne({
      where: { title: category },
    });

    //nao existe...criando a categoria
    if (!categoryExists) {
      categoryExists = categoryRepository.create({
        title: category,
      });
      await categoryRepository.save(categoryExists);
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: categoryExists.id
    })
    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
