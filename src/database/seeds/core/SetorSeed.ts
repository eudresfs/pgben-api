import { DataSource } from 'typeorm';

/**
 * Seed para criação dos setores essenciais do sistema
 *
 * Este seed cria os setores básicos necessários para o fluxo de trabalho
 * do sistema de benefícios sociais
 */
export class SetorSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    console.log('Iniciando seed de setores essenciais');

    // Importante: Precisamos executar o SetorSeed após o UnidadeSeed para garantir que a unidade SEMTAS exista

    try {
      // Verificar a estrutura da tabela para confirmar os nomes das colunas
      const tableInfo = await dataSource.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'setor'`
      );
      
      // Mapear nomes de colunas para uso posterior
      const columnNames = tableInfo.map(column => column.column_name);
      console.log(`Colunas encontradas na tabela setor: ${columnNames.join(', ')}`);
      
      // Determinar se a coluna de status é 'ativo' ou 'status'
      const statusColumnName = columnNames.includes('ativo') ? 'ativo' : 'status';
      console.log(`Utilizando coluna de status: ${statusColumnName}`);

      // Buscar o ID da unidade SEMTAS para associar aos setores
      console.log('Buscando ID da unidade SEMTAS...');
      const unidadeSemtas = await dataSource.query(
        `SELECT id FROM unidade WHERE codigo = $1`,
        ['SEMTAS']
      );

      if (unidadeSemtas.length === 0) {
        throw new Error('Unidade SEMTAS não encontrada. Execute o UnidadeSeed primeiro.');
      }

      const unidadeId = unidadeSemtas[0].id;
      console.log(`Unidade SEMTAS encontrada com ID: ${unidadeId}`);

      // Lista de setores básicos para o funcionamento do sistema
      const setoresEssenciais = [
        {
          nome: 'Cadastro Único',
          sigla: 'CADUN',
          descricao: 'Setor responsável pelo cadastro de cidadãos e famílias',
          ativo: true,
        },
        {
          nome: 'Assistência Social',
          sigla: 'ASSSOC',
          descricao: 'Setor responsável pela avaliação social das solicitações',
          ativo: true,
        },
        {
          nome: 'Análise Técnica',
          sigla: 'ANTEC',
          descricao: 'Setor responsável pela análise técnica das solicitações',
          ativo: true,
        },
        {
          nome: 'Diretoria de Benefícios',
          sigla: 'DIRBEN',
          descricao: 'Diretoria responsável pela aprovação final de benefícios',
          ativo: true,
        },
        {
          nome: 'Financeiro',
          sigla: 'FINAN',
          descricao:
            'Setor responsável pelo pagamento e gestão financeira dos benefícios',
          ativo: true,
        },
        {
          nome: 'Ouvidoria',
          sigla: 'OUVID',
          descricao:
            'Setor responsável pelo atendimento de reclamações e sugestões',
          ativo: true,
        },
      ];

      // Inserção de setores no banco de dados
      for (const setor of setoresEssenciais) {
        try {
          const setorExistente = await dataSource.query(
            `SELECT id FROM setor WHERE sigla = $1`,
            [setor.sigla],
          );

          if (setorExistente.length === 0) {
            // Construir a query INSERT dinamicamente com base nas colunas existentes
            await dataSource.query(
              `INSERT INTO setor (nome, sigla, descricao, ${statusColumnName}, unidade_id)
               VALUES ($1, $2, $3, $4, $5)`,
              [setor.nome, setor.sigla, setor.descricao, setor.ativo, unidadeId],
            );
            console.log(`Setor ${setor.nome} criado com sucesso`);
          } else {
            console.log(`Setor ${setor.nome} já existe, atualizando...`);
            // Construir a query UPDATE dinamicamente com base nas colunas existentes
            await dataSource.query(
              `UPDATE setor 
               SET nome = $1, descricao = $2, ${statusColumnName} = $3, unidade_id = $4
               WHERE sigla = $5`,
              [setor.nome, setor.descricao, setor.ativo, unidadeId, setor.sigla],
            );
            console.log(`Setor ${setor.nome} atualizado com sucesso`);
          }
        } catch (error) {
          console.error(`Erro ao processar o setor ${setor.nome}: ${error.message}`);
          // Continua para o próximo setor mesmo se houver erro
        }
      }

      console.log('Seed de setores essenciais concluído com sucesso');
    } catch (error) {
      console.error(`Erro ao executar seed de setores: ${error.message}`);
      throw error; // Re-lança o erro para ser tratado pelo executor
    }
  }
}
