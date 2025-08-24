// DTOs de Avaliação
export {
  CriarAvaliacaoDto,
  AtualizarAvaliacaoDto,
  AvaliacaoResponseDto,
  FiltrosAvaliacaoDto,
  CriarAvaliacaoLoteDto,
  AvaliacaoLoteResponseDto,
} from './avaliacao.dto';

// DTOs de Relatório
export {
  FiltrosRelatorioDto,
  FiltrosPeriodoDto,
  FiltrosRankingDto,
  FiltrosAnaliseProblemasDto,
  FiltrosHistoricoDto,
  ExportacaoRelatorioDto,
} from './relatorio.dto';

// DTOs básicos já existentes
export {
  CriarAgendamentoDto,
  AtualizarAgendamentoDto,
  AgendamentoResponseDto,
  FiltrosAgendamentoDto,
} from './agendamento.dto';

export {
  RegistrarVisitaDto,
  AtualizarVisitaDto,
  VisitaResponseDto,
  FiltrosVisitaDto,
  IniciarVisitaDto,
  ConcluirVisitaDto,
} from './visita.dto';