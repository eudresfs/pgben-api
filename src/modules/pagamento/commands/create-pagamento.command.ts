import { PagamentoCreateDto } from '../dtos/pagamento-create.dto';

/**
 * Command para criação de pagamento
 * Implementa Command pattern para separação de responsabilidades
 */
export class CreatePagamentoCommand {
  constructor(
    public readonly pagamentoData: PagamentoCreateDto,
    public readonly usuarioId: string,
    public readonly async: boolean = false,
  ) {}
}
