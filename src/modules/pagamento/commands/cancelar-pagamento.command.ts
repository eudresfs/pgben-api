/**
 * Command para cancelamento de pagamento
 */
export class CancelarPagamentoCommand {
  constructor(
    public readonly pagamentoId: string,
    public readonly motivo: string,
    public readonly usuarioId: string,
    public readonly async: boolean = false,
  ) {}
}
