/**
 * Mensagens de erro para o módulo PDF
 */
export const MENSAGENS_ERRO = {
  DADOS_INVALIDOS: 'Dados fornecidos são inválidos para geração do PDF',
  TEMPLATE_NAO_ENCONTRADO: 'Template não encontrado',
  CONFIGURACAO_INVALIDA: 'Configuração do PDF é inválida',
  ERRO_GERACAO: 'Erro interno na geração do PDF',
  ARQUIVO_NAO_ENCONTRADO: 'Arquivo não encontrado',
  FORMATO_INVALIDO: 'Formato de arquivo inválido',
  TAMANHO_EXCEDIDO: 'Tamanho do arquivo excede o limite permitido',
  PERMISSAO_NEGADA: 'Permissão negada para acessar o arquivo',
  MEMORIA_INSUFICIENTE: 'Memória insuficiente para processar o arquivo',
  TIMEOUT_GERACAO: 'Timeout na geração do PDF',
  FONTE_NAO_ENCONTRADA: 'Fonte especificada não foi encontrada',
  IMAGEM_INVALIDA: 'Imagem fornecida é inválida ou corrompida',
  ESTILO_INVALIDO: 'Estilo especificado é inválido',
  CONTEUDO_VAZIO: 'Conteúdo do PDF não pode estar vazio',
  ASSINATURA_INVALIDA: 'Dados de assinatura são inválidos'
} as const;

/**
 * Mensagens de sucesso
 */
export const MENSAGENS_SUCESSO = {
  PDF_GERADO: 'PDF gerado com sucesso',
  TEMPLATE_CRIADO: 'Template criado com sucesso',
  CONFIGURACAO_SALVA: 'Configuração salva com sucesso',
  ARQUIVO_SALVO: 'Arquivo salvo com sucesso'
} as const;

/**
 * Mensagens de validação
 */
export const MENSAGENS_VALIDACAO = {
  TITULO_OBRIGATORIO: 'Título é obrigatório',
  CONTEUDO_OBRIGATORIO: 'Conteúdo é obrigatório',
  TIPO_CONTEUDO_INVALIDO: 'Tipo de conteúdo é inválido',
  ORIENTACAO_INVALIDA: 'Orientação da página é inválida',
  TAMANHO_PAPEL_INVALIDO: 'Tamanho do papel é inválido',
  MARGEM_INVALIDA: 'Valores de margem são inválidos',
  NOME_TEMPLATE_OBRIGATORIO: 'Nome do template é obrigatório',
  TIPO_TEMPLATE_INVALIDO: 'Tipo de template é inválido',
  NOME_ASSINATURA_OBRIGATORIO: 'Nome da assinatura é obrigatório',
  TIPO_ASSINATURA_INVALIDO: 'Tipo de assinatura é inválido',
  AUTOR_OBRIGATORIO: 'Autor é obrigatório para os metadados',
  FORMATO_EMAIL_INVALIDO: 'Formato de email é inválido',
  DATA_INVALIDA: 'Data fornecida é inválida',
  NUMERO_PAGINAS_INVALIDO: 'Número de páginas deve ser maior que zero'
} as const;

/**
 * Mensagens de log
 */
export const MENSAGENS_LOG = {
  INICIANDO_GERACAO: 'Iniciando geração do PDF',
  FINALIZANDO_GERACAO: 'Finalizando geração do PDF',
  APLICANDO_TEMPLATE: 'Aplicando template ao PDF',
  PROCESSANDO_CONTEUDO: 'Processando conteúdo do PDF',
  ADICIONANDO_ASSINATURAS: 'Adicionando assinaturas ao PDF',
  CONFIGURANDO_ESTILOS: 'Configurando estilos do PDF',
  SALVANDO_ARQUIVO: 'Salvando arquivo PDF',
  VALIDANDO_DADOS: 'Validando dados de entrada',
  CARREGANDO_TEMPLATE: 'Carregando template',
  PROCESSANDO_IMAGENS: 'Processando imagens do documento'
} as const;