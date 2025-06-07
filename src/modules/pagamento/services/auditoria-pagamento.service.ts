import { Injectable, Logger } from '@nestjs/common';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { CreateLogAuditoriaDto } from '../../auditoria/dto/create-log-auditoria.dto';

/**
 * Serviço para registro de auditoria de operações do módulo de pagamento
 *
 * Este serviço implementa a integração com o módulo de auditoria do sistema,
 * registrando todas as operações sensíveis relacionadas a pagamentos,
 * comprovantes e confirmações.
 *
 * @author Equipe PGBen
 */
@Injectable()
export class AuditoriaPagamentoService {
  private readonly logger = new Logger(AuditoriaPagamentoService.name);

  constructor(private readonly auditoriaService: AuditoriaService) {}

  /**
   * Registra uma operação de criação de pagamento
   *
   * @param pagamentoId ID do pagamento criado
   * @param solicitacaoId ID da solicitação relacionada
   * @param usuarioId ID do usuário que realizou a operação
   * @param dados Dados do pagamento
   */
  async registrarCriacaoPagamento(
    pagamentoId: string,
    solicitacaoId: string,
    usuarioId: string,
    dados: any,
    contexto?: { ip?: string; userAgent?: string; endpoint?: string; metodoHttp?: string },
  ): Promise<void> {
    try {
      // Mascarar dados sensíveis
      const dadosMascarados = this.mascararDadosSensiveisPagamento(dados);

      const logDto = new CreateLogAuditoriaDto();
      logDto.tipo_operacao = TipoOperacao.CREATE;
      logDto.entidade_afetada = 'Pagamento';
      logDto.entidade_id = pagamentoId;
      logDto.usuario_id = usuarioId;
      logDto.endpoint = contexto?.endpoint || '/api/v1/pagamentos';
      logDto.metodo_http = contexto?.metodoHttp || 'POST';
      logDto.ip_origem = contexto?.ip;
      logDto.user_agent = contexto?.userAgent;
      logDto.descricao = `Criação de pagamento para solicitação ${solicitacaoId}`;
      logDto.dados_novos = dadosMascarados;
      logDto.dados_anteriores = undefined;

      await this.auditoriaService.create(logDto);
      this.logger.log(`Auditoria de criação de pagamento registrada: ${pagamentoId}`);
    } catch (error) {
      this.logger.error(
        `Erro ao registrar auditoria de criação de pagamento ${pagamentoId}:`,
        error.stack,
      );
      // Não propagar o erro para não afetar o fluxo principal
    }
  }

  /**
   * Registra uma operação de atualização de status de pagamento
   *
   * @param pagamentoId ID do pagamento
   * @param statusAnterior Status anterior
   * @param statusNovo Novo status
   * @param usuarioId ID do usuário que realizou a operação
   * @param observacoes Observações sobre a mudança (opcional)
   */
  async registrarMudancaStatus(
    pagamentoId: string,
    statusAnterior: StatusPagamentoEnum,
    statusNovo: StatusPagamentoEnum,
    usuarioId: string,
    observacoes?: string,
    contexto?: { ip?: string; userAgent?: string; endpoint?: string; metodoHttp?: string },
  ): Promise<void> {
    try {
      const logDto = new CreateLogAuditoriaDto();
      logDto.tipo_operacao = TipoOperacao.UPDATE;
      logDto.entidade_afetada = 'Pagamento';
      logDto.entidade_id = pagamentoId;
      logDto.usuario_id = usuarioId;
      logDto.endpoint = contexto?.endpoint || '/api/v1/pagamentos';
      logDto.metodo_http = contexto?.metodoHttp || 'PATCH';
      logDto.ip_origem = contexto?.ip;
      logDto.user_agent = contexto?.userAgent;
      logDto.descricao = `Mudança de status de pagamento de ${statusAnterior} para ${statusNovo}${observacoes ? ` - ${observacoes}` : ''}`;
      logDto.dados_anteriores = { status: statusAnterior };
      logDto.dados_novos = { status: statusNovo, observacoes };

      await this.auditoriaService.create(logDto);
      this.logger.log(`Auditoria de mudança de status registrada: ${pagamentoId}`);
    } catch (error) {
      this.logger.error(
        `Erro ao registrar auditoria de mudança de status ${pagamentoId}:`,
        error.stack,
      );
      // Não propagar o erro para não afetar o fluxo principal
    }
  }

  /**
   * Registra uma operação de upload de comprovante
   *
   * @param comprovanteId ID do comprovante
   * @param pagamentoId ID do pagamento relacionado
   * @param usuarioId ID do usuário que realizou a operação
   * @param dadosComprovante Dados do comprovante
   */
  async registrarUploadComprovante(
    comprovanteId: string,
    pagamentoId: string,
    usuarioId: string,
    dadosComprovante: any,
    contexto?: { ip?: string; userAgent?: string; endpoint?: string; metodoHttp?: string },
  ): Promise<void> {
    try {
      // Mascarar dados sensíveis do comprovante
      const dadosMascarados = {
        tipoDocumento: dadosComprovante.tipoDocumento,
        nomeArquivo: dadosComprovante.nomeArquivo,
        tamanho: dadosComprovante.tamanho,
        mimeType: dadosComprovante.mimeType,
        // Não incluir dados binários ou URLs completas
      };

      const logDto = new CreateLogAuditoriaDto();
      logDto.tipo_operacao = TipoOperacao.CREATE;
      logDto.entidade_afetada = 'ComprovantePagemento';
      logDto.entidade_id = comprovanteId;
      logDto.usuario_id = usuarioId;
      logDto.endpoint = contexto?.endpoint || '/api/v1/comprovantes';
      logDto.metodo_http = contexto?.metodoHttp || 'POST';
      logDto.ip_origem = contexto?.ip;
      logDto.user_agent = contexto?.userAgent;
      logDto.descricao = `Upload de comprovante para pagamento ${pagamentoId}`;
      logDto.dados_novos = dadosMascarados;
      logDto.dados_anteriores = undefined;

      await this.auditoriaService.create(logDto);
      this.logger.log(`Auditoria de upload de comprovante registrada: ${comprovanteId}`);
    } catch (error) {
      this.logger.error(
        `Erro ao registrar auditoria de upload de comprovante ${comprovanteId}:`,
        error.stack,
      );
      // Não propagar o erro para não afetar o fluxo principal
    }
  }

  /**
   * Registra uma operação de remoção de comprovante
   *
   * @param comprovanteId ID do comprovante
   * @param pagamentoId ID do pagamento relacionado
   * @param usuarioId ID do usuário que realizou a operação
   * @param dadosComprovante Dados do comprovante removido
   */
  async registrarRemocaoComprovante(
    comprovanteId: string,
    pagamentoId: string,
    usuarioId: string,
    dadosComprovante: any,
    contexto?: { ip?: string; userAgent?: string; endpoint?: string; metodoHttp?: string },
  ): Promise<void> {
    try {
      // Mascarar dados sensíveis do comprovante
      const dadosMascarados = {
        tipoDocumento: dadosComprovante.tipoDocumento,
        nomeArquivo: dadosComprovante.nomeArquivo,
        tamanho: dadosComprovante.tamanho,
        mimeType: dadosComprovante.mimeType,
        // Não incluir dados binários ou URLs completas
      };

      const logDto = new CreateLogAuditoriaDto();
      logDto.tipo_operacao = TipoOperacao.DELETE;
      logDto.entidade_afetada = 'ComprovantePagemento';
      logDto.entidade_id = comprovanteId;
      logDto.usuario_id = usuarioId;
      logDto.endpoint = contexto?.endpoint || '/api/v1/comprovantes';
      logDto.metodo_http = contexto?.metodoHttp || 'DELETE';
      logDto.ip_origem = contexto?.ip;
      logDto.user_agent = contexto?.userAgent;
      logDto.descricao = `Remoção de comprovante do pagamento ${pagamentoId}`;
      logDto.dados_anteriores = dadosMascarados;
      logDto.dados_novos = undefined;

      await this.auditoriaService.create(logDto);
      this.logger.log(`Auditoria de remoção de comprovante registrada: ${comprovanteId}`);
    } catch (error) {
      this.logger.error(
        `Erro ao registrar auditoria de remoção de comprovante ${comprovanteId}:`,
        error.stack,
      );
      // Não propagar o erro para não afetar o fluxo principal
    }
  }

  /**
   * Registra uma operação de confirmação de recebimento
   *
   * @param confirmacaoId ID da confirmação
   * @param pagamentoId ID do pagamento relacionado
   * @param usuarioId ID do usuário que realizou a operação
   * @param dadosConfirmacao Dados da confirmação
   */
  async registrarConfirmacaoRecebimento(
    confirmacaoId: string,
    pagamentoId: string,
    usuarioId: string,
    dadosConfirmacao: any,
    contexto?: { ip?: string; userAgent?: string; endpoint?: string; metodoHttp?: string },
  ): Promise<void> {
    try {
      const dadosMascarados = {
        dataConfirmacao: dadosConfirmacao.dataConfirmacao,
        metodoConfirmacao: dadosConfirmacao.metodoConfirmacao,
        destinatarioId: dadosConfirmacao.destinatarioId,
        observacoes: dadosConfirmacao.observacoes,
      };

      const logDto = new CreateLogAuditoriaDto();
      logDto.tipo_operacao = TipoOperacao.CREATE;
      logDto.entidade_afetada = 'ConfirmacaoRecebimento';
      logDto.entidade_id = confirmacaoId;
      logDto.usuario_id = usuarioId;
      logDto.endpoint = contexto?.endpoint || '/api/v1/confirmacoes';
      logDto.metodo_http = contexto?.metodoHttp || 'POST';
      logDto.ip_origem = contexto?.ip;
      logDto.user_agent = contexto?.userAgent;
      logDto.descricao = `Confirmação de recebimento para pagamento ${pagamentoId}`;
      logDto.dados_novos = dadosMascarados;
      logDto.dados_anteriores = undefined;

      await this.auditoriaService.create(logDto);
      this.logger.log(`Auditoria de confirmação de recebimento registrada: ${confirmacaoId}`);
    } catch (error) {
      this.logger.error(
        `Erro ao registrar auditoria de confirmação de recebimento ${confirmacaoId}:`,
        error.stack,
      );
      // Não propagar o erro para não afetar o fluxo principal
    }
  }

  /**
   * Registra um acesso a dados sensíveis
   *
   * @param entidadeId ID da entidade acessada
   * @param tipoEntidade Tipo da entidade
   * @param usuarioId ID do usuário que realizou o acesso
   * @param dadosSensiveisAcessados Lista de campos sensíveis acessados
   */
  async registrarAcessoDadosSensiveis(
    entidadeId: string,
    tipoEntidade: string,
    usuarioId: string,
    dadosSensiveisAcessados: string[],
    contexto?: { ip?: string; userAgent?: string; endpoint?: string; metodoHttp?: string; justificativa?: string },
  ): Promise<void> {
    try {
      const logDto = new CreateLogAuditoriaDto();
      logDto.tipo_operacao = TipoOperacao.READ;
      logDto.entidade_afetada = tipoEntidade;
      logDto.entidade_id = entidadeId;
      logDto.usuario_id = usuarioId;
      logDto.endpoint = contexto?.endpoint;
      logDto.metodo_http = contexto?.metodoHttp || 'GET';
      logDto.ip_origem = contexto?.ip;
      logDto.user_agent = contexto?.userAgent;
      logDto.descricao = `Acesso a dados sensíveis: ${dadosSensiveisAcessados.join(', ')}`;
      logDto.dados_novos = {
        camposAcessados: dadosSensiveisAcessados,
        justificativa: contexto?.justificativa || 'Acesso operacional',
      };
      logDto.dados_anteriores = undefined;

      await this.auditoriaService.create(logDto);
      this.logger.log(`Auditoria de acesso a dados sensíveis registrada: ${entidadeId}`);
    } catch (error) {
      this.logger.error(
        `Erro ao registrar auditoria de acesso a dados sensíveis ${entidadeId}:`,
        error.stack,
      );
      // Não propagar o erro para não afetar o fluxo principal
    }
  }

  /**
   * Mascara dados sensíveis de um pagamento para registro em logs
   *
   * @param dados Dados originais do pagamento
   * @returns Dados com informações sensíveis mascaradas
   */
  private mascararDadosSensiveisPagamento(dados: any): any {
    // Clone profundo dos dados
    const dadosMascarados = JSON.parse(JSON.stringify(dados));

    // Mascarar dados bancários se existirem
    if (dadosMascarados.dadosBancarios) {
      if (dadosMascarados.dadosBancarios.agencia) {
        dadosMascarados.dadosBancarios.agencia = this.mascaraAgencia(
          dadosMascarados.dadosBancarios.agencia,
        );
      }

      if (dadosMascarados.dadosBancarios.conta) {
        dadosMascarados.dadosBancarios.conta = this.mascaraConta(
          dadosMascarados.dadosBancarios.conta,
        );
      }

      if (dadosMascarados.dadosBancarios.pixChave) {
        dadosMascarados.dadosBancarios.pixChave = this.mascaraPixChave(
          dadosMascarados.dadosBancarios.pixChave,
          dadosMascarados.dadosBancarios.pixTipo,
        );
      }
    }

    return dadosMascarados;
  }

  /**
   * Mascara uma agência bancária
   *
   * @param agencia Número da agência
   * @returns Agência mascarada
   */
  private mascaraAgencia(agencia: string): string {
    if (!agencia) {
      return '';
    }

    const agenciaLimpa = agencia.replace(/\D/g, '');

    if (agenciaLimpa.length <= 2) {
      return '****';
    }

    // Manter o primeiro e o último dígito
    const inicio = agenciaLimpa.slice(0, 1);
    const fim = agenciaLimpa.slice(-1);
    const meio = '*'.repeat(agenciaLimpa.length - 2);

    return `${inicio}${meio}${fim}`;
  }

  /**
   * Mascara uma conta bancária
   *
   * @param conta Número da conta
   * @returns Conta mascarada
   */
  private mascaraConta(conta: string): string {
    if (!conta) {
      return '';
    }

    const contaLimpa = conta.replace(/[^\dXx]/g, '');

    if (contaLimpa.length <= 4) {
      return '****';
    }

    // Manter os dois primeiros e os dois últimos dígitos
    const inicio = contaLimpa.slice(0, 2);
    const fim = contaLimpa.slice(-2);
    const meio = '*'.repeat(contaLimpa.length - 4);

    return `${inicio}${meio}${fim}`;
  }

  /**
   * Mascara uma chave PIX
   *
   * @param chave Valor da chave PIX
   * @param tipo Tipo da chave (CPF, email, telefone, aleatoria)
   * @returns Chave PIX mascarada
   */
  private mascaraPixChave(chave: string, tipo: string): string {
    if (!chave) {
      return '';
    }

    switch (tipo?.toLowerCase()) {
      case 'cpf':
        // Formato: ***.123.456-**
        const cpfLimpo = chave.replace(/\D/g, '');
        if (cpfLimpo.length !== 11) {
          return '***.***.***-**';
        }

        return `***.${cpfLimpo.substr(3, 3)}.${cpfLimpo.substr(6, 3)}-**`;

      case 'email':
        // Formato: a***@d***.com
        const partes = chave.split('@');
        if (partes.length !== 2) {
          return chave.substring(0, 1) + '***@***';
        }

        const usuario = partes[0];
        const dominio = partes[1];

        const usuarioMascarado =
          usuario.substring(0, 1) + '*'.repeat(Math.max(1, usuario.length - 1));

        const dominioPartes = dominio.split('.');
        const dominioNome = dominioPartes[0];
        const dominioExtensao = dominioPartes.slice(1).join('.');

        const dominioMascarado =
          dominioNome.substring(0, 1) +
          '*'.repeat(Math.max(1, dominioNome.length - 1));

        return `${usuarioMascarado}@${dominioMascarado}.${dominioExtensao}`;

      case 'telefone':
        // Formato: (00) *****-6789
        const telLimpo = chave.replace(/\D/g, '');
        if (telLimpo.length < 8) {
          return '(**) *****-****';
        }

        return `(**) *****-${telLimpo.slice(-4)}`;

      case 'aleatoria':
        // Formato: ********-****-****-****-************
        if (chave.length < 8) {
          return '********';
        }

        return chave.substring(0, 8) + '****' + '*'.repeat(chave.length - 12);

      default:
        // Mascaramento genérico
        if (chave.length <= 4) {
          return '****';
        }

        return (
          chave.substring(0, 2) + '*'.repeat(chave.length - 4) + chave.slice(-2)
        );
    }
  }
}
