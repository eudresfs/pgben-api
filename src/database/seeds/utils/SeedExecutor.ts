import { DataSource } from 'typeorm';
import { CoreSeedRunner } from '../core/CoreSeedRunner';
import { ReferenceSeedRunner } from '../reference/ReferenceSeedRunner';

/**
 * Utilidade para execução organizada dos seeds
 *
 * Esta classe permite executar os seeds de forma organizada,
 * respeitando as dependências entre eles e permitindo
 * a seleção do ambiente de execução
 */
export class SeedExecutor {
  private dataSource: DataSource;
  private ambiente: string;

  constructor(dataSource: DataSource, ambiente: string = 'development') {
    this.dataSource = dataSource;
    this.ambiente = ambiente;
  }

  /**
   * Executa todos os seeds para o ambiente especificado
   *
   * @param forcar Se true, executa mesmo se o ambiente for production
   */
  public async executarTodosPorAmbiente(
    forcar: boolean = false,
  ): Promise<void> {
    if (this.ambiente === 'production' && !forcar) {
      throw new Error(
        'Para executar seeds em ambiente de produção, é necessário usar a flag forcar=true',
      );
    }

    console.log(
      `=== Iniciando execução de seeds para ambiente: ${this.ambiente} ===`,
    );

    try {
      // Sempre executamos os seeds essenciais (core)
      await this.executarSeedsCore();

      // Executamos os seeds de referência em ambientes que não são de produção ou se forçado
      if (this.ambiente !== 'production' || forcar) {
        await this.executarSeedsReferencia();
      }

      // Executamos os seeds de desenvolvimento apenas em ambiente de desenvolvimento
      if (this.ambiente === 'development') {
        await this.executarSeedsDevelopment();
      }

      console.log(
        `=== Execução de seeds para ambiente ${this.ambiente} concluída com sucesso ===`,
      );
    } catch (error) {
      console.error(
        `=== Erro ao executar seeds para ambiente ${this.ambiente} ===`,
      );
      console.error(error);
      throw error;
    }
  }

  /**
   * Executa apenas os seeds essenciais (core)
   */
  public async executarSeedsCore(): Promise<void> {
    try {
      await CoreSeedRunner.run(this.dataSource);
    } catch (error) {
      console.error('Erro ao executar seeds core:', error);
      throw error;
    }
  }

  /**
   * Executa apenas os seeds de referência
   */
  public async executarSeedsReferencia(): Promise<void> {
    try {
      await ReferenceSeedRunner.run(this.dataSource);
    } catch (error) {
      console.error('Erro ao executar seeds de referência:', error);
      throw error;
    }
  }

  /**
   * Executa apenas os seeds de desenvolvimento
   */
  public async executarSeedsDevelopment(): Promise<void> {
    if (this.ambiente === 'production') {
      throw new Error(
        'Seeds de desenvolvimento não devem ser executados em ambiente de produção',
      );
    }
  }

  /**
   * Factory para criar uma instância do executor de seeds
   *
   * @param dataSource Conexão com o banco de dados
   * @param ambiente Ambiente de execução (development, test, staging, production)
   */
  public static criarExecutor(
    dataSource: DataSource,
    ambiente: string = 'development',
  ): SeedExecutor {
    return new SeedExecutor(dataSource, ambiente);
  }
}
