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
export { TipoUrnaEnum } from './tipo-urna.enum';
export { TransladoEnum } from './translado.enum';
export { PublicoPrioritarioAluguel } from './publico-prioritario-aluguel.enum';
export { EspecificacaoAluguel } from './especificacao-aluguel.enum';
export { OrigemAtendimentoEnum } from './origem-atendimento.enum';
export { PeriodicidadeEnum } from './periodicidade.enum';

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

// Enums de documentos
export { TipoDocumentoEnum } from './tipo-documento.enum';

// Enums de usuário e permissões
export { Role } from './role.enum';
export { Role as UserRole } from './role.enum';
