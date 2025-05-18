import { Injectable } from '@nestjs/common';
import { StatusPagamentoEnum } from '../enums/status-pagamento.enum';

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
  // Em uma implementação real, este serviço injetaria o AuditoriaService do módulo de auditoria
  // constructor(private readonly auditoriaService: AuditoriaService) {}

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
    dados: any
  ): Promise<void> {
    // Mascarar dados sensíveis
    const dadosMascarados = this.mascararDadosSensiveisPagamento(dados);

    // Em uma implementação real, chamaria o serviço de auditoria
    // await this.auditoriaService.registrarOperacao({
    //   tipoOperacao: 'CRIACAO_PAGAMENTO',
    //   entidadeId: pagamentoId,
    //   tipoEntidade: 'PAGAMENTO',
    //   entidadeRelacionadaId: solicitacaoId,
    //   tipoEntidadeRelacionada: 'SOLICITACAO',
    //   usuarioId,
    //   dadosAnteriores: null,
    //   dadosNovos: dadosMascarados,
    //   ip: '0.0.0.0', // seria obtido do contexto da requisição
    //   userAgent: 'Sistema', // seria obtido do contexto da requisição
    //   timestamp: new Date()
    // });

    console.log(`[AUDITORIA] Criação de pagamento ${pagamentoId} registrada por ${usuarioId}`);
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
    observacoes?: string
  ): Promise<void> {
    // Em uma implementação real, chamaria o serviço de auditoria
    // await this.auditoriaService.registrarOperacao({
    //   tipoOperacao: 'MUDANCA_STATUS_PAGAMENTO',
    //   entidadeId: pagamentoId,
    //   tipoEntidade: 'PAGAMENTO',
    //   usuarioId,
    //   dadosAnteriores: { status: statusAnterior },
    //   dadosNovos: { 
    //     status: statusNovo,
    //     observacoes
    //   },
    //   ip: '0.0.0.0', // seria obtido do contexto da requisição
    //   userAgent: 'Sistema', // seria obtido do contexto da requisição
    //   timestamp: new Date()
    // });

    console.log(`[AUDITORIA] Mudança de status do pagamento ${pagamentoId} de ${statusAnterior} para ${statusNovo} registrada por ${usuarioId}`);
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
    dadosComprovante: any
  ): Promise<void> {
    // Em uma implementação real, chamaria o serviço de auditoria
    // await this.auditoriaService.registrarOperacao({
    //   tipoOperacao: 'UPLOAD_COMPROVANTE',
    //   entidadeId: comprovanteId,
    //   tipoEntidade: 'COMPROVANTE_PAGAMENTO',
    //   entidadeRelacionadaId: pagamentoId,
    //   tipoEntidadeRelacionada: 'PAGAMENTO',
    //   usuarioId,
    //   dadosAnteriores: null,
    //   dadosNovos: {
    //     tipoDocumento: dadosComprovante.tipoDocumento,
    //     nomeArquivo: dadosComprovante.nomeArquivo,
    //     tamanho: dadosComprovante.tamanho,
    //     mimeType: dadosComprovante.mimeType
    //   },
    //   ip: '0.0.0.0', // seria obtido do contexto da requisição
    //   userAgent: 'Sistema', // seria obtido do contexto da requisição
    //   timestamp: new Date()
    // });

    console.log(`[AUDITORIA] Upload de comprovante ${comprovanteId} para o pagamento ${pagamentoId} registrado por ${usuarioId}`);
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
    dadosComprovante: any
  ): Promise<void> {
    // Em uma implementação real, chamaria o serviço de auditoria
    // await this.auditoriaService.registrarOperacao({
    //   tipoOperacao: 'REMOCAO_COMPROVANTE',
    //   entidadeId: comprovanteId,
    //   tipoEntidade: 'COMPROVANTE_PAGAMENTO',
    //   entidadeRelacionadaId: pagamentoId,
    //   tipoEntidadeRelacionada: 'PAGAMENTO',
    //   usuarioId,
    //   dadosAnteriores: {
    //     tipoDocumento: dadosComprovante.tipoDocumento,
    //     nomeArquivo: dadosComprovante.nomeArquivo,
    //     tamanho: dadosComprovante.tamanho,
    //     mimeType: dadosComprovante.mimeType
    //   },
    //   dadosNovos: null,
    //   ip: '0.0.0.0', // seria obtido do contexto da requisição
    //   userAgent: 'Sistema', // seria obtido do contexto da requisição
    //   timestamp: new Date()
    // });

    console.log(`[AUDITORIA] Remoção de comprovante ${comprovanteId} do pagamento ${pagamentoId} registrada por ${usuarioId}`);
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
    dadosConfirmacao: any
  ): Promise<void> {
    // Em uma implementação real, chamaria o serviço de auditoria
    // await this.auditoriaService.registrarOperacao({
    //   tipoOperacao: 'CONFIRMACAO_RECEBIMENTO',
    //   entidadeId: confirmacaoId,
    //   tipoEntidade: 'CONFIRMACAO_RECEBIMENTO',
    //   entidadeRelacionadaId: pagamentoId,
    //   tipoEntidadeRelacionada: 'PAGAMENTO',
    //   usuarioId,
    //   dadosAnteriores: null,
    //   dadosNovos: {
    //     dataConfirmacao: dadosConfirmacao.dataConfirmacao,
    //     metodoConfirmacao: dadosConfirmacao.metodoConfirmacao,
    //     destinatarioId: dadosConfirmacao.destinatarioId,
    //     observacoes: dadosConfirmacao.observacoes
    //   },
    //   ip: '0.0.0.0', // seria obtido do contexto da requisição
    //   userAgent: 'Sistema', // seria obtido do contexto da requisição
    //   timestamp: new Date()
    // });

    console.log(`[AUDITORIA] Confirmação de recebimento ${confirmacaoId} para o pagamento ${pagamentoId} registrada por ${usuarioId}`);
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
    dadosSensiveisAcessados: string[]
  ): Promise<void> {
    // Em uma implementação real, chamaria o serviço de auditoria
    // await this.auditoriaService.registrarOperacao({
    //   tipoOperacao: 'ACESSO_DADOS_SENSIVEIS',
    //   entidadeId,
    //   tipoEntidade,
    //   usuarioId,
    //   dadosAnteriores: null,
    //   dadosNovos: {
    //     camposAcessados: dadosSensiveisAcessados,
    //     justificativa: 'Acesso operacional'
    //   },
    //   ip: '0.0.0.0', // seria obtido do contexto da requisição
    //   userAgent: 'Sistema', // seria obtido do contexto da requisição
    //   timestamp: new Date()
    // });

    console.log(`[AUDITORIA] Acesso a dados sensíveis de ${tipoEntidade} ${entidadeId} registrado por ${usuarioId}`);
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
        dadosMascarados.dadosBancarios.agencia = this.mascaraAgencia(dadosMascarados.dadosBancarios.agencia);
      }
      
      if (dadosMascarados.dadosBancarios.conta) {
        dadosMascarados.dadosBancarios.conta = this.mascaraConta(dadosMascarados.dadosBancarios.conta);
      }
      
      if (dadosMascarados.dadosBancarios.pixChave) {
        dadosMascarados.dadosBancarios.pixChave = this.mascaraPixChave(
          dadosMascarados.dadosBancarios.pixChave,
          dadosMascarados.dadosBancarios.pixTipo
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
    if (!agencia) return '';
    
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
    if (!conta) return '';
    
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
    if (!chave) return '';
    
    switch (tipo?.toLowerCase()) {
      case 'cpf':
        // Formato: ***.123.456-**
        const cpfLimpo = chave.replace(/\D/g, '');
        if (cpfLimpo.length !== 11) return '***.***.***-**';
        
        return `***.${cpfLimpo.substr(3, 3)}.${cpfLimpo.substr(6, 3)}-**`;
        
      case 'email':
        // Formato: a***@d***.com
        const partes = chave.split('@');
        if (partes.length !== 2) return chave.substring(0, 1) + '***@***';
        
        const usuario = partes[0];
        const dominio = partes[1];
        
        const usuarioMascarado = usuario.substring(0, 1) + '*'.repeat(Math.max(1, usuario.length - 1));
        
        const dominioPartes = dominio.split('.');
        const dominioNome = dominioPartes[0];
        const dominioExtensao = dominioPartes.slice(1).join('.');
        
        const dominioMascarado = dominioNome.substring(0, 1) + '*'.repeat(Math.max(1, dominioNome.length - 1));
        
        return `${usuarioMascarado}@${dominioMascarado}.${dominioExtensao}`;
        
      case 'telefone':
        // Formato: (00) *****-6789
        const telLimpo = chave.replace(/\D/g, '');
        if (telLimpo.length < 8) return '(**) *****-****';
        
        return `(**) *****-${telLimpo.slice(-4)}`;
        
      case 'aleatoria':
        // Formato: ********-****-****-****-************
        if (chave.length < 8) return '********';
        
        return chave.substring(0, 8) + '****' + '*'.repeat(chave.length - 12);
        
      default:
        // Mascaramento genérico
        if (chave.length <= 4) return '****';
        
        return chave.substring(0, 2) + '*'.repeat(chave.length - 4) + chave.slice(-2);
    }
  }
}
