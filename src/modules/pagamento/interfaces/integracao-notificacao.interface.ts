import { IContextoUsuario, IResultadoOperacao } from './integracao-solicitacao.interface';

/**
 * Interface para configuração de notificação
 */
export interface IConfigNotificacao {
  titulo: string;
  mensagem: string;
  prioridade: string;
  canais: string[];
}

/**
 * Interface para notificação formatada
 */
export interface INotificacao {
  id: string;
  tipo: any;
  titulo: string;
  mensagem: string;
  destinatarioId: string;
  lida: boolean;
  dataLeitura?: Date;
  dataEnvio: Date;
  prioridade: string;
  canais: string[];
  status: any;
  entidadeId?: string;
  entidadeTipo?: string;
  dadosAdicionais?: any;
}

/**
 * Interface para operações de notificação
 * Abstrai as dependências do serviço de pagamento com o módulo de notificações
 */
export interface IIntegracaoNotificacaoService {
  /**
   * Envia notificação de pagamento liberado
   * @param dadosNotificacao Dados da notificação
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado do envio
   */
  notificarPagamentoLiberado(
    dadosNotificacao: INotificacaoPagamento,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IResultadoEnvio>>;

  /**
   * Envia notificação de pagamento processado
   * @param dadosNotificacao Dados da notificação
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado do envio
   */
  notificarPagamentoProcessado(
    dadosNotificacao: INotificacaoPagamento,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IResultadoEnvio>>;

  /**
   * Envia notificação de pagamento cancelado
   * @param dadosNotificacao Dados da notificação
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado do envio
   */
  notificarPagamentoCancelado(
    dadosNotificacao: INotificacaoPagamentoCancelado,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IResultadoEnvio>>;

  /**
   * Envia notificação de documentos pendentes
   * @param dadosNotificacao Dados da notificação
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado do envio
   */
  notificarDocumentosPendentes(
    dadosNotificacao: INotificacaoDocumentos,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IResultadoEnvio>>;

  /**
   * Envia notificação personalizada
   * @param notificacao Dados da notificação personalizada
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado do envio
   */
  enviarNotificacaoPersonalizada(
    notificacao: INotificacaoPersonalizada,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IResultadoEnvio>>;

  /**
   * Busca histórico de notificações
   * @param filtros Filtros de busca
   * @param contextoUsuario Contexto do usuário logado
   * @returns Histórico de notificações
   */
  buscarHistoricoNotificacoes(
    filtros: IFiltrosNotificacao,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IPaginatedNotificacoes>>;

  /**
   * Reenviar notificação
   * @param notificacaoId ID da notificação
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado do reenvio
   */
  reenviarNotificacao(
    notificacaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IResultadoEnvio>>;

  /**
   * Configurar preferências de notificação
   * @param cidadaoId ID do cidadão
   * @param preferencias Preferências de notificação
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da configuração
   */
  configurarPreferencias(
    cidadaoId: string,
    preferencias: IPreferenciasNotificacao,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<void>>;

  /**
   * Validar canais de notificação
   * @param cidadaoId ID do cidadão
   * @param canais Canais para validação
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da validação
   */
  validarCanais(
    cidadaoId: string,
    canais: ICanalNotificacao[],
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IValidacaoCanais>>;
}

/**
 * Interface para notificação de pagamento
 */
export interface INotificacaoPagamento {
  pagamentoId: string;
  solicitacaoId: string;
  cidadaoId: string;
  cidadaoNome: string;
  cidadaoEmail?: string;
  cidadaoTelefone?: string;
  valor: number;
  tipoBeneficio: string;
  dataProcessamento: Date;
  metodoPagamento: string;
  numeroComprovante?: string;
  observacoes?: string;
  canais: TipoCanal[];
  prioridade: 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE';
  agendarPara?: Date;
}

/**
 * Interface para notificação de pagamento cancelado
 */
export interface INotificacaoPagamentoCancelado extends INotificacaoPagamento {
  motivoCancelamento: string;
  dataCancelamento: Date;
  canceladoPor: string;
  podeRecorrer: boolean;
  prazoRecurso?: Date;
}

/**
 * Interface para notificação de documentos
 */
export interface INotificacaoDocumentos {
  solicitacaoId: string;
  cidadaoId: string;
  cidadaoNome: string;
  cidadaoEmail?: string;
  cidadaoTelefone?: string;
  tipoBeneficio: string;
  documentosPendentes: IDocumentoPendente[];
  prazoLimite: Date;
  canais: TipoCanal[];
  prioridade: 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE';
  lembretes: {
    enviarEm: Date[];
    ultimoLembrete?: Date;
  };
}

/**
 * Interface para documento pendente
 */
export interface IDocumentoPendente {
  tipo: string;
  descricao: string;
  obrigatorio: boolean;
  formatosAceitos: string[];
  tamanhoMaximo: number;
  observacoes?: string;
}

/**
 * Interface para notificação personalizada
 */
export interface INotificacaoPersonalizada {
  destinatarios: IDestinatario[];
  assunto: string;
  conteudo: string;
  template?: string;
  variaveis?: Record<string, any>;
  canais: TipoCanal[];
  prioridade: 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE';
  agendarPara?: Date;
  expirarEm?: Date;
  categoria: string;
  subcategoria?: string;
  anexos?: IAnexoNotificacao[];
  configuracoes?: {
    confirmarLeitura: boolean;
    permitirResposta: boolean;
    criptografar: boolean;
  };
}

/**
 * Interface para destinatário
 */
export interface IDestinatario {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  tipo: 'CIDADAO' | 'FUNCIONARIO' | 'GESTOR' | 'SISTEMA';
  preferencias?: IPreferenciasNotificacao;
}

/**
 * Interface para anexo de notificação
 */
export interface IAnexoNotificacao {
  nome: string;
  conteudo: Buffer;
  mimeType: string;
  tamanho: number;
}

/**
 * Tipos de canal de notificação
 */
export type TipoCanal = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH' | 'SISTEMA';

/**
 * Interface para canal de notificação
 */
export interface ICanalNotificacao {
  tipo: TipoCanal;
  endereco: string;
  ativo: boolean;
  verificado: boolean;
  principal: boolean;
  configuracoes?: Record<string, any>;
}

/**
 * Interface para resultado de envio
 */
export interface IResultadoEnvio {
  notificacaoId: string;
  status: 'ENVIADO' | 'PENDENTE' | 'FALHOU' | 'AGENDADO';
  canaisEnviados: TipoCanal[];
  canaisFalharam: {
    canal: TipoCanal;
    erro: string;
  }[];
  dataEnvio?: Date;
  dataAgendamento?: Date;
  tentativas: number;
  proximaTentativa?: Date;
  custoEstimado?: number;
  metadados?: Record<string, any>;
}

/**
 * Interface para filtros de notificação
 */
export interface IFiltrosNotificacao {
  dataInicio?: Date;
  dataFim?: Date;
  cidadaoId?: string;
  tipo?: string[];
  canal?: TipoCanal[];
  status?: string[];
  prioridade?: string[];
  categoria?: string[];
  buscarTexto?: string;
  page?: number;
  limit?: number;
  ordenacao?: {
    campo: string;
    direcao: 'ASC' | 'DESC';
  };
}

/**
 * Interface para notificações paginadas
 */
export interface IPaginatedNotificacoes {
  notificacoes: IHistoricoNotificacao[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Interface para histórico de notificação
 */
export interface IHistoricoNotificacao {
  id: string;
  tipo: string;
  destinatario: {
    id: string;
    nome: string;
    tipo: string;
  };
  assunto: string;
  conteudo?: string;
  canais: TipoCanal[];
  status: string;
  prioridade: string;
  dataEnvio?: Date;
  dataLeitura?: Date;
  dataResposta?: Date;
  tentativas: number;
  erros?: string[];
  custoReal?: number;
  metadados?: Record<string, any>;
}

/**
 * Interface para preferências de notificação
 */
export interface IPreferenciasNotificacao {
  canaisPreferidos: TipoCanal[];
  horarioPreferido?: {
    inicio: string; // HH:mm
    fim: string; // HH:mm
  };
  diasSemana?: number[]; // 0-6 (domingo-sábado)
  idioma: string;
  formatoData: string;
  receberPromocoes: boolean;
  receberLembretes: boolean;
  frequenciaMaxima?: {
    quantidade: number;
    periodo: 'HORA' | 'DIA' | 'SEMANA' | 'MES';
  };
  bloqueios?: {
    tipos: string[];
    canais: TipoCanal[];
    temporario?: {
      inicio: Date;
      fim: Date;
    };
  };
}

/**
 * Interface para validação de canais
 */
export interface IValidacaoCanais {
  validos: ICanalValidacao[];
  invalidos: ICanalValidacao[];
  pendentesVerificacao: ICanalValidacao[];
  recomendacoes: string[];
}

/**
 * Interface para canal de validação
 */
export interface ICanalValidacao {
  canal: ICanalNotificacao;
  status: 'VALIDO' | 'INVALIDO' | 'PENDENTE' | 'BLOQUEADO';
  motivo?: string;
  dataVerificacao?: Date;
  proximaVerificacao?: Date;
}