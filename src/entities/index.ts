// Arquivo de índice para todas as entidades do sistema
// Este arquivo centraliza as exportações de todas as entidades para facilitar as importações

// Entidades de Alertas e Métricas
export { AlertaMetrica } from './alerta-metrica.entity';
export { Metrica } from './metrica.entity';
export {
  MetricaConfiguracao,
  TipoAgendamento,
  EstrategiaAmostragem,
} from './metrica-configuracao.entity';
export {
  MetricaDefinicao,
  GranularidadeTemporal,
} from './metrica-definicao.entity';
export { MetricaDocumento } from './metrica-documento.entity';
export { MetricaHttp } from './metrica-http.entity';
export { MetricaSeguranca } from './metrica-seguranca.entity';
export { MetricaSistema } from './metrica-sistema.entity';
export { MetricaSnapshot } from './metrica-snapshot.entity';
export { RegistroMetrica } from './registro-metrica.entity';
export { RegraAlerta } from './regra-alerta.entity';

// Entidades de Benefícios
export { TipoBeneficio } from './tipo-beneficio.entity';
export { CampoDinamicoBeneficio } from './campo-dinamico-beneficio.entity';
export { TipoBeneficioSchema } from './tipo-beneficio-schema.entity';
// Alias para compatibilidade
export { FluxoBeneficio } from './fluxo-beneficio.entity';
export { WorkflowBeneficio } from './workflow-beneficio.entity';

// Entidades de Dados Específicos de Benefícios (dados do cidadão)
export { DadosNatalidade } from './dados-natalidade.entity';
export { DadosAluguelSocial } from './dados-aluguel-social.entity';
export { DadosFuneral } from './dados-funeral.entity';
export { DadosCestaBasica } from './dados-cesta-basica.entity';

// Entidades de Cidadão e Família
export { Cidadao } from './cidadao.entity';
export { ComposicaoFamiliar } from './composicao-familiar.entity';
export { DadosSociais } from './dados-sociais.entity';
export { InfoBancaria } from './info-bancaria.entity';
export { SituacaoMoradia } from './situacao-moradia.entity';
// Entidades de Contato e Endereço
export { Contato } from './contato.entity';
export { Endereco } from './endereco.entity';

// Entidades de Configuração
export { ConfiguracaoIntegracao } from './configuracao-integracao.entity';
export { ConfiguracaoNotificacao } from './configuracao-notificacao.entity';
export { ConfiguracaoRenovacao } from './configuracao-renovacao.entity';
export { Parametro } from './parametro.entity';

// Entidades de Documentos
export { Documento } from './documento.entity';
export { DocumentoBatchJob } from './documento-batch-job.entity';
export { RequisitoDocumento } from './requisito-documento.entity';

// Entidades de Histórico e Logs
export { CategoriaLog } from './categoria-log.entity';
export { HistoricoSolicitacao } from './historico-solicitacao.entity';
export { LogAuditoria } from './log-auditoria.entity';
export { RecursoHistorico } from './recurso-historico.entity';

// Entidades de Integração
export { Integrador } from './integrador.entity';
export { IntegradorToken } from './integrador-token.entity';

// Entidades Judiciais
export { DeterminacaoJudicial } from './determinacao-judicial.entity';
export { ProcessoJudicial } from './processo-judicial.entity';

// Entidades de Notificação
export { Notificacao } from './notificacao.entity';
export { NotificationTemplate } from './notification-template.entity';
// Exportações do notification.entity.ts
export {
  NotificacaoSistema,
  TipoNotificacao,
  StatusNotificacaoProcessamento,
  TentativaEntrega,
} from './notification.entity';
// Alias para compatibilidade
export { NotificacaoSistema as Notification } from './notification.entity';

// Entidades de Ocorrências e Demandas
export { DemandaMotivo } from './demanda-motivo.entity';
export { Ocorrencia } from './ocorrencia.entity';

// Entidades de Concessão
export { Concessao } from './concessao.entity';
export { StatusConcessao } from '../enums/status-concessao.enum';
export { HistoricoConcessao } from './historico-concessao.entity';

// Entidades de Pagamento
export { ComprovantePagamento } from './comprovante-pagamento.entity';
export { ConfirmacaoRecebimento } from './confirmacao-recebimento.entity';
export { Pagamento } from './pagamento.entity';

// Entidades de Pendências e Recursos
export { Pendencia, StatusPendencia } from './pendencia.entity';
export { Recurso } from './recurso.entity';

// Entidades de Segurança e Autenticação
export { JwtBlacklist } from './jwt-blacklist.entity';
export { Role } from './role.entity';
export { TokenRevogado } from './token-revogado.entity';
export { Usuario } from './usuario.entity';

// Entidades de Setores e Unidades
export { Setor } from './setor.entity';
export { SetorUnidade } from './setor-unidade.entity';
export { Unidade } from './unidade.entity';

// Entidades de Solicitação
export { Solicitacao } from './solicitacao.entity';
// Exportação do enum StatusSolicitacao
export { StatusSolicitacao } from '../enums/status-solicitacao.enum';

// Entidades de Upload
export {
  UploadSession,
  UploadSessionStatus,
} from '../modules/easy-upload/entities/upload-session.entity';
export {
  UploadToken,
  UploadTokenStatus,
} from '../modules/easy-upload/entities/upload-token.entity';

// Exportações de Auth/Permissões
export { ScopeType } from './user-permission.entity';
