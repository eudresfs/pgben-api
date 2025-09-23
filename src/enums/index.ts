/**
 * Arquivo de índice para centralizar todas as exportações dos enums do sistema.
 * Este arquivo facilita as importações e resolve problemas de dependências circulares.
 */

// Enums básicos do sistema
export { Status } from './status.enum';
export { Sexo } from './sexo.enum';
export { EstadoCivil } from './estado-civil.enum';
export { ParentescoEnum } from './parentesco.enum';
export { EscolaridadeEnum } from './escolaridade.enum';
export { SituacaoTrabalhoEnum } from './situacao-trabalho.enum';

// Enums de benefícios
export { TipoBeneficio } from './tipo-beneficio.enum';
export { StatusSolicitacao } from './status-solicitacao.enum';
export {
  TipoSolicitacaoEnum,
  TipoSolicitacaoLabels,
  getTipoSolicitacaoLabel,
  isValidTipoSolicitacao
} from './tipo-solicitacao.enum';
export {
  TipoConcessaoEnum,
  TipoConcessaoLabels,
  getTipoConcessaoLabel,
  isValidTipoConcessao
} from './tipo-concessao.enum';
export { TipoUrnaEnum } from './tipo-urna.enum';
export { TransladoEnum } from './translado.enum';
export { PublicoPrioritarioAluguel } from './publico-prioritario-aluguel.enum';
export { EspecificacaoAluguel } from './especificacao-aluguel.enum';
export { OrigemAtendimentoEnum } from './origem-atendimento.enum';
export { PeriodicidadeEnum } from './periodicidade.enum';
export { StatusConcessao } from './status-concessao.enum'
export {
  CategoriaBeneficio,
  CATEGORIA_BENEFICIO_LABELS,
  CATEGORIA_BENEFICIO_DESCRICOES,
  getCategoriaLabel,
  getCategoriaDescricao,
  isCategoriaValida
} from './categoria-beneficio.enum';

// Enums de resultado de benefício cessado
export { MotivoEncerramentoBeneficio } from './motivo-encerramento-beneficio.enum';
export { StatusVulnerabilidade } from './status-vulnerabilidade.enum';
export { TipoDocumentoComprobatorio } from './tipo-documento-comprobatorio.enum';

// Enums de pagamento
export { MetodoPagamentoEnum } from './metodo-pagamento.enum';
export { StatusPagamentoEnum } from './status-pagamento.enum';
export { MetodoConfirmacaoEnum } from './metodo-confirmacao.enum';

// Enums bancários
export {
  TipoConta,
  TipoChavePix,
  CodigoBanco,
  NOMES_BANCOS,
  getNomeBanco,
  isPoupancaSocialBB,
} from './info-bancaria.enum';

// Enums de workflow e auditoria
export { WorkflowAcaoEnum } from './workflow-acao.enum';
export { TipoOperacao } from './tipo-operacao.enum';
export { StatusAuditoria } from './status-auditoria.enum';
export { StatusDocumento } from './status-documento.enum';

// Enums de configuração
export { ParametroTipoEnum } from './parametro-tipo.enum';
export { TemplateTipoEnum } from './template-tipo.enum';
export { IntegracaoTipoEnum } from './integracao-tipo.enum';

// Enums de dados e tipos
export { TipoDado } from './tipo-dado.enum';
export { TipoArquivo } from './tipo-arquivo.enum';
export { TipoDocumentoEnum } from './tipo-documento.enum';
export { TipoContextoNatalidade } from './tipo-contexto-natalidade.enum';

// Enums de filtros avançados
export {
  PeriodoPredefinido,
  PERIODO_PREDEFINIDO_LABELS,
  getPeriodoLabel,
  isPeriodoPersonalizado,
  PERIODOS_RECENTES,
  PERIODOS_HISTORICOS
} from './periodo-predefinido.enum';
export {
  Prioridade,
  PRIORIDADE_LABELS,
  PRIORIDADE_VALORES,
  PRIORIDADE_CORES,
  getPrioridadeLabel,
  getPrioridadeValor,
  getPrioridadeCor,
  PRIORIDADES_ORDENADAS,
  PRIORIDADES_URGENTES,
  PRIORIDADES_NORMAIS
} from './prioridade.enum';

// Enums de monitoramento e visitas domiciliares
export { StatusAgendamento, STATUS_AGENDAMENTO_LABELS, STATUS_AGENDAMENTO_ATIVOS, STATUS_AGENDAMENTO_FINALIZADOS, isStatusAgendamentoAtivo, isStatusAgendamentoFinalizado, getStatusAgendamentoLabel } from './status-agendamento.enum';
export { TipoVisita, TIPO_VISITA_LABELS, TIPO_VISITA_DESCRICOES, TIPOS_VISITA_PRIORITARIOS, TIPOS_VISITA_OBRIGATORIOS, isTipoVisitaPrioritario, isTipoVisitaObrigatorio, getTipoVisitaLabel } from './tipo-visita.enum';
export { ResultadoVisita, RESULTADO_VISITA_LABELS, RESULTADO_VISITA_DESCRICOES, RESULTADOS_CONFORMES, RESULTADOS_NAO_CONFORMES, RESULTADOS_VISITA_NAO_REALIZADA, RESULTADOS_REQUEREM_REAGENDAMENTO, isResultadoConforme, isResultadoNaoConforme, isVisitaNaoRealizada, requerReagendamento } from './resultado-visita.enum';
export { PrioridadeVisita, PRIORIDADE_VISITA_LABELS, PRIORIDADE_VISITA_DESCRICOES, PRIORIDADE_VISITA_VALORES, PRIORIDADE_VISITA_CORES, PRIORIDADE_VISITA_PRAZOS, PRIORIDADES_NOTIFICACAO_IMEDIATA, getValorPrioridade, getPrazoPrioridade, requerNotificacaoImediata, compararPrioridades, getCorPrioridade, getPrioridadeVisitaLabel, getPrioridadeVisitaCor, getPrioridadeVisitaPrazo } from './prioridade-visita.enum';

// Enums de segurança e usuários
export { Role } from './role.enum';
export { Role as UserRole } from './role.enum';
