import csvParse from 'csv-parse';
import fs from 'fs';
import { getRepository, In, getCustomRepository } from 'typeorm';

import Transaction from '../models/Transaction';
import TransactionRepository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';
import Category from '../models/Category';

interface TransactionCSV {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute(file: string): Promise<Transaction[]> {
    const readCSVStream = fs.createReadStream(file);
    const parser = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });
    const parseCSV = readCSVStream.pipe(parser);

    const transactions: TransactionCSV[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, value, type, category] = line;
      if (!title || !type || !value) {
        throw new AppError('All transaction data needs to be informed');
      }
      categories.push(category);
      transactions.push({ title, value, type, category });
    });
    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    // verificando a existencia das categorias no banco
    const categoriesRepository = getRepository(Category);
    const categoriesExist = await categoriesRepository.find({
      where: { title: In(categories) },
    });
    const existentCategoriesTitles = categoriesExist.map(
      (category: Category) => {
        return category.title;
      },
    );

    // mapeando categorias que nao existem
    const categoriesNotExistent = categories
      .filter(category => {
        return !existentCategoriesTitles.includes(category);
      }) // removendo as repetidas
      .filter((item, index, arraySelf) => arraySelf.indexOf(item) === index);

    // inserir categoria no banco com Bulk Insertion
    const categoriesCreated = categoriesRepository.create(
      categoriesNotExistent.map(newCategory => ({ title: newCategory })),
    );
    await categoriesRepository.save(categoriesCreated);

    // criando a transação
    const transactionsRepository = getCustomRepository(TransactionRepository);

    const allCategories = [...categoriesCreated, ...categoriesExist];

    const transactionsCreated = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        value: transaction.value,
        type: transaction.type,
        category: allCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );
    await transactionsRepository.save(transactionsCreated);
    await fs.promises.unlink(file);

    console.log('---------------CONSOLE-------------------');
    console.log('Criadas', transactionsCreated);

    return transactionsCreated;
  }
}

export default ImportTransactionsService;
