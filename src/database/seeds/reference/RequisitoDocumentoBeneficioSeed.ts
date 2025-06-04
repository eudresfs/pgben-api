import { DataSource } from 'typeorm';
import { TipoDocumentoEnum } from '../../../enums';

/**
 * Seed para criação dos requisitos de documentos específicos por tipo de benefício
 *
 * Este seed cria os requisitos de documentos detalhados para cada tipo de benefício,
 * mapeando corretamente os tipos de documentos do enum TipoDocumentoEnum
 */
export class RequisitoDocumentoBeneficioSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    console.log('Iniciando seed de requisitos de documentos por benefício');

    // Mapeamento de requisitos de documentos por tipo de benefício
    const requisitosPorBeneficio = [
      {
        tipoBeneficio: 'Benefício Natalidade',
        requisitos: [
          {
            tipo_documento: TipoDocumentoEnum.CPF,
            nome: 'CPF da gestante/mãe',
            descricao:
              'Cadastro de Pessoa Física da gestante ou mãe do recém-nascido',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.RG,
            nome: 'RG da gestante/mãe',
            descricao:
              'Registro Geral (Carteira de Identidade) da gestante ou mãe',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.COMPROVANTE_RESIDENCIA,
            nome: 'Comprovante de residência',
            descricao:
              'Documento que comprove residência no município há pelo menos 2 anos',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.CERTIDAO_NASCIMENTO,
            nome: 'Certidão de nascimento do bebê',
            descricao:
              'Certidão de nascimento da criança (para auxílio pós-parto)',
            obrigatorio: false,
          },
          {
            tipo_documento: TipoDocumentoEnum.CARTAO_PRE_NATAL,
            nome: 'Cartão de pré-natal',
            descricao:
              'Cartão de acompanhamento pré-natal com consultas registradas',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.EXAME_PRE_NATAL,
            nome: 'Exames pré-natais',
            descricao: 'Exames realizados durante o pré-natal',
            obrigatorio: false,
          },
          {
            tipo_documento: TipoDocumentoEnum.DECLARACAO_NASCIDO_VIVO,
            nome: 'Declaração de nascido vivo',
            descricao:
              'Declaração de nascido vivo emitida pelo hospital/maternidade',
            obrigatorio: false,
          },
          {
            tipo_documento: TipoDocumentoEnum.COMPROVANTE_GESTACAO,
            nome: 'Comprovante de gestação',
            descricao:
              'Atestado médico comprovando gestação (para auxílio pré-natal)',
            obrigatorio: false,
          },
          {
            tipo_documento: TipoDocumentoEnum.COMPROVANTE_RENDA,
            nome: 'Comprovante de renda familiar',
            descricao: 'Documentos que comprovem a renda familiar mensal',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.FOLHA_RESUMO_CADUNICO,
            nome: 'Folha resumo do CadÚnico',
            descricao: 'Folha resumo atualizada do Cadastro Único',
            obrigatorio: false,
          },
          {
            tipo_documento: TipoDocumentoEnum.DECLARACAO_COMPOSICAO_FAMILIAR,
            nome: 'Declaração de composição familiar',
            descricao: 'Declaração informando todos os membros da família',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.DADOS_BANCARIOS,
            nome: 'Dados bancários',
            descricao:
              'Informações da conta bancária para depósito do benefício',
            obrigatorio: true,
          },
        ],
      },
      {
        tipoBeneficio: 'Aluguel Social',
        requisitos: [
          {
            tipo_documento: TipoDocumentoEnum.CPF,
            nome: 'CPF do solicitante',
            descricao: 'Cadastro de Pessoa Física do requerente',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.RG,
            nome: 'RG do solicitante',
            descricao: 'Registro Geral (Carteira de Identidade) do requerente',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.COMPROVANTE_RESIDENCIA,
            nome: 'Comprovante de residência anterior',
            descricao:
              'Documento que comprove a última residência no município',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.CONTRATO_ALUGUEL,
            nome: 'Contrato de aluguel',
            descricao: 'Contrato de locação do imóvel a ser subsidiado',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.COMPROVANTE_RENDA,
            nome: 'Comprovante de renda familiar',
            descricao: 'Documentos que comprovem a renda familiar mensal',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.BOLETIM_OCORRENCIA,
            nome: 'Boletim de ocorrência',
            descricao:
              'B.O. em casos de violência doméstica, desabamento ou situação de risco',
            obrigatorio: false,
          },
          {
            tipo_documento: TipoDocumentoEnum.MEDIDA_PROTETIVA,
            nome: 'Medida protetiva',
            descricao:
              'Medida protetiva de urgência em casos de violência doméstica',
            obrigatorio: false,
          },
          {
            tipo_documento: TipoDocumentoEnum.RELATORIO_SOCIAL,
            nome: 'Relatório social',
            descricao:
              'Relatório elaborado pelo assistente social após visita domiciliar',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.PARECER_TECNICO,
            nome: 'Parecer técnico',
            descricao: 'Parecer técnico sobre a situação habitacional',
            obrigatorio: false,
          },
          {
            tipo_documento: TipoDocumentoEnum.FOLHA_RESUMO_CADUNICO,
            nome: 'Folha resumo do CadÚnico',
            descricao: 'Folha resumo atualizada do Cadastro Único',
            obrigatorio: false,
          },
          {
            tipo_documento: TipoDocumentoEnum.DECLARACAO_COMPOSICAO_FAMILIAR,
            nome: 'Declaração de composição familiar',
            descricao: 'Declaração informando todos os membros da família',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.DADOS_BANCARIOS,
            nome: 'Dados bancários',
            descricao:
              'Informações da conta bancária para depósito do benefício',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.IPTU,
            nome: 'IPTU do imóvel',
            descricao: 'Carnê do IPTU do imóvel a ser alugado',
            obrigatorio: false,
          },
        ],
      },
      {
        tipoBeneficio: 'Benefício Funeral',
        requisitos: [
          {
            tipo_documento: TipoDocumentoEnum.CPF,
            nome: 'CPF do solicitante',
            descricao: 'Cadastro de Pessoa Física do requerente',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.RG,
            nome: 'RG do solicitante',
            descricao: 'Registro Geral (Carteira de Identidade) do requerente',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.COMPROVANTE_RESIDENCIA,
            nome: 'Comprovante de residência',
            descricao: 'Documento que comprove residência no município',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.CERTIDAO_OBITO,
            nome: 'Certidão de óbito',
            descricao: 'Certidão de óbito da pessoa falecida',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.DECLARACAO_OBITO,
            nome: 'Declaração de óbito',
            descricao: 'Declaração de óbito emitida pelo hospital/médico',
            obrigatorio: false,
          },
          {
            tipo_documento: TipoDocumentoEnum.COMPROVANTE_PARENTESCO,
            nome: 'Comprovante de parentesco',
            descricao: 'Documento que comprove parentesco com o falecido',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.AUTORIZACAO_SEPULTAMENTO,
            nome: 'Autorização de sepultamento',
            descricao: 'Autorização para sepultamento emitida pelo cartório',
            obrigatorio: false,
          },
          {
            tipo_documento: TipoDocumentoEnum.COMPROVANTE_RENDA,
            nome: 'Comprovante de renda familiar',
            descricao: 'Documentos que comprovem a renda familiar mensal',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.FOLHA_RESUMO_CADUNICO,
            nome: 'Folha resumo do CadÚnico',
            descricao: 'Folha resumo atualizada do Cadastro Único',
            obrigatorio: false,
          },
          {
            tipo_documento: TipoDocumentoEnum.DECLARACAO_HIPOSSUFICIENCIA,
            nome: 'Declaração de hipossuficiência',
            descricao: 'Declaração de insuficiência de recursos financeiros',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.DADOS_BANCARIOS,
            nome: 'Dados bancários',
            descricao:
              'Informações da conta bancária para depósito do benefício',
            obrigatorio: true,
          },
        ],
      },
      {
        tipoBeneficio: 'Auxílio Alimentação',
        requisitos: [
          {
            tipo_documento: TipoDocumentoEnum.CPF,
            nome: 'CPF do solicitante',
            descricao: 'Cadastro de Pessoa Física do requerente',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.RG,
            nome: 'RG do solicitante',
            descricao: 'Registro Geral (Carteira de Identidade) do requerente',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.COMPROVANTE_RESIDENCIA,
            nome: 'Comprovante de residência',
            descricao: 'Documento que comprove residência no município',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.COMPROVANTE_RENDA,
            nome: 'Comprovante de renda familiar',
            descricao: 'Documentos que comprovem a renda familiar mensal',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.DECLARACAO_COMPOSICAO_FAMILIAR,
            nome: 'Declaração de composição familiar',
            descricao: 'Declaração informando todos os membros da família',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.FOLHA_RESUMO_CADUNICO,
            nome: 'Folha resumo do CadÚnico',
            descricao: 'Folha resumo atualizada do Cadastro Único',
            obrigatorio: false,
          },
          {
            tipo_documento: TipoDocumentoEnum.CARTAO_CADUNICO,
            nome: 'Cartão do CadÚnico',
            descricao: 'Cartão do Cadastro Único da família',
            obrigatorio: false,
          },
          {
            tipo_documento: TipoDocumentoEnum.COMPROVANTE_BOLSA_FAMILIA,
            nome: 'Comprovante Bolsa Família',
            descricao:
              'Comprovante de recebimento do Bolsa Família (se aplicável)',
            obrigatorio: false,
          },
          {
            tipo_documento: TipoDocumentoEnum.DECLARACAO_MEDICA,
            nome: 'Declaração médica',
            descricao:
              'Declaração médica sobre necessidades nutricionais especiais',
            obrigatorio: false,
          },
          {
            tipo_documento: TipoDocumentoEnum.RELATORIO_SOCIAL,
            nome: 'Relatório social',
            descricao: 'Relatório elaborado pelo assistente social',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.DADOS_BANCARIOS,
            nome: 'Dados bancários',
            descricao:
              'Informações da conta bancária para depósito do benefício',
            obrigatorio: true,
          },
        ],
      },
      {
        tipoBeneficio: 'Auxílio Transporte',
        requisitos: [
          {
            tipo_documento: TipoDocumentoEnum.CPF,
            nome: 'CPF do solicitante',
            descricao: 'Cadastro de Pessoa Física do requerente',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.RG,
            nome: 'RG do solicitante',
            descricao: 'Registro Geral (Carteira de Identidade) do requerente',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.COMPROVANTE_RESIDENCIA,
            nome: 'Comprovante de residência',
            descricao: 'Documento que comprove residência no município',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.COMPROVANTE_VIAGEM,
            nome: 'Comprovante de viagem',
            descricao: 'Documento que justifique a necessidade de viagem',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.AUTORIZACAO_VIAGEM,
            nome: 'Autorização de viagem',
            descricao: 'Autorização para viagem (em casos específicos)',
            obrigatorio: false,
          },
          {
            tipo_documento: TipoDocumentoEnum.BILHETE_PASSAGEM,
            nome: 'Orçamento de passagem',
            descricao: 'Orçamento ou cotação do valor da passagem',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.DECLARACAO_MEDICA,
            nome: 'Declaração médica',
            descricao:
              'Declaração médica justificando a viagem para tratamento',
            obrigatorio: false,
          },
          {
            tipo_documento: TipoDocumentoEnum.COMPROVANTE_RENDA,
            nome: 'Comprovante de renda familiar',
            descricao: 'Documentos que comprovem a renda familiar mensal',
            obrigatorio: true,
          },
          {
            tipo_documento: TipoDocumentoEnum.FOLHA_RESUMO_CADUNICO,
            nome: 'Folha resumo do CadÚnico',
            descricao: 'Folha resumo atualizada do Cadastro Único',
            obrigatorio: false,
          },
          {
            tipo_documento: TipoDocumentoEnum.RELATORIO_SOCIAL,
            nome: 'Relatório social',
            descricao: 'Relatório elaborado pelo assistente social',
            obrigatorio: true,
          },
        ],
      },
    ];

    // Inserir os requisitos de documentos no banco de dados
    for (const beneficio of requisitosPorBeneficio) {
      console.log(`Processando requisitos para ${beneficio.tipoBeneficio}...`);

      // Buscar o ID do tipo de benefício pelo nome
      const tipoBeneficioResult = await dataSource.query(
        `SELECT id FROM tipo_beneficio WHERE nome = $1`,
        [beneficio.tipoBeneficio],
      );

      if (tipoBeneficioResult.length === 0) {
        console.log(
          `⚠️  Tipo de benefício '${beneficio.tipoBeneficio}' não encontrado, pulando requisitos`,
        );
        continue;
      }

      const tipoBeneficioId = tipoBeneficioResult[0].id;

      for (const requisito of beneficio.requisitos) {
        try {
          // Verificar se o requisito já existe para este tipo de benefício e tipo de documento
          const requisitoExistente = await dataSource.query(
            `SELECT id FROM requisito_documento 
             WHERE tipo_beneficio_id = $1 AND tipo_documento = $2`,
            [tipoBeneficioId, requisito.tipo_documento],
          );

          if (requisitoExistente.length === 0) {
            // Inserir novo requisito
            await dataSource.query(
              `INSERT INTO requisito_documento (
                tipo_beneficio_id,
                tipo_documento,
                nome,
                descricao,
                obrigatorio,
                created_at,
                updated_at
              )
              VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
              [
                tipoBeneficioId,
                requisito.tipo_documento,
                requisito.nome,
                requisito.descricao,
                requisito.obrigatorio,
              ],
            );
            console.log(
              `✅ Requisito '${requisito.nome}' (${requisito.tipo_documento}) criado para ${beneficio.tipoBeneficio}`,
            );
          } else {
            // Atualizar requisito existente
            await dataSource.query(
              `UPDATE requisito_documento 
               SET nome = $3, descricao = $4, obrigatorio = $5, updated_at = NOW()
               WHERE tipo_beneficio_id = $1 AND tipo_documento = $2`,
              [
                tipoBeneficioId,
                requisito.tipo_documento,
                requisito.nome,
                requisito.descricao,
                requisito.obrigatorio,
              ],
            );
            console.log(
              `🔄 Requisito '${requisito.nome}' (${requisito.tipo_documento}) atualizado para ${beneficio.tipoBeneficio}`,
            );
          }
        } catch (error) {
          console.error(
            `❌ Erro ao processar requisito '${requisito.nome}' para ${beneficio.tipoBeneficio}:`,
            error.message,
          );
        }
      }
    }

    console.log(
      '✅ Seed de requisitos de documentos por benefício concluído com sucesso!',
    );
  }
}
