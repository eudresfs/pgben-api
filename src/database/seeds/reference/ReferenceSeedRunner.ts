import { DataSource } from 'typeorm';
import { CategoriaDocumentoSeed } from './CategoriaDocumentoSeed';
import { ModeloDocumentoSeed } from './ModeloDocumentoSeed';
import { RequisitoDocumentoSeed } from './RequisitoDocumentoSeed';

/**
 * Executa todos os seeds de referência (reference) do sistema
 *
 * Este runner executa os seeds na ordem correta para garantir
 * as dependências entre os dados
 */
export class ReferenceSeedRunner {
  public static async run(dataSource: DataSource): Promise<void> {
    console.log('======================================================');
    console.log('Iniciando execução dos seeds de referência (reference)');
    console.log('======================================================');

    try {
      // Executando os seeds na ordem correta
      await CategoriaDocumentoSeed.run(dataSource);
      await ModeloDocumentoSeed.run(dataSource);
      await RequisitoDocumentoSeed.run(dataSource);

      console.log('======================================================');
      console.log('Seeds de referência (reference) executados com sucesso!');
      console.log('======================================================');
    } catch (error) {
      console.error('Erro durante a execução dos seeds de referência:');
      console.error(error);
      throw error;
    }
  }
}
