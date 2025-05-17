import { DataSource } from 'typeorm';

/**
 * Seed para criação dos requisitos de documentos de referência
 *
 * Este seed cria os requisitos de documentos para cada tipo de benefício,
 * definindo quais documentos são necessários para cada fase do processo
 */
export class RequisitoDocumentoSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    console.log('Iniciando seed de requisitos de documentos de referência');

    // Lista de requisitos de documentos por tipo de benefício
    const requisitosBeneficios = [
      // Auxílio Alimentação
      {
        tipoBeneficio: 'Auxílio Alimentação',
        requisitos: [
          {
            descricao: 'RG e CPF do solicitante',
            obrigatorio: true,
            fase: 'inscricao',
            ordem: 1,
          },
          {
            descricao: 'Comprovante de residência',
            obrigatorio: true,
            fase: 'inscricao',
            ordem: 2,
          },
          {
            descricao: 'Comprovante de renda familiar',
            obrigatorio: true,
            fase: 'inscricao',
            ordem: 3,
          },
          {
            descricao: 'Documentos de todos os membros da família',
            obrigatorio: true,
            fase: 'inscricao',
            ordem: 4,
          },
          {
            descricao: 'Folha resumo do CadÚnico',
            obrigatorio: false,
            fase: 'inscricao',
            ordem: 5,
          },
          {
            descricao: 'Laudo de insegurança alimentar',
            obrigatorio: false,
            fase: 'avaliacao',
            ordem: 6,
          },
        ],
      },

      // Auxílio Moradia
      {
        tipoBeneficio: 'Auxílio Moradia',
        requisitos: [
          {
            descricao: 'RG e CPF do solicitante',
            obrigatorio: true,
            fase: 'inscricao',
            ordem: 1,
          },
          {
            descricao: 'Comprovante de residência anterior',
            obrigatorio: true,
            fase: 'inscricao',
            ordem: 2,
          },
          {
            descricao: 'Comprovante de renda familiar',
            obrigatorio: true,
            fase: 'inscricao',
            ordem: 3,
          },
          {
            descricao: 'Laudo da Defesa Civil (se aplicável)',
            obrigatorio: false,
            fase: 'inscricao',
            ordem: 4,
          },
          {
            descricao: 'Fotos do imóvel (quando por risco)',
            obrigatorio: false,
            fase: 'inscricao',
            ordem: 5,
          },
          {
            descricao: 'Contrato de aluguel',
            obrigatorio: true,
            fase: 'analise',
            ordem: 6,
          },
          {
            descricao: 'Relatório de visita técnica',
            obrigatorio: true,
            fase: 'avaliacao',
            ordem: 7,
          },
        ],
      },

      // Auxílio Funeral
      {
        tipoBeneficio: 'Auxílio Funeral',
        requisitos: [
          {
            descricao: 'RG e CPF do solicitante',
            obrigatorio: true,
            fase: 'inscricao',
            ordem: 1,
          },
          {
            descricao: 'Comprovante de residência',
            obrigatorio: true,
            fase: 'inscricao',
            ordem: 2,
          },
          {
            descricao: 'Certidão de óbito',
            obrigatorio: true,
            fase: 'inscricao',
            ordem: 3,
          },
          {
            descricao: 'Comprovante de parentesco com o falecido',
            obrigatorio: true,
            fase: 'inscricao',
            ordem: 4,
          },
          {
            descricao: 'Comprovante de renda familiar',
            obrigatorio: true,
            fase: 'inscricao',
            ordem: 5,
          },
          {
            descricao: 'Nota fiscal dos serviços funerários',
            obrigatorio: true,
            fase: 'analise',
            ordem: 6,
          },
        ],
      },
    ];

    // Inserir os requisitos de documentos no banco de dados
    for (const beneficio of requisitosBeneficios) {
      // Buscar o ID do tipo de benefício pelo nome
      const tipoBeneficioResult = await dataSource.query(
        `SELECT id FROM tipo_beneficio WHERE nome = $1`,
        [beneficio.tipoBeneficio],
      );

      if (tipoBeneficioResult.length === 0) {
        console.log(
          `Tipo de benefício ${beneficio.tipoBeneficio} não encontrado, pulando requisitos`,
        );
        continue;
      }

      const tipoBeneficioId = tipoBeneficioResult[0].id;

      for (const requisito of beneficio.requisitos) {
        // Verificar se o requisito já existe para este tipo de benefício
        const requisitoExistente = await dataSource.query(
          `SELECT id FROM requisito_documento 
           WHERE tipo_beneficio_id = $1 AND descricao = $2`,
          [tipoBeneficioId, requisito.descricao],
        );

        if (requisitoExistente.length === 0) {
          await dataSource.query(
            `INSERT INTO requisito_documento (
              tipo_beneficio_id,
              descricao,
              obrigatorio,
              fase,
              ordem
            )
            VALUES ($1, $2, $3, $4, $5)`,
            [
              tipoBeneficioId,
              requisito.descricao,
              requisito.obrigatorio,
              requisito.fase,
              requisito.ordem,
            ],
          );
          console.log(
            `Requisito "${requisito.descricao}" criado para ${beneficio.tipoBeneficio}`,
          );
        } else {
          console.log(
            `Requisito "${requisito.descricao}" já existe para ${beneficio.tipoBeneficio}, atualizando...`,
          );
          await dataSource.query(
            `UPDATE requisito_documento 
             SET obrigatorio = $3, fase = $4, ordem = $5
             WHERE tipo_beneficio_id = $1 AND descricao = $2`,
            [
              tipoBeneficioId,
              requisito.descricao,
              requisito.obrigatorio,
              requisito.fase,
              requisito.ordem,
            ],
          );
        }
      }
    }

    console.log('Seed de requisitos de documentos de referência concluído');
  }
}
