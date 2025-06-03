import { DataSource } from 'typeorm';

/**
 * Seed para criação dos tipos de benefícios essenciais do sistema
 *
 * Este seed cria os tipos de benefícios básicos necessários para o
 * funcionamento do sistema de assistência social
 */
export class TipoBeneficioSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    console.log('Iniciando seed de tipos de benefícios essenciais');

    try {
      // Verificar estrutura da tabela tipo_beneficio
      console.log('Verificando estrutura da tabela tipo_beneficio...');
      const tableInfo = await dataSource.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'tipo_beneficio'`
      );

      if (tableInfo.length === 0) {
        throw new Error('Tabela tipo_beneficio não encontrada no banco de dados');
      }

      const columnNames = tableInfo.map(col => col.column_name);
      console.log(`Colunas encontradas na tabela tipo_beneficio: ${columnNames.join(', ')}`);
      
      const statusColumnName = columnNames.includes('ativo') ? 'ativo' : 'status';
      console.log(`Utilizando coluna de status: ${statusColumnName}`);

    // Lista de tipos de benefícios conforme especificação técnica (Lei 7.205/2021)
    const tiposBeneficio = [
      {
        nome: 'Benefício Natalidade',
        codigo: 'BENEFICIO_NATALIDADE',
        descricao:
          'Kit enxoval ou auxílio financeiro para recém-nascidos. Valor em pecúnia: R$ 500,00 (projeto de lei). Prazo: Até 30 dias após o parto.',
        valor_referencia: 500.0, // Conforme projeto de lei
        periodicidade: 'UNICA',
        duracao_maxima: 1,
        duracao_padrao: 1,
        teto_renda_per_capita: 0, // Não especificado na documentação
        recorrente: false,
        status: 'ativo',
      },
      {
        nome: 'Benefício Funeral',
        codigo: 'BENEFICIO_FUNERAL',
        descricao:
          'Urna funerária com translado. Tipos: Padrão (até 100kg), Obeso (até 150kg), Especial, Infantil (até 50kg). Melhorias previstas: Flores, formol, velas e roupa.',
        valor_referencia: 0, // Benefício em espécie (urna)
        periodicidade: 'UNICA',
        duracao_maxima: 1,
        duracao_padrao: 1,
        teto_renda_per_capita: 0, // Não especificado na documentação
        recorrente: false,
        status: 'ativo',
      },
      {
        nome: 'Cesta Básica',
        codigo: 'CESTA_BASICA',
        descricao:
          'Gêneros alimentícios ou vale alimentação (R$ 200,00). Periodicidade: Máximo 6 meses, renovável por até 3 meses adicionais.',
        valor_referencia: 200.0, // Conforme projeto de lei
        periodicidade: 'MENSAL',
        duracao_maxima: 9, // 6 meses + 3 meses de renovação
        duracao_padrao: 6,
        teto_renda_per_capita: 0, // Não especificado na documentação
        recorrente: true,
        status: 'ativo',
      },
      {
        nome: 'Aluguel Social',
        codigo: 'ALUGUEL_SOCIAL',
        descricao:
          'R$ 600,00 mensais por até 6 meses (prorrogável por igual período mediante análise profissional). Finalidade exclusiva: locação em Natal.',
        valor_referencia: 600.0, // Valor fixo conforme especificação
        periodicidade: 'MENSAL',
        duracao_maxima: 12, // 6 meses + 6 meses de prorrogação
        duracao_padrao: 6,
        teto_renda_per_capita: 0, // Não especificado na documentação
        recorrente: true,
        status: 'ativo',
      },

    ];

    // Inserção dos tipos de benefícios no banco de dados
    for (const tipo of tiposBeneficio) {
      try {
        const existingTipo = await dataSource.query(
          `SELECT id FROM tipo_beneficio WHERE codigo = $1`,
          [tipo.codigo],
        );

        if (existingTipo.length === 0) {
          // Verificar quais colunas existem e construir a query dinamicamente
          const colunas: string[] = [
            'nome', 
            'codigo', 
            'descricao', 
            'valor_referencia', 
            'periodicidade', 
            'duracao_maxima', 
            'duracao_padrao', 
            'teto_renda_per_capita', 
            'recorrente', 
            statusColumnName
          ];
          
          // Adicionar timestamps se existirem
          if (columnNames.includes('created_at')) {
            colunas.push('created_at');
          }
          
          if (columnNames.includes('updated_at')) {
            colunas.push('updated_at');
          }
          
          // Verificar se todas as colunas existem na tabela
          const colunasExistentes: string[] = colunas.filter(col => 
            col === statusColumnName || columnNames.includes(col)
          );
          
          // Criar placeholders para os valores ($1, $2, etc.)
          const placeholders: string[] = colunasExistentes.map((_, index) => `$${index + 1}`);
          
          // Criar array de valores na mesma ordem das colunas
          const valores: (string | number | boolean)[] = [];
          colunasExistentes.forEach(coluna => {
            if (coluna === statusColumnName) {
              valores.push(tipo.status);
            } else if (coluna === 'nome') {
              valores.push(tipo.nome);
            } else if (coluna === 'codigo') {
              valores.push(tipo.codigo);
            } else if (coluna === 'descricao') {
              valores.push(tipo.descricao);
            } else if (coluna === 'valor_referencia') {
              valores.push(tipo.valor_referencia);
            } else if (coluna === 'periodicidade') {
              valores.push(tipo.periodicidade);
            } else if (coluna === 'duracao_maxima') {
              valores.push(tipo.duracao_maxima);
            } else if (coluna === 'duracao_padrao') {
              valores.push(tipo.duracao_padrao);
            } else if (coluna === 'teto_renda_per_capita') {
              valores.push(tipo.teto_renda_per_capita);
            } else if (coluna === 'recorrente') {
              valores.push(tipo.recorrente);
            } else if (coluna === 'created_at') {
              valores.push(new Date().toISOString());
            } else if (coluna === 'updated_at') {
              valores.push(new Date().toISOString());
            }
          });
          
          await dataSource.query(
            `INSERT INTO tipo_beneficio (
              ${colunasExistentes.join(', ')}
            )
            VALUES (${placeholders.join(', ')})`,
            valores,
          );
          console.log(
            `✓ Tipo de benefício '${tipo.nome}' inserido com sucesso`,
          );
        } else {
          console.log(
            `✓ Tipo de benefício '${tipo.nome}' atualizado com sucesso`,
          );
          
          // Construir a query de update dinamicamente
          let updateQuery = `UPDATE tipo_beneficio SET `;
          const updateValues: (string | number | boolean)[] = [tipo.codigo]; // O primeiro valor é sempre o codigo para o WHERE
          let paramIndex = 2; // Começa em 2 porque o $1 é usado no WHERE
          
          // Adicionar cada coluna que existe na tabela
          const updateColumns: string[] = [];
          
          if (columnNames.includes('nome')) {
            updateColumns.push(`nome = $${paramIndex++}`);
            updateValues.push(tipo.nome);
          }
          
          if (columnNames.includes('descricao')) {
            updateColumns.push(`descricao = $${paramIndex++}`);
            updateValues.push(tipo.descricao);
          }
          
          if (columnNames.includes('valor_referencia')) {
            updateColumns.push(`valor_referencia = $${paramIndex++}`);
            updateValues.push(tipo.valor_referencia);
          }
          
          if (columnNames.includes('periodicidade')) {
            updateColumns.push(`periodicidade = $${paramIndex++}`);
            updateValues.push(tipo.periodicidade);
          }
          
          if (columnNames.includes('duracao_maxima')) {
            updateColumns.push(`duracao_maxima = $${paramIndex++}`);
            updateValues.push(tipo.duracao_maxima);
          }
          
          if (columnNames.includes('duracao_padrao')) {
            updateColumns.push(`duracao_padrao = $${paramIndex++}`);
            updateValues.push(tipo.duracao_padrao);
          }
          
          if (columnNames.includes('teto_renda_per_capita')) {
            updateColumns.push(`teto_renda_per_capita = $${paramIndex++}`);
            updateValues.push(tipo.teto_renda_per_capita);
          }
          
          if (columnNames.includes('recorrente')) {
            updateColumns.push(`recorrente = $${paramIndex++}`);
            updateValues.push(tipo.recorrente);
          }
          
          // Adicionar a coluna de status (ativo ou status)
          updateColumns.push(`${statusColumnName} = $${paramIndex++}`);
          updateValues.push(tipo.status);
          
          // Finalizar a query
          updateQuery += updateColumns.join(', ') + ` WHERE codigo = $1`;
          
          await dataSource.query(updateQuery, updateValues);
        }
      } catch (error) {
        console.error(`Erro ao processar tipo de benefício ${tipo.nome}: ${error.message}`);
        // Continua para o próximo tipo de benefício
      }
    }

    console.log('Seed de tipos de benefícios essenciais concluído');
    } catch (error) {
      console.error(`Erro global no seed de tipos de benefícios: ${error.message}`);
      throw error;
    }
  }
}
