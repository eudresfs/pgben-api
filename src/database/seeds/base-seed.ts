import { DataSource } from 'typeorm';
import { Seeder } from './seeder.interface';

/**
 * Classe base abstrata para seeds
 *
 * Implementa funcionalidades comuns a todos os seeds:
 * - Verificação de estrutura de tabela
 * - Tratamento de erros em dois níveis
 * - Detecção automática de colunas
 * - Adaptação a diferentes convenções de nomenclatura
 */
export abstract class BaseSeed implements Seeder {
  /**
   * Método principal que executa o seed
   * @param dataSource Conexão com o banco de dados
   */
  public async run(dataSource: DataSource): Promise<void> {
    console.log(`Iniciando seed: ${this.getNome()}`);

    try {
      // Verificar estrutura das tabelas
      await this.verificarEstruturaDasTabelas(dataSource);

      // Executar o seed
      await this.executarSeed(dataSource);

      console.log(`Seed ${this.getNome()} concluído com sucesso`);
    } catch (error: any) {
      console.error(`Erro global no seed ${this.getNome()}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retorna o nome do seed para logs
   */
  protected abstract getNome(): string;

  /**
   * Implementação específica do seed
   * @param dataSource Conexão com o banco de dados
   */
  protected abstract executarSeed(dataSource: DataSource): Promise<void>;

  /**
   * Verifica a estrutura das tabelas necessárias para o seed
   * @param dataSource Conexão com o banco de dados
   */
  protected abstract verificarEstruturaDasTabelas(
    dataSource: DataSource,
  ): Promise<void>;

  /**
   * Obtém informações sobre as colunas de uma tabela
   * @param dataSource Conexão com o banco de dados
   * @param tabela Nome da tabela
   * @returns Objeto com informações sobre as colunas da tabela
   */
  protected async obterInformacoesTabela(
    dataSource: DataSource,
    tabela: string,
  ): Promise<{
    colunas: string[];
    statusColumnName: string;
  }> {
    console.log(`Verificando estrutura da tabela ${tabela}...`);

    const tableInfo = await dataSource.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = $1`,
      [tabela],
    );

    if (tableInfo.length === 0) {
      throw new Error(`Tabela ${tabela} não encontrada no banco de dados`);
    }

    const colunas = tableInfo.map((col: any) => col.column_name);
    console.log(
      `Colunas encontradas na tabela ${tabela}: ${colunas.join(', ')}`,
    );

    // Determinar o nome da coluna de status (pode ser 'ativo' ou 'status')
    const statusColumnName = colunas.includes('ativo') ? 'ativo' : 'status';
    console.log(
      `Utilizando coluna de status para ${tabela}: ${statusColumnName}`,
    );

    return { colunas, statusColumnName };
  }

  /**
   * Executa uma operação com tratamento de erros
   * @param descricao Descrição da operação para logs
   * @param operacao Função que realiza a operação
   */
  protected async executarComTratamento<T>(
    descricao: string,
    operacao: () => Promise<T>,
  ): Promise<T | null> {
    try {
      const resultado = await operacao();
      console.log(`Operação "${descricao}" concluída com sucesso`);
      return resultado;
    } catch (error: any) {
      console.error(`Erro na operação "${descricao}": ${error.message}`);
      return null;
    }
  }

  /**
   * Constrói uma query de inserção dinâmica com base nas colunas existentes
   * @param tabela Nome da tabela
   * @param colunas Array com nomes das colunas
   * @param valores Array com valores correspondentes
   * @returns Query SQL para inserção
   */
  protected construirQueryInsercao(
    tabela: string,
    colunas: string[],
    valores: any[],
  ): { query: string; params: any[] } {
    const placeholders = colunas.map((_, index) => `$${index + 1}`);

    const query = `
      INSERT INTO ${tabela} (
        ${colunas.join(', ')}
      )
      VALUES (${placeholders.join(', ')})
    `;

    return { query, params: valores };
  }

  /**
   * Constrói uma query de atualização dinâmica com base nas colunas existentes
   * @param tabela Nome da tabela
   * @param colunas Array com nomes das colunas a atualizar
   * @param valores Array com valores correspondentes
   * @param condicao Condição WHERE (ex: "id = $1")
   * @param valoresCondicao Valores para a condição
   * @returns Query SQL para atualização
   */
  protected construirQueryAtualizacao(
    tabela: string,
    colunas: string[],
    valores: any[],
    condicao: string,
    valoresCondicao: any[],
  ): { query: string; params: any[] } {
    // Criar os placeholders para os valores ($1, $2, etc.)
    const sets = colunas.map((coluna, index) => `${coluna} = $${index + 1}`);

    // Ajustar os placeholders da condição para continuar a sequência
    const condicaoAjustada = condicao.replace(
      /\$(\d+)/g,
      (_, num) => `$${parseInt(num) + valores.length}`,
    );

    const query = `
      UPDATE ${tabela}
      SET ${sets.join(', ')}
      WHERE ${condicaoAjustada}
    `;

    return { query, params: [...valores, ...valoresCondicao] };
  }
}
