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

    // Lista de tipos de benefícios básicos
    const tiposBeneficiosEssenciais = [
      {
        nome: 'Benefício Alimentação',
        codigo: 'BEN_ALIM',
        descricao:
          'Benefício destinado à segurança alimentar das famílias em situação de vulnerabilidade',
        valor_referencia: 150.0,
        periodicidade: 'MENSAL',
        duracao_maxima: 12,
        duracao_padrao: 6,
        teto_renda_per_capita: 0.5, // meio salário mínimo per capita
        recorrente: true,
        ativo: true,
      },
      {
        nome: 'Benefício Moradia',
        codigo: 'BEN_MOR',
        descricao:
          'Benefício destinado a famílias que perderam suas residências ou estão em situação de risco habitacional',
        valor_referencia: 300.0,
        periodicidade: 'MENSAL',
        duracao_maxima: 24,
        duracao_padrao: 12,
        teto_renda_per_capita: 0.75, // 3/4 do salário mínimo per capita
        recorrente: true,
        ativo: true,
      },
      {
        nome: 'Benefício Funeral',
        codigo: 'BEN_FUN',
        descricao:
          'Benefício destinado a auxiliar nas despesas funerárias de famílias em situação de vulnerabilidade',
        valor_referencia: 1100.0,
        periodicidade: 'UNICA',
        duracao_maxima: 1,
        duracao_padrao: 1,
        teto_renda_per_capita: 1.0, // um salário mínimo per capita
        recorrente: false,
        ativo: true,
      },
      {
        nome: 'Benefício Natalidade',
        codigo: 'BEN_NAT',
        descricao:
          'Benefício destinado a auxiliar gestantes em situação de vulnerabilidade com despesas pré-natais e pós-parto',
        valor_referencia: 1000.0,
        periodicidade: 'UNICA',
        duracao_maxima: 1,
        duracao_padrao: 1,
        teto_renda_per_capita: 1.0, // um salário mínimo per capita
        recorrente: false,
        ativo: true,
      },
      {
        nome: 'Benefício Calamidade',
        codigo: 'BEN_CAL',
        descricao:
          'Benefício destinado a famílias afetadas por desastres, calamidades ou emergências',
        valor_referencia: 1200.0,
        periodicidade: 'UNICA',
        duracao_maxima: 1,
        duracao_padrao: 1,
        teto_renda_per_capita: 2.0, // dois salários mínimos per capita
        recorrente: false,
        ativo: true,
      },
    ];

    // Inserção dos tipos de benefícios no banco de dados
    for (const tipoBeneficio of tiposBeneficiosEssenciais) {
      try {
        const tipoBeneficioExistente = await dataSource.query(
          `SELECT id FROM tipo_beneficio WHERE nome = $1`,
          [tipoBeneficio.nome],
        );

        if (tipoBeneficioExistente.length === 0) {
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
              valores.push(tipoBeneficio.ativo);
            } else if (coluna === 'nome') {
              valores.push(tipoBeneficio.nome);
            } else if (coluna === 'codigo') {
              valores.push(tipoBeneficio.codigo);
            } else if (coluna === 'descricao') {
              valores.push(tipoBeneficio.descricao);
            } else if (coluna === 'valor_referencia') {
              valores.push(tipoBeneficio.valor_referencia);
            } else if (coluna === 'periodicidade') {
              valores.push(tipoBeneficio.periodicidade);
            } else if (coluna === 'duracao_maxima') {
              valores.push(tipoBeneficio.duracao_maxima);
            } else if (coluna === 'duracao_padrao') {
              valores.push(tipoBeneficio.duracao_padrao);
            } else if (coluna === 'teto_renda_per_capita') {
              valores.push(tipoBeneficio.teto_renda_per_capita);
            } else if (coluna === 'recorrente') {
              valores.push(tipoBeneficio.recorrente);
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
            `Tipo de benefício ${tipoBeneficio.nome} criado com sucesso`,
          );
        } else {
          console.log(
            `Tipo de benefício ${tipoBeneficio.nome} já existe, atualizando...`,
          );
          
          // Construir a query de update dinamicamente
          let updateQuery = `UPDATE tipo_beneficio SET `;
          const updateValues: (string | number | boolean)[] = [tipoBeneficio.nome]; // O primeiro valor é sempre o nome para o WHERE
          let paramIndex = 2; // Começa em 2 porque o $1 é usado no WHERE
          
          // Adicionar cada coluna que existe na tabela
          const updateColumns: string[] = [];
          
          if (columnNames.includes('codigo')) {
            updateColumns.push(`codigo = $${paramIndex++}`);
            updateValues.push(tipoBeneficio.codigo);
          }
          
          if (columnNames.includes('descricao')) {
            updateColumns.push(`descricao = $${paramIndex++}`);
            updateValues.push(tipoBeneficio.descricao);
          }
          
          if (columnNames.includes('valor_referencia')) {
            updateColumns.push(`valor_referencia = $${paramIndex++}`);
            updateValues.push(tipoBeneficio.valor_referencia);
          }
          
          if (columnNames.includes('periodicidade')) {
            updateColumns.push(`periodicidade = $${paramIndex++}`);
            updateValues.push(tipoBeneficio.periodicidade);
          }
          
          if (columnNames.includes('duracao_maxima')) {
            updateColumns.push(`duracao_maxima = $${paramIndex++}`);
            updateValues.push(tipoBeneficio.duracao_maxima);
          }
          
          if (columnNames.includes('duracao_padrao')) {
            updateColumns.push(`duracao_padrao = $${paramIndex++}`);
            updateValues.push(tipoBeneficio.duracao_padrao);
          }
          
          if (columnNames.includes('teto_renda_per_capita')) {
            updateColumns.push(`teto_renda_per_capita = $${paramIndex++}`);
            updateValues.push(tipoBeneficio.teto_renda_per_capita);
          }
          
          if (columnNames.includes('recorrente')) {
            updateColumns.push(`recorrente = $${paramIndex++}`);
            updateValues.push(tipoBeneficio.recorrente);
          }
          
          // Adicionar a coluna de status (ativo ou status)
          updateColumns.push(`${statusColumnName} = $${paramIndex++}`);
          updateValues.push(tipoBeneficio.ativo);
          
          // Finalizar a query
          updateQuery += updateColumns.join(', ') + ` WHERE nome = $1`;
          
          await dataSource.query(updateQuery, updateValues);
        }
      } catch (error) {
        console.error(`Erro ao processar tipo de benefício ${tipoBeneficio.nome}: ${error.message}`);
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
