export enum TipoDocumentoEnum {
  // Documentos de identificação
  CPF = 'cpf',
  RG = 'rg',
  CNH = 'cnh',
  PASSAPORTE = 'passaporte',

  // Certidões
  CERTIDAO_NASCIMENTO = 'certidao_nascimento',
  CERTIDAO_CASAMENTO = 'certidao_casamento',
  CERTIDAO_OBITO = 'certidao_obito',

  // Comprovantes básicos
  COMPROVANTE_RESIDENCIA = 'comprovante_residencia',
  COMPROVANTE_RENDA = 'comprovante_renda',
  COMPROVANTE_ESCOLARIDADE = 'comprovante_escolaridade',

  // Documentos médicos e de saúde
  DECLARACAO_MEDICA = 'declaracao_medica',
  CARTAO_VACINA = 'cartao_vacina',
  CARTAO_SUS = 'cartao_sus',
  LAUDO_MEDICO = 'laudo_medico',
  ATESTADO_MEDICO = 'atestado_medico',
  EXAME_PRE_NATAL = 'exame_pre_natal',

  // Documentos habitacionais
  CONTRATO_ALUGUEL = 'contrato_aluguel',
  ESCRITURA_IMOVEL = 'escritura_imovel',
  IPTU = 'iptu',
  CONTA_AGUA = 'conta_agua',
  CONTA_LUZ = 'conta_luz',
  CONTA_TELEFONE = 'conta_telefone',

  // Documentos trabalhistas e previdenciários
  CARTEIRA_TRABALHO = 'carteira_trabalho',
  COMPROVANTE_DESEMPREGO = 'comprovante_desemprego',
  EXTRATO_FGTS = 'extrato_fgts',
  COMPROVANTE_APOSENTADORIA = 'comprovante_aposentadoria',
  COMPROVANTE_PENSAO = 'comprovante_pensao',
  COMPROVANTE_BENEFICIO_INSS = 'comprovante_beneficio_inss',

  // Documentos bancários
  EXTRATO_BANCARIO = 'extrato_bancario',
  COMPROVANTE_PIX = 'comprovante_pix',
  DADOS_BANCARIOS = 'dados_bancarios',

  // Documentos familiares e sociais
  DECLARACAO_COMPOSICAO_FAMILIAR = 'declaracao_composicao_familiar',
  DECLARACAO_UNIAO_ESTAVEL = 'declaracao_uniao_estavel',
  GUARDA_MENOR = 'guarda_menor',
  TUTELA = 'tutela',

  // Documentos específicos para benefícios
  BOLETIM_OCORRENCIA = 'boletim_ocorrencia',
  MEDIDA_PROTETIVA = 'medida_protetiva',
  TERMO_ACOLHIMENTO = 'termo_acolhimento',
  RELATORIO_SOCIAL = 'relatorio_social',
  PARECER_TECNICO = 'parecer_tecnico',

  // Documentos de programas sociais
  CARTAO_CADUNICO = 'cartao_cadunico',
  FOLHA_RESUMO_CADUNICO = 'folha_resumo_cadunico',
  COMPROVANTE_BOLSA_FAMILIA = 'comprovante_bolsa_familia',
  COMPROVANTE_BPC = 'comprovante_bpc',

  // Documentos educacionais
  DECLARACAO_ESCOLAR = 'declaracao_escolar',
  HISTORICO_ESCOLAR = 'historico_escolar',
  MATRICULA_ESCOLAR = 'matricula_escolar',

  // Documentos específicos para mortalidade
  DECLARACAO_OBITO = 'declaracao_obito',
  AUTORIZACAO_SEPULTAMENTO = 'autorizacao_sepultamento',
  COMPROVANTE_PARENTESCO = 'comprovante_parentesco',

  // Documentos específicos para natalidade
  CARTAO_PRE_NATAL = 'cartao_pre_natal',
  DECLARACAO_NASCIDO_VIVO = 'declaracao_nascido_vivo',
  COMPROVANTE_GESTACAO = 'comprovante_gestacao',

  // Documentos específicos para passagens
  COMPROVANTE_VIAGEM = 'comprovante_viagem',
  AUTORIZACAO_VIAGEM = 'autorizacao_viagem',
  BILHETE_PASSAGEM = 'bilhete_passagem',

  // Documentos diversos
  PROCURACAO = 'procuracao',
  DECLARACAO_HIPOSSUFICIENCIA = 'declaracao_hipossuficiencia',
  TERMO_RESPONSABILIDADE = 'termo_responsabilidade',
  FOTO_3X4 = 'foto_3x4',
  OUTRO = 'outro',
}
