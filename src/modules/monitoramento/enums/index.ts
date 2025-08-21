/**
 * Exports de todos os enums do módulo de monitoramento
 */

// Enums de agendamento (importados do diretório global de enums)
export { StatusAgendamento } from '../../../enums/status-agendamento.enum';
export { TipoVisita } from '../../../enums/tipo-visita.enum';
export { PrioridadeVisita } from '../../../enums/prioridade-visita.enum';

// Enums de visita
export { ResultadoVisita } from '../../../enums/resultado-visita.enum';

// Enums de histórico (definidos na entidade)
export { TipoAcaoHistorico, CategoriaHistorico } from '../entities/historico-monitoramento.entity';

// Enums de avaliação
export { TipoAvaliacao } from '../../../enums/tipo-avaliacao.enum';
export { ResultadoAvaliacao } from '../../../enums/resultado-avaliacao.enum';
export { StatusVisita } from '../../../enums/status-visita.enum';

// Re-export dos enums de arquivo
export { TipoArquivo } from '../../../enums/tipo-arquivo.enum';