import { LiberarPagamentoDto } from '../dtos/liberar-pagamento.dto';

/**
 * Command para liberação de pagamento
 */
export class LiberarPagamentoCommand {
  constructor(
    public readonly pagamentoId: string,
    public readonly dadosLiberacao: LiberarPagamentoDto,
    public readonly usuarioId: string,
    public readonly async: boolean = false,
  ) {}
}
