import { ConfirmacaoRecebimento } from '../../../entities/confirmacao-recebimento.entity';
import { ConfirmacaoResponseDto } from '../dtos/confirmacao-response.dto';

/**
 * Utility para mapeamento entre entidades de confirmação e DTOs
 * Centraliza a lógica de conversão evitando duplicação no controller
 */
export class ConfirmacaoMapper {
  /**
   * Converte entidade para DTO de resposta
   */
  static async toResponseDto(
    confirmacao: ConfirmacaoRecebimento,
  ): Promise<ConfirmacaoResponseDto> {
    if (!confirmacao) {
      throw new Error('Confirmação não pode ser nula');
    }

    return {
      id: confirmacao.id,
      pagamentoId: confirmacao.pagamento_id,
      dataConfirmacao: confirmacao.data_confirmacao,
      metodoConfirmacao: confirmacao.metodo_confirmacao,
      responsavelConfirmacao: {
        id: confirmacao.responsavel_confirmacao?.id || 'sistema',
        nome: confirmacao.responsavel_confirmacao?.nome || 'Sistema',
        role: 'Sistema',
      },
      destinatario: confirmacao.destinatario
        ? {
            id: confirmacao.destinatario.id,
            nome: confirmacao.destinatario.nome,
            relacao: 'Beneficiário',
          }
        : undefined,
      observacoes: confirmacao.observacoes,
      createdAt: confirmacao.created_at,
      updatedAt: confirmacao.updated_at,
    };
  }

  /**
   * Converte lista de entidades para lista de DTOs
   */
  static async toResponseDtoList(
    confirmacoes: ConfirmacaoRecebimento[],
  ): Promise<ConfirmacaoResponseDto[]> {
    if (!Array.isArray(confirmacoes)) {
      return [];
    }

    const promises = confirmacoes.map((confirmacao) =>
      this.toResponseDto(confirmacao),
    );
    return await Promise.all(promises);
  }

  /**
   * Converte DTO de criação para dados da entidade
   */
  static fromCreateDto(
    createDto: any,
    pagamentoId: string,
    usuarioId: string,
  ): Partial<ConfirmacaoRecebimento> {
    return {
      pagamento_id: pagamentoId,
      data_confirmacao: createDto.dataConfirmacao || new Date(),
      metodo_confirmacao: createDto.metodoConfirmacao,
      confirmado_por: usuarioId,
      destinatario_id: createDto.destinatarioId,
      observacoes: createDto.observacoes?.trim(),
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  /**
   * Cria objeto de status de confirmação
   */
  static createStatusResponse(confirmacoes: ConfirmacaoRecebimento[]): {
    temConfirmacao: boolean;
    status: string;
    quantidadeConfirmacoes: number;
    ultimaConfirmacao?: {
      dataConfirmacao: Date;
      metodoConfirmacao: string;
      responsavel: string;
    };
  } {
    const temConfirmacao = confirmacoes.length > 0;
    const ultimaConfirmacao = confirmacoes[0]; // Assumindo que vem ordenado por data DESC

    return {
      temConfirmacao,
      status: temConfirmacao ? 'CONFIRMADO' : 'PENDENTE_CONFIRMACAO',
      quantidadeConfirmacoes: confirmacoes.length,
      ultimaConfirmacao: ultimaConfirmacao
        ? {
            dataConfirmacao: ultimaConfirmacao.data_confirmacao,
            metodoConfirmacao: ultimaConfirmacao.metodo_confirmacao,
            responsavel: ultimaConfirmacao.confirmado_por,
          }
        : undefined,
    };
  }

  /**
   * Máscara CPF para exibição
   */
  private static mascaraCpf(cpf: string): string {
    if (!cpf) return '';

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) return cpf;

    return `***.***.${cpfLimpo.slice(6, 9)}-**`;
  }

  /**
   * Valida dados de confirmação antes do mapeamento
   */
  static validateConfirmacaoData(createDto: any): string[] {
    const errors: string[] = [];

    if (!createDto.metodoConfirmacao) {
      errors.push('Método de confirmação é obrigatório');
    }

    if (
      createDto.metodoConfirmacao &&
      !['PRESENCIAL', 'TELEFONE', 'EMAIL', 'SMS', 'WHATSAPP'].includes(
        createDto.metodoConfirmacao,
      )
    ) {
      errors.push('Método de confirmação inválido');
    }

    if (createDto.dataConfirmacao) {
      const dataConfirmacao = new Date(createDto.dataConfirmacao);
      const agora = new Date();

      if (dataConfirmacao > agora) {
        errors.push('Data de confirmação não pode ser futura');
      }

      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

      if (dataConfirmacao < trintaDiasAtras) {
        errors.push('Data de confirmação não pode ser anterior a 30 dias');
      }
    }

    if (createDto.observacoes && createDto.observacoes.length > 500) {
      errors.push('Observações não podem exceder 500 caracteres');
    }

    return errors;
  }
}
