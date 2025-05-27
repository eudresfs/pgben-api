import { DataSource } from 'typeorm';

/**
 * Seed para criação das unidades essenciais do sistema
 *
 * Este seed cria as unidades básicas necessárias para o funcionamento
 * do sistema de benefícios sociais
 */
export class UnidadeSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    console.log('Iniciando seed de unidades essenciais');

    try {
      // Verificar a estrutura da tabela para confirmar os nomes das colunas
      const tableInfo = await dataSource.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'unidade'`
      );
      
      // Mapear nomes de colunas para uso posterior
      const columnNames = tableInfo.map(column => column.column_name);
      console.log(`Colunas encontradas na tabela unidade: ${columnNames.join(', ')}`);
      
      // Determinar se a coluna de status é 'ativo' ou 'status'
      const statusColumnName = columnNames.includes('ativo') ? 'ativo' : 'status';
      console.log(`Utilizando coluna de status: ${statusColumnName}`);

      // Lista de unidades básicas para o funcionamento do sistema
      const unidadesEssenciais = [
        {
          nome: 'Secretaria',
          codigo: 'SEMTAS',
          endereco: 'Av. Principal, 1000, Centro',
          telefone: '(00) 0000-0000',
          email: 'semtas@pgben.gov.br',
          responsavel_matricula: 'CG001',
          tipo: 'administrativa',
          ativo: true,
        },
        {
          nome: 'CRAS Central',
          codigo: 'CRAS01',
          endereco: 'Rua das Flores, 123, Centro',
          telefone: '(00) 0000-0001',
          email: 'cras.central@pgben.gov.br',
          responsavel_matricula: 'CR001',
          tipo: 'cras',
          ativo: true,
        },
        {
          nome: 'CREAS Regional',
          codigo: 'CREAS01',
          endereco: 'Av. dos Direitos, 456, Centro',
          telefone: '(00) 0000-0002',
          email: 'creas.regional@pgben.gov.br',
          responsavel_matricula: 'CE001',
          tipo: 'creas',
          ativo: true,
        },
        {
          nome: 'Centro de Referência',
          codigo: 'CR01',
          endereco: 'Rua da Cidadania, 789, Zona Norte',
          telefone: '(00) 0000-0003',
          email: 'centro.referencia@pgben.gov.br',
          responsavel_matricula: 'CF001',
          tipo: 'centro_referencia',
          ativo: true,
        },
      ];

      // Inserção de unidades no banco de dados
      for (const unidade of unidadesEssenciais) {
        try {
          const unidadeExistente = await dataSource.query(
            `SELECT id FROM unidade WHERE codigo = $1`,
            [unidade.codigo],
          );

          if (unidadeExistente.length === 0) {
            // Construir a query INSERT dinamicamente com base nas colunas existentes
            await dataSource.query(
              `INSERT INTO unidade (nome, codigo, endereco, telefone, email, responsavel_matricula, tipo, ${statusColumnName})
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                unidade.nome,
                unidade.codigo,
                unidade.endereco,
                unidade.telefone,
                unidade.email,
                unidade.responsavel_matricula,
                unidade.tipo,
                unidade.ativo,
              ],
            );
            console.log(`Unidade ${unidade.nome} criada com sucesso`);
          } else {
            console.log(`Unidade ${unidade.nome} já existe, atualizando...`);
            // Corrigir a ordem dos parâmetros na query UPDATE
            await dataSource.query(
              `UPDATE unidade 
               SET nome = $1, endereco = $2, telefone = $3, email = $4, responsavel_matricula = $5, tipo = $6, ${statusColumnName} = $7
               WHERE codigo = $8`,
              [
                unidade.nome,
                unidade.endereco,
                unidade.telefone,
                unidade.email,
                unidade.responsavel_matricula,
                unidade.tipo,
                unidade.ativo,
                unidade.codigo,
              ],
            );
            console.log(`Unidade ${unidade.nome} atualizada com sucesso`);
          }
        } catch (error) {
          console.error(`Erro ao processar a unidade ${unidade.nome}: ${error.message}`);
          // Continua para a próxima unidade mesmo se houver erro
        }
      }

      console.log('Seed de unidades essenciais concluído com sucesso');
    } catch (error) {
      console.error(`Erro ao executar seed de unidades: ${error.message}`);
      throw error; // Re-lança o erro para ser tratado pelo executor
    }
  }
}
