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
      // A coluna status na tabela setor é do tipo boolean
      const setoresEssenciais = [
        {
          nome: 'Cadastro Único',
          sigla: 'CADUN',
          descricao: 'Setor responsável pelo cadastro de cidadãos e famílias',
          status: true, // Boolean para a coluna status
        },
        {
          nome: 'Assistência Social',
          sigla: 'ASSSOC',
          descricao: 'Setor responsável pela avaliação social das solicitações',
          status: true, // Boolean para a coluna status
        },
        {
          nome: 'Análise Técnica',
          sigla: 'ANTEC',
          descricao: 'Setor responsável pela análise técnica das solicitações',
          status: true, // Boolean para a coluna status
        },
        {
          nome: 'Diretoria de Benefícios',
          sigla: 'DIRBEN',
          descricao: 'Diretoria responsável pela aprovação final de benefícios',
          status: true, // Boolean para a coluna status
        },
        {
          nome: 'Financeiro',
          sigla: 'FINAN',
          descricao:
            'Setor responsável pelo pagamento e gestão financeira dos benefícios',
          status: true, // Boolean para a coluna status
        },
        {
          nome: 'Ouvidoria',
          sigla: 'OUVID',
          descricao:
            'Setor responsável pelo atendimento de reclamações e sugestões',
          status: true, // Boolean para a coluna status
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
            const colunas: string[] = [];
            const valores: any[] = [];
            let placeholderIndex = 1;
            const placeholders: string[] = [];
            
            // Adicionar colunas obrigatórias
            if (columnNames.includes('nome')) {
              colunas.push('nome');
              valores.push(setor.nome);
              placeholders.push(`$${placeholderIndex++}`);
            }
            
            if (columnNames.includes('sigla')) {
              colunas.push('sigla');
              valores.push(setor.sigla);
              placeholders.push(`$${placeholderIndex++}`);
            }
            
            // Adicionar colunas opcionais se existirem
            if (columnNames.includes('descricao')) {
              colunas.push('descricao');
              valores.push(setor.descricao);
              placeholders.push(`$${placeholderIndex++}`);
            }
            
            // Adicionar coluna de status (sempre status, pois é um booleano)
            colunas.push('status');
            valores.push(setor.status);
            placeholders.push(`$${placeholderIndex++}`);
            
            // Adicionar unidade_id
            if (columnNames.includes('unidade_id')) {
              colunas.push('unidade_id');
              valores.push(unidadeId);
              placeholders.push(`$${placeholderIndex++}`);
            }
            
            // Construir e executar a query
            const insertQuery = `INSERT INTO setor (${colunas.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`;
            console.log(`Executando query: ${insertQuery}`);
            console.log(`Valores: ${JSON.stringify(valores)}`);
            
            const result = await dataSource.query(insertQuery, valores);
            console.log(`Setor ${setor.nome} criado com sucesso. ID: ${result[0]?.id || 'N/A'}`);
          } else {
            console.log(`Setor ${setor.nome} já existe, atualizando...`);
            
            // Construir a query UPDATE dinamicamente
            const updateColumns: string[] = [];
            const updateValues: any[] = [];
            let paramIndex = 1;
            
            // Adicionar colunas para atualização
            if (columnNames.includes('nome')) {
              updateColumns.push(`nome = $${paramIndex++}`);
              updateValues.push(setor.nome);
            }
            
            if (columnNames.includes('descricao')) {
              updateColumns.push(`descricao = $${paramIndex++}`);
              updateValues.push(setor.descricao);
            }
            
            // Adicionar coluna de status
            updateColumns.push(`status = $${paramIndex++}`);
            updateValues.push(setor.status);
            
            // Adicionar unidade_id
            if (columnNames.includes('unidade_id')) {
              updateColumns.push(`unidade_id = $${paramIndex++}`);
              updateValues.push(unidadeId);
            }
            
            // Adicionar a sigla para a cláusula WHERE
            updateValues.push(setor.sigla);
            
            // Construir e executar a query
            const updateQuery = `UPDATE setor SET ${updateColumns.join(', ')} WHERE sigla = $${paramIndex}`;
            console.log(`Executando query: ${updateQuery}`);
            console.log(`Valores: ${JSON.stringify(updateValues)}`);
            
            await dataSource.query(updateQuery, updateValues);
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
