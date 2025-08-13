/**
 * Exportações centralizadas dos serviços do módulo de aprovação
 */

// === Serviços Principais ===
export { AprovacaoService } from './aprovacao.service';
export { AcaoCriticaService } from './acao-critica.service';
export { ConfiguracaoAprovacaoService } from './configuracao-aprovacao.service';
export { SolicitacaoAprovacaoService } from './solicitacao-aprovacao.service';
export { AprovadorService } from './aprovador.service';
export { HistoricoAprovacaoService } from './historico-aprovacao.service';
export { DelegacaoAprovacaoService } from './delegacao-aprovacao.service';

// === Serviços de Métricas e Análise ===
export { AprovacaoMetricsService } from './aprovacao-metrics.service';

// === Serviços Especializados (quando implementados) ===
// export { NotificacaoAprovacaoService } from './notificacao-aprovacao.service';
// export { EscalacaoService } from './escalacao.service';
// export { ValidacaoAprovacaoService } from './validacao-aprovacao.service';
// export { RelatorioAprovacaoService } from './relatorio-aprovacao.service';
// export { ComplianceAprovacaoService } from './compliance-aprovacao.service';