import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { Pagamento } from '../../../entities/pagamento.entity';

/**
 * Utilitário para validações comuns de pagamento
 * Consolida validações duplicadas entre diferentes services
 */
export class PagamentoValidationUtil {
  /**
   * Valida se um pagamento existe
   */
  static validarExistencia(pagamento: Pagamento | null, pagamentoId: string): void {
    if (!pagamento) {
      throw new NotFoundException(`Pagamento ${pagamentoId} não encontrado`);
    }
  }

  /**
   * Valida se um pagamento pode receber comprovantes
   */
  static validarParaComprovante(pagamento: Pagamento): void {
    const statusPermitidos = [StatusPagamentoEnum.PENDENTE, StatusPagamentoEnum.LIBERADO, StatusPagamentoEnum.PAGO];
    
    if (!statusPermitidos.includes(pagamento.status)) {
      throw new BadRequestException(
        `Não é possível anexar comprovantes a um pagamento ${pagamento.status.toLowerCase()}`
      );
    }
  }

  /**
   * Valida se um pagamento pode ser confirmado
   */
  static validarParaConfirmacao(pagamento: Pagamento): void {
    // Verificar status válido para confirmação
    const statusPermitidos = [StatusPagamentoEnum.LIBERADO, StatusPagamentoEnum.PAGO];
    
    if (!statusPermitidos.includes(pagamento.status)) {
      throw new ConflictException(
        `Pagamento deve estar liberado ou pago para receber confirmação. Status atual: ${pagamento.status}`
      );
    }

    // Verificar se pagamento tem valor
    if (!pagamento.valor || pagamento.valor <= 0) {
      throw new BadRequestException('Pagamento sem valor válido não pode ser confirmado');
    }

    // Verificar se não está vencido
    if (pagamento.status === StatusPagamentoEnum.VENCIDO) {
      throw new ConflictException('Pagamento vencido não pode ser confirmado');
    }
  }

  /**
   * Valida arquivo de comprovante
   */
  static validarArquivo(file: Express.Multer.File, maxSize: number, allowedTypes: string[]): void {
    if (!file) {
      throw new BadRequestException('Arquivo é obrigatório');
    }

    if (file.size > maxSize) {
      throw new BadRequestException(`Arquivo muito grande. Tamanho máximo: ${maxSize / 1024 / 1024}MB`);
    }

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Tipo de arquivo não permitido. Tipos aceitos: ${allowedTypes.join(', ')}`);
    }

    if (!file.originalname || file.originalname.trim() === '') {
      throw new BadRequestException('Nome do arquivo é obrigatório');
    }
  }

  /**
   * Valida valor do pagamento
   */
  static validarValor(valor: number): void {
    if (!valor || valor <= 0) {
      throw new BadRequestException('Valor do pagamento deve ser positivo');
    }

    if (valor > 10000) {
      throw new BadRequestException('Valor do pagamento excede o limite máximo permitido');
    }
  }

  /**
   * Valida transição de status do pagamento
   */
  static validarTransicaoStatus(statusAtual: StatusPagamentoEnum, novoStatus: StatusPagamentoEnum): void {
    const transicoesPermitidas: Record<StatusPagamentoEnum, StatusPagamentoEnum[]> = {
      [StatusPagamentoEnum.PENDENTE]: [
        StatusPagamentoEnum.LIBERADO,
        StatusPagamentoEnum.AGENDADO,
        StatusPagamentoEnum.CANCELADO,
        StatusPagamentoEnum.VENCIDO,
      ],
      [StatusPagamentoEnum.AGENDADO]: [
        StatusPagamentoEnum.LIBERADO,
        StatusPagamentoEnum.CANCELADO,
      ],
      [StatusPagamentoEnum.LIBERADO]: [
        StatusPagamentoEnum.PAGO,
        StatusPagamentoEnum.CONFIRMADO,
        StatusPagamentoEnum.CANCELADO,
      ],
      [StatusPagamentoEnum.PAGO]: [
        StatusPagamentoEnum.CONFIRMADO,
      ],
      [StatusPagamentoEnum.CONFIRMADO]: [],
      [StatusPagamentoEnum.CANCELADO]: [],
      [StatusPagamentoEnum.VENCIDO]: [
        StatusPagamentoEnum.PENDENTE,
        StatusPagamentoEnum.CANCELADO,
      ],
      [StatusPagamentoEnum.SUSPENSO]: [
        StatusPagamentoEnum.PENDENTE,
        StatusPagamentoEnum.CANCELADO,
      ],
    };

    if (!transicoesPermitidas[statusAtual]?.includes(novoStatus)) {
      throw new BadRequestException(
        `Transição de status inválida: ${statusAtual} -> ${novoStatus}`
      );
    }
  }
}