/**
 * Exemplos específicos para documentação Swagger conforme SUAS
 * 
 * Baseado em casos reais de encerramento de benefícios eventuais
 * conforme Lei nº 8.742/1993 (LOAS) e regulamentações do CNAS.
 */

export const SwaggerExamples = {
  /**
   * Exemplo de superação de vulnerabilidade socioeconômica
   */
  superacaoVulnerabilidade: {
    summary: 'Superação de Vulnerabilidade Socioeconômica',
    description: 'Família conseguiu emprego formal e superou situação de vulnerabilidade',
    value: {
      motivoEncerramento: 'SUPERACAO_VULNERABILIDADE',
      statusVulnerabilidade: 'SUPERADA',
      observacoesTecnicas: 'Família conseguiu emprego formal com carteira assinada, aumentando significativamente a renda familiar (de R$ 200 para R$ 1.400). Superação confirmada através de acompanhamento técnico e documentação comprobatória. Beneficiário principal (João Silva) foi contratado como auxiliar de produção na empresa XYZ Ltda. Família demonstra autonomia financeira e não necessita mais do benefício eventual.',
      documentosComprobatorios: [
        {
          tipo: 'COMPROVANTE_RENDA',
          descricao: 'Carteira de trabalho assinada comprovando vínculo empregatício formal',
          arquivo: 'carteira_trabalho_joao_silva.pdf'
        },
        {
          tipo: 'FOTOGRAFIA',
          descricao: 'Registro fotográfico da residência mostrando melhorias nas condições habitacionais',
          arquivo: 'foto_residencia_melhorias.jpg'
        }
      ]
    }
  },

  /**
   * Exemplo de mudança de território
   */
  mudancaTerritorio: {
    summary: 'Mudança de Território',
    description: 'Família mudou-se para outro município fora da abrangência do CRAS',
    value: {
      motivoEncerramento: 'MUDANCA_TERRITORIO',
      statusVulnerabilidade: 'TRANSFERIDA',
      observacoesTecnicas: 'Família mudou-se para o município de São Paulo/SP em 10/01/2024, conforme comprovante de residência apresentado. Foi orientada a procurar o CRAS de referência no novo território para continuidade do acompanhamento social. Encaminhamento formal foi realizado via SISC (Sistema de Informação do SUAS) para o CRAS Vila Madalena.',
      documentosComprobatorios: [
        {
          tipo: 'COMPROVANTE_RESIDENCIA',
          descricao: 'Contrato de locação no novo endereço em São Paulo/SP',
          arquivo: 'contrato_locacao_sp.pdf'
        },
        {
          tipo: 'FOTOGRAFIA',
          descricao: 'Registro fotográfico da nova residência',
          arquivo: 'foto_nova_residencia.jpg'
        }
      ]
    }
  },

  /**
   * Exemplo de óbito do beneficiário
   */
  obitoBeneficiario: {
    summary: 'Óbito do Beneficiário Principal',
    description: 'Encerramento devido ao falecimento do beneficiário principal',
    value: {
      motivoEncerramento: 'OBITO_BENEFICIARIO',
      statusVulnerabilidade: 'NAO_APLICAVEL',
      observacoesTecnicas: 'Beneficiário principal (Maria Santos) veio a óbito em 05/01/2024 conforme certidão de óbito apresentada pela família. Família foi orientada sobre outros benefícios disponíveis no SUAS. Cônjuge foi encaminhado para avaliação de elegibilidade para outros programas sociais.',
      documentosComprobatorios: [
        {
          tipo: 'CERTIDAO_OBITO',
          descricao: 'Certidão de óbito da beneficiária principal Maria Santos',
          arquivo: 'certidao_obito_maria_santos.pdf'
        }
      ]
    }
  },

  /**
   * Exemplo de descumprimento de condicionalidades
   */
  descumprimentoCondicionalidades: {
    summary: 'Descumprimento de Condicionalidades',
    description: 'Família não cumpriu as contrapartidas estabelecidas no plano de acompanhamento',
    value: {
      motivoEncerramento: 'DESCUMPRIMENTO_CONDICIONALIDADES',
      statusVulnerabilidade: 'MANTIDA',
      observacoesTecnicas: 'Família não compareceu aos atendimentos técnicos agendados por 3 meses consecutivos (outubro, novembro e dezembro/2023). Foram realizadas 5 tentativas de contato telefônico e 2 visitas domiciliares sem sucesso. Não cumpriu a condicionalidade de participação nas atividades do PAIF. Conforme regulamento interno e Lei de Benefícios Eventuais, o benefício foi cessado por descumprimento das contrapartidas estabelecidas.',
      documentosComprobatorios: [
        {
          tipo: 'RELATORIO_TECNICO',
          descricao: 'Relatório técnico detalhando as tentativas de contato e descumprimentos',
          arquivo: 'relatorio_descumprimento_familia_silva.pdf'
        },
        {
          tipo: 'FOTOGRAFIA',
          descricao: 'Registro fotográfico das tentativas de visita domiciliar',
          arquivo: 'foto_tentativa_visita.jpg'
        }
      ]
    }
  },

  /**
   * Exemplo de agravamento da situação
   */
  agravamentoSituacao: {
    summary: 'Agravamento da Situação de Vulnerabilidade',
    description: 'Situação familiar se agravou necessitando intervenção especializada',
    value: {
      motivoEncerramento: 'AGRAVAMENTO_SITUACAO',
      statusVulnerabilidade: 'AGRAVADA',
      observacoesTecnicas: 'Identificado agravamento significativo da situação familiar com suspeita de violência doméstica contra criança de 8 anos. Caso foi encaminhado para o CREAS (Centro de Referência Especializado de Assistência Social) para acompanhamento especializado. Conselho Tutelar foi acionado conforme protocolo de proteção. Benefício eventual foi cessado para dar lugar ao acompanhamento especializado mais adequado à nova situação.',
      documentosComprobatorios: [
        {
          tipo: 'RELATORIO_TECNICO',
          descricao: 'Relatório técnico detalhando o agravamento e encaminhamentos realizados',
          arquivo: 'relatorio_agravamento_violencia.pdf'
        },
        {
          tipo: 'DOCUMENTO_ENCAMINHAMENTO',
          descricao: 'Documento de encaminhamento para CREAS e Conselho Tutelar',
          arquivo: 'encaminhamento_creas_ct.pdf'
        }
      ]
    }
  },

  /**
   * Exemplo de alteração na renda familiar
   */
  alteracaoRendaFamiliar: {
    summary: 'Alteração na Renda Familiar',
    description: 'Renda familiar ultrapassou o limite estabelecido para o benefício',
    value: {
      motivoEncerramento: 'ALTERACAO_RENDA_FAMILIAR',
      statusVulnerabilidade: 'EM_SUPERACAO',
      observacoesTecnicas: 'Renda familiar per capita aumentou de R$ 89,00 para R$ 178,00 devido ao recebimento de pensão por morte do INSS. Embora ainda em processo de superação da vulnerabilidade, a família ultrapassou o critério de renda estabelecido para o benefício eventual (1/4 do salário mínimo per capita). Família foi orientada sobre outros programas sociais disponíveis e mantida em acompanhamento no PAIF.',
      documentosComprobatorios: [
        {
          tipo: 'COMPROVANTE_RENDA',
          descricao: 'Extrato de pagamento da pensão por morte do INSS',
          arquivo: 'extrato_pensao_inss.pdf'
        },
        {
          tipo: 'DECLARACAO_RENDA',
          descricao: 'Declaração de composição da renda familiar atualizada',
          arquivo: 'declaracao_renda_atualizada.pdf'
        }
      ]
    }
  },

  /**
   * Exemplo de erro de validação SUAS
   */
  erroValidacaoSUAS: {
    summary: 'Erro de Validação - Combinação Inválida',
    description: 'Exemplo de erro quando há combinação inválida entre motivo e status',
    value: {
      statusCode: 400,
      message: 'Combinação inválida: motivo "SUPERACAO_VULNERABILIDADE" não é compatível com status "AGRAVADA". Para superação, use status: SUPERADA, EM_SUPERACAO ou TEMPORARIAMENTE_RESOLVIDA.',
      error: 'Bad Request'
    }
  },

  /**
   * Exemplo de erro de documentos obrigatórios
   */
  erroDocumentosObrigatorios: {
    summary: 'Erro de Validação - Documentos Obrigatórios',
    description: 'Exemplo de erro quando documentos obrigatórios estão ausentes',
    value: {
      statusCode: 400,
      message: 'Para superação de vulnerabilidade são obrigatórios: Comprovante de renda, Fotografia. Documentos ausentes: Comprovante de renda.',
      error: 'Bad Request'
    }
  },

  /**
   * Exemplo de erro de permissão
   */
  erroPermissao: {
    summary: 'Erro de Permissão - Acesso Negado',
    description: 'Exemplo de erro quando usuário não tem permissão adequada',
    value: {
      statusCode: 403,
      message: 'Acesso negado: usuário não tem competência territorial para esta concessão. Concessão pertence ao território CRAS Norte, usuário tem acesso apenas ao CRAS Sul.',
      error: 'Forbidden'
    }
  }
};

/**
 * Configurações de exemplo para diferentes cenários de uso
 */
export const SwaggerExampleConfigs = {
  /**
   * Configuração para endpoint POST /concessoes/:concessaoId/resultado
   */
  criarResultado: {
    examples: {
      superacao: SwaggerExamples.superacaoVulnerabilidade,
      mudanca: SwaggerExamples.mudancaTerritorio,
      obito: SwaggerExamples.obitoBeneficiario,
      descumprimento: SwaggerExamples.descumprimentoCondicionalidades,
      agravamento: SwaggerExamples.agravamentoSituacao,
      alteracaoRenda: SwaggerExamples.alteracaoRendaFamiliar,
    }
  },

  /**
   * Configuração para respostas de erro
   */
  errosValidacao: {
    examples: {
      combinacaoInvalida: SwaggerExamples.erroValidacaoSUAS,
      documentosAusentes: SwaggerExamples.erroDocumentosObrigatorios,
    }
  },

  /**
   * Configuração para erros de permissão
   */
  errosPermissao: {
    examples: {
      acessoNegado: SwaggerExamples.erroPermissao,
    }
  }
};