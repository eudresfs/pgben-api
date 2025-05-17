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

    // Lista de tipos de benefícios básicos
    const tiposBeneficiosEssenciais = [
      {
        nome: 'Auxílio Alimentação',
        descricao:
          'Benefício destinado à segurança alimentar das famílias em situação de vulnerabilidade',
        valor_referencia: 150.0,
        periodicidade: 'mensal',
        duracao_maxima: 12,
        duracao_padrao: 6,
        teto_renda_per_capita: 0.5, // meio salário mínimo per capita
        recorrente: true,
        ativo: true,
      },
      {
        nome: 'Auxílio Moradia',
        descricao:
          'Benefício destinado a famílias que perderam suas residências ou estão em situação de risco habitacional',
        valor_referencia: 300.0,
        periodicidade: 'mensal',
        duracao_maxima: 24,
        duracao_padrao: 12,
        teto_renda_per_capita: 0.75, // 3/4 do salário mínimo per capita
        recorrente: true,
        ativo: true,
      },
      {
        nome: 'Auxílio Funeral',
        descricao:
          'Benefício destinado a auxiliar nas despesas funerárias de famílias em situação de vulnerabilidade',
        valor_referencia: 1100.0,
        periodicidade: 'único',
        duracao_maxima: 1,
        duracao_padrao: 1,
        teto_renda_per_capita: 1.0, // um salário mínimo per capita
        recorrente: false,
        ativo: true,
      },
      {
        nome: 'Auxílio Natalidade',
        descricao:
          'Benefício destinado a auxiliar gestantes em situação de vulnerabilidade com despesas pré-natais e pós-parto',
        valor_referencia: 1000.0,
        periodicidade: 'único',
        duracao_maxima: 1,
        duracao_padrao: 1,
        teto_renda_per_capita: 1.0, // um salário mínimo per capita
        recorrente: false,
        ativo: true,
      },
      {
        nome: 'Auxílio Calamidade',
        descricao:
          'Benefício destinado a famílias afetadas por desastres, calamidades ou emergências',
        valor_referencia: 1200.0,
        periodicidade: 'único',
        duracao_maxima: 1,
        duracao_padrao: 1,
        teto_renda_per_capita: 2.0, // dois salários mínimos per capita
        recorrente: false,
        ativo: true,
      },
    ];

    // Inserção dos tipos de benefícios no banco de dados
    for (const tipoBeneficio of tiposBeneficiosEssenciais) {
      const tipoBeneficioExistente = await dataSource.query(
        `SELECT id FROM tipo_beneficio WHERE nome = $1`,
        [tipoBeneficio.nome],
      );

      if (tipoBeneficioExistente.length === 0) {
        await dataSource.query(
          `INSERT INTO tipo_beneficio (
            nome, 
            descricao, 
            valor_referencia, 
            periodicidade, 
            duracao_maxima, 
            duracao_padrao, 
            teto_renda_per_capita, 
            recorrente, 
            ativo
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            tipoBeneficio.nome,
            tipoBeneficio.descricao,
            tipoBeneficio.valor_referencia,
            tipoBeneficio.periodicidade,
            tipoBeneficio.duracao_maxima,
            tipoBeneficio.duracao_padrao,
            tipoBeneficio.teto_renda_per_capita,
            tipoBeneficio.recorrente,
            tipoBeneficio.ativo,
          ],
        );
        console.log(
          `Tipo de benefício ${tipoBeneficio.nome} criado com sucesso`,
        );
      } else {
        console.log(
          `Tipo de benefício ${tipoBeneficio.nome} já existe, atualizando...`,
        );
        await dataSource.query(
          `UPDATE tipo_beneficio 
           SET descricao = $2, 
               valor_referencia = $3, 
               periodicidade = $4, 
               duracao_maxima = $5, 
               duracao_padrao = $6, 
               teto_renda_per_capita = $7, 
               recorrente = $8, 
               ativo = $9
           WHERE nome = $1`,
          [
            tipoBeneficio.nome,
            tipoBeneficio.descricao,
            tipoBeneficio.valor_referencia,
            tipoBeneficio.periodicidade,
            tipoBeneficio.duracao_maxima,
            tipoBeneficio.duracao_padrao,
            tipoBeneficio.teto_renda_per_capita,
            tipoBeneficio.recorrente,
            tipoBeneficio.ativo,
          ],
        );
      }
    }

    console.log('Seed de tipos de benefícios essenciais concluído');
  }
}
