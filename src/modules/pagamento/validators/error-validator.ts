import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { MetodoPagamentoEnum } from '../../../enums/metodo-pagamento.enum';

/**
 * Validador de erros para o módulo de pagamento
 * 
 * Centraliza a criação de exceções padronizadas para o módulo,
 * garantindo consistência nas mensagens de erro.
 * 
 * @author Equipe PGBen
 */
export class ErrorValidator {
  /**
   * Gera exceção para solicitação não encontrada
   * @param solicitacaoId ID da solicitação
   */
  static solicitacaoNaoEncontrada(solicitacaoId: string): NotFoundException {
    return new NotFoundException(
      `Solicitação com ID ${solicitacaoId} não encontrada.`
    );
  }

  /**
   * Gera exceção para solicitação não elegível para pagamento
   * @param solicitacaoId ID da solicitação
   * @param status Status atual da solicitação
   */
  static solicitacaoNaoElegivel(solicitacaoId: string, status: string): ConflictException {
    return new ConflictException(
      `Solicitação com ID ${solicitacaoId} não está elegível para pagamento. Status atual: ${status}.`
    );
  }

  /**
   * Gera exceção para pagamento não encontrado
   * @param pagamentoId ID do pagamento
   */
  static pagamentoNaoEncontrado(pagamentoId: string): NotFoundException {
    return new NotFoundException(
      `Pagamento com ID ${pagamentoId} não encontrado.`
    );
  }

  /**
   * Gera exceção para comprovante não encontrado
   * @param comprovanteId ID do comprovante
   */
  static comprovanteNaoEncontrado(comprovanteId: string): NotFoundException {
    return new NotFoundException(
      `Comprovante com ID ${comprovanteId} não encontrado.`
    );
  }

  /**
   * Gera exceção para confirmação não encontrada
   * @param confirmacaoId ID da confirmação
   */
  static confirmacaoNaoEncontrada(confirmacaoId: string): NotFoundException {
    return new NotFoundException(
      `Confirmação de recebimento com ID ${confirmacaoId} não encontrada.`
    );
  }

  /**
   * Gera exceção para cidadão não encontrado
   * @param cidadaoId ID do cidadão
   */
  static cidadaoNaoEncontrado(cidadaoId: string): NotFoundException {
    return new NotFoundException(
      `Cidadão com ID ${cidadaoId} não encontrado.`
    );
  }

  /**
   * Gera exceção para dados bancários não encontrados
   * @param infoBancariaId ID da informação bancária
   */
  static dadosBancariosNaoEncontrados(infoBancariaId: string): NotFoundException {
    return new NotFoundException(
      `Dados bancários com ID ${infoBancariaId} não encontrados.`
    );
  }

  /**
   * Gera exceção para dados bancários inválidos
   * @param motivo Motivo da invalidação
   */
  static dadosBancariosInvalidos(motivo: string): BadRequestException {
    return new BadRequestException(
      `Dados bancários inválidos: ${motivo}.`
    );
  }

  /**
   * Gera exceção para chave PIX inválida
   * @param chave Chave PIX
   * @param tipo Tipo da chave PIX
   */
  static chavePIXInvalida(chave: string, tipo: string): BadRequestException {
    // Mascara a chave PIX para segurança
    const chaveMascarada = chave.length > 4 
      ? `${chave.substring(0, 2)}...${chave.substring(chave.length - 2)}`
      : '****';
    
    return new BadRequestException(
      `Chave PIX do tipo ${tipo} inválida: ${chaveMascarada}.`
    );
  }

  /**
   * Gera exceção para método de pagamento inválido
   * @param metodo Método de pagamento informado
   */
  static metodoPagamentoInvalido(metodo: string): BadRequestException {
    return new BadRequestException(
      `Método de pagamento "${metodo}" inválido. Métodos válidos: ${Object.values(MetodoPagamentoEnum).join(', ')}.`
    );
  }

  /**
   * Gera exceção para transição de status inválida
   * @param statusAtual Status atual do pagamento
   * @param statusDesejado Status desejado
   * @param motivo Motivo da invalidação
   */
  static transicaoStatusInvalida(
    statusAtual: StatusPagamentoEnum,
    statusDesejado: StatusPagamentoEnum,
    motivo: string
  ): ConflictException {
    return new ConflictException(
      `Não é possível alterar o status de ${statusAtual} para ${statusDesejado}: ${motivo}.`
    );
  }

  /**
   * Gera exceção para valor de pagamento inválido
   * @param valor Valor informado
   */
  static valorPagamentoInvalido(valor: number): BadRequestException {
    return new BadRequestException(
      `Valor de pagamento inválido: ${valor}. O valor deve ser maior que zero.`
    );
  }

  /**
   * Gera exceção para data de liberação inválida
   * @param data Data informada
   */
  static dataLiberacaoInvalida(data: Date): BadRequestException {
    return new BadRequestException(
      `Data de liberação inválida: ${data}. A data não pode ser anterior à data atual.`
    );
  }

  /**
   * Gera exceção para arquivo de comprovante inválido
   * @param motivo Motivo da invalidação
   */
  static arquivoComprovanteInvalido(motivo: string): BadRequestException {
    return new BadRequestException(
      `Arquivo de comprovante inválido: ${motivo}.`
    );
  }

  /**
   * Gera exceção para pagamento já confirmado
   * @param pagamentoId ID do pagamento
   */
  static pagamentoJaConfirmado(pagamentoId: string): ConflictException {
    return new ConflictException(
      `Pagamento com ID ${pagamentoId} já foi confirmado e não pode ser alterado.`
    );
  }

  /**
   * Gera exceção para pagamento já cancelado
   * @param pagamentoId ID do pagamento
   */
  static pagamentoJaCancelado(pagamentoId: string): ConflictException {
    return new ConflictException(
      `Pagamento com ID ${pagamentoId} já foi cancelado e não pode ser alterado.`
    );
  }

  /**
   * Gera exceção para pagamento não liberado
   * @param pagamentoId ID do pagamento
   * @param statusAtual Status atual do pagamento
   */
  static pagamentoNaoLiberado(pagamentoId: string, statusAtual: StatusPagamentoEnum): ConflictException {
    return new ConflictException(
      `Pagamento com ID ${pagamentoId} não está liberado para confirmação. Status atual: ${statusAtual}.`
    );
  }

  /**
   * Gera exceção para erro de integração com outro módulo
   * @param modulo Nome do módulo
   * @param operacao Operação que falhou
   * @param motivo Motivo da falha
   */
  static erroIntegracao(modulo: string, operacao: string, motivo: string): BadRequestException {
    return new BadRequestException(
      `Erro na integração com o módulo ${modulo} durante ${operacao}: ${motivo}.`
    );
  }
}
