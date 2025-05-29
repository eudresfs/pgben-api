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
      // Valores válidos para tipo_unidade: "cras", "creas", "centro_pop", "semtas", "outro"
      // Valores válidos para status_unidade: "ativo", "inativo"
      const unidadesEssenciais = [
        {
          nome: 'Secretaria',
          codigo: 'SEMTAS',
          endereco: 'Av. Principal, 1000, Centro',
          telefone: '(00) 0000-0000',
          email: 'semtas@pgben.gov.br',
          responsavel_matricula: 'CG001',
          tipo: 'semtas', // Corrigido para um valor válido do enum tipo_unidade
          status: 'ativo', // Corrigido para um valor válido do enum status_unidade
        },
        {
          nome: 'CRAS Central',
          codigo: 'CRAS01',
          endereco: 'Rua das Flores, 123, Centro',
          telefone: '(00) 0000-0001',
          email: 'cras.central@pgben.gov.br',
          responsavel_matricula: 'CR001',
          tipo: 'cras',
          status: 'ativo', // Corrigido para um valor válido do enum status_unidade
        },
        {
          nome: 'CREAS Regional',
          codigo: 'CREAS01',
          endereco: 'Av. dos Direitos, 456, Centro',
          telefone: '(00) 0000-0002',
          email: 'creas.regional@pgben.gov.br',
          responsavel_matricula: 'CE001',
          tipo: 'creas',
          status: 'ativo', // Corrigido para um valor válido do enum status_unidade
        },
        {
          nome: 'Centro de Referência',
          codigo: 'CR01',
          endereco: 'Rua da Cidadania, 789, Zona Norte',
          telefone: '(00) 0000-0003',
          email: 'centro.referencia@pgben.gov.br',
          responsavel_matricula: 'CF001',
          tipo: 'outro', // Corrigido para um valor válido do enum tipo_unidade (não existe centro_referencia)
          status: 'ativo', // Corrigido para um valor válido do enum status_unidade
        },
      ];

      // Inserção de unidades no banco de dados
      for (const unidade of unidadesEssenciais) {
        try {
          // Verificar se a unidade já existe
          const unidadeExistente = await dataSource.query(
            `SELECT id FROM unidade WHERE codigo = $1`,
            [unidade.codigo],
          );

          if (unidadeExistente.length === 0) {
            // Construir a query INSERT dinamicamente com base nas colunas existentes
            // Primeiro, vamos construir a lista de colunas e valores
            const colunas: string[] = [];
            const valores: any[] = [];
            let placeholderIndex = 1;
            const placeholders: string[] = [];
            
            // Adicionar colunas obrigatórias
            if (columnNames.includes('nome')) {
              colunas.push('nome');
              valores.push(unidade.nome);
              placeholders.push(`$${placeholderIndex++}`);
            }
            
            if (columnNames.includes('codigo')) {
              colunas.push('codigo');
              valores.push(unidade.codigo);
              placeholders.push(`$${placeholderIndex++}`);
            }
            
            // Adicionar colunas opcionais se existirem
            if (columnNames.includes('endereco')) {
              colunas.push('endereco');
              valores.push(unidade.endereco);
              placeholders.push(`$${placeholderIndex++}`);
            }
            
            if (columnNames.includes('telefone')) {
              colunas.push('telefone');
              valores.push(unidade.telefone);
              placeholders.push(`$${placeholderIndex++}`);
            }
            
            if (columnNames.includes('email')) {
              colunas.push('email');
              valores.push(unidade.email);
              placeholders.push(`$${placeholderIndex++}`);
            }
            
            if (columnNames.includes('responsavel_matricula')) {
              colunas.push('responsavel_matricula');
              valores.push(unidade.responsavel_matricula);
              placeholders.push(`$${placeholderIndex++}`);
            }
            
            if (columnNames.includes('tipo')) {
              colunas.push('tipo');
              valores.push(unidade.tipo);
              placeholders.push(`$${placeholderIndex++}`);
            }
            
            // Adicionar coluna de status (sempre usamos 'status' pois a coluna é do tipo enum)
            colunas.push('status');
            valores.push(unidade.status);
            placeholders.push(`$${placeholderIndex++}`);
            
            // Adicionar timestamps obrigatórios
            if (columnNames.includes('created_at')) {
              colunas.push('created_at');
              valores.push(new Date().toISOString());
              placeholders.push(`$${placeholderIndex++}`);
            }
            
            if (columnNames.includes('updated_at')) {
              colunas.push('updated_at');
              valores.push(new Date().toISOString());
              placeholders.push(`$${placeholderIndex++}`);
            }
            
            // Construir e executar a query
            const insertQuery = `INSERT INTO unidade (${colunas.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`;
            console.log(`Executando query: ${insertQuery}`);
            console.log(`Valores: ${JSON.stringify(valores)}`);
            
            const result = await dataSource.query(insertQuery, valores);
            console.log(`Unidade ${unidade.nome} criada com sucesso. ID: ${result[0]?.id || 'N/A'}`);
          } else {
            console.log(`Unidade ${unidade.nome} já existe, atualizando...`);
            
            // Construir a query UPDATE dinamicamente
            const updateColumns: string[] = [];
            const updateValues: any[] = [];
            let paramIndex = 1;
            
            // Adicionar colunas para atualização
            if (columnNames.includes('nome')) {
              updateColumns.push(`nome = $${paramIndex++}`);
              updateValues.push(unidade.nome);
            }
            
            if (columnNames.includes('endereco')) {
              updateColumns.push(`endereco = $${paramIndex++}`);
              updateValues.push(unidade.endereco);
            }
            
            if (columnNames.includes('telefone')) {
              updateColumns.push(`telefone = $${paramIndex++}`);
              updateValues.push(unidade.telefone);
            }
            
            if (columnNames.includes('email')) {
              updateColumns.push(`email = $${paramIndex++}`);
              updateValues.push(unidade.email);
            }
            
            if (columnNames.includes('responsavel_matricula')) {
              updateColumns.push(`responsavel_matricula = $${paramIndex++}`);
              updateValues.push(unidade.responsavel_matricula);
            }
            
            if (columnNames.includes('tipo')) {
              updateColumns.push(`tipo = $${paramIndex++}`);
              updateValues.push(unidade.tipo);
            }
            
            // Adicionar coluna de status
            updateColumns.push(`status = $${paramIndex++}`);
            updateValues.push(unidade.status);
            
            // Adicionar o código para a cláusula WHERE
            updateValues.push(unidade.codigo);
            
            // Construir e executar a query
            const updateQuery = `UPDATE unidade SET ${updateColumns.join(', ')} WHERE codigo = $${paramIndex}`;
            console.log(`Executando query: ${updateQuery}`);
            console.log(`Valores: ${JSON.stringify(updateValues)}`);
            
            await dataSource.query(updateQuery, updateValues);
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
