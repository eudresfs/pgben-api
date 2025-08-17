import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { AprovacaoService } from '../services/aprovacao.service';
import { TipoAcaoCritica, StatusSolicitacaoAprovacao } from '../enums/aprovacao.enums';

/**
 * Pipe para validação e transformação de dados relacionados a aprovações
 * 
 * Este pipe:
 * 1. Valida DTOs de aprovação
 * 2. Verifica regras de negócio específicas
 * 3. Transforma dados conforme necessário
 * 4. Aplica sanitização de dados sensíveis
 */
@Injectable()
export class AprovacaoValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(AprovacaoValidationPipe.name);

  constructor(private readonly aprovacaoService: AprovacaoService) {}

  async transform(value: any, { metatype }: ArgumentMetadata) {
    // Se não há metatype ou é um tipo primitivo, retorna o valor
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Transforma plain object em instância da classe
    const object = plainToClass(metatype, value);
    
    // Executa validações do class-validator
    const errors = await validate(object);
    if (errors.length > 0) {
      const errorMessages = errors.map(error => {
        return Object.values(error.constraints || {}).join(', ');
      }).join('; ');
      
      this.logger.warn(`Erro de validação: ${errorMessages}`);
      throw new BadRequestException(`Dados inválidos: ${errorMessages}`);
    }

    // Aplica validações específicas de aprovação
    await this.validarRegrasAprovacao(object, metatype);

    // Sanitiza dados sensíveis
    return this.sanitizarDados(object);
  }

  /**
   * Verifica se o tipo deve ser validado
   */
  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  /**
   * Aplica validações específicas de regras de negócio de aprovação
   */
  private async validarRegrasAprovacao(object: any, metatype: Function): Promise<void> {
    const className = metatype.name;

    switch (className) {
      case 'CriarSolicitacaoAprovacaoDto':
        await this.validarCriacaoSolicitacao(object);
        break;
      case 'AprovarSolicitacaoDto':
        await this.validarAprovacaoSolicitacao(object);
        break;
      case 'RejeitarSolicitacaoDto':
        await this.validarRejeicaoSolicitacao(object);
        break;
      case 'DelegarAprovacaoDto':
        await this.validarDelegacaoAprovacao(object);
        break;
    }
  }

  /**
   * Valida dados para criação de solicitação de aprovação
   */
  private async validarCriacaoSolicitacao(dto: any): Promise<void> {
    // Verifica se o tipo de ação é válido
    if (!Object.values(TipoAcaoCritica).includes(dto.tipoAcao)) {
      throw new BadRequestException(`Tipo de ação inválido: ${dto.tipoAcao}`);
    }

    // Verifica se o solicitante existe e está ativo
    if (dto.solicitanteId) {
      const solicitanteValido = await this.aprovacaoService.verificarUsuarioAtivo(
        dto.solicitanteId,
      );
      if (!solicitanteValido) {
        throw new BadRequestException('Solicitante inválido ou inativo');
      }
    }

    // Verifica se não há solicitação duplicada pendente
    if (dto.solicitanteId && dto.tipoAcao) {
      const chaveContexto = dto.dadosContexto ? 
        this.gerarChaveContexto(dto.dadosContexto) : null;
      
      const solicitacaoPendente = await this.aprovacaoService.buscarSolicitacaoPendente(
        dto.solicitanteId,
        dto.tipoAcao,
        chaveContexto,
      );

      if (solicitacaoPendente) {
        throw new BadRequestException(
          `Já existe uma solicitação pendente para esta ação (ID: ${solicitacaoPendente.id})`,
        );
      }
    }

    // Valida justificativa mínima para ações críticas
    const acoesCriticasComJustificativa = [
      TipoAcaoCritica.EXCLUSAO_BENEFICIARIO,
      TipoAcaoCritica.CANCELAR_SOLICITACAO,
      TipoAcaoCritica.ALTERACAO_DADOS_BANCARIOS,
    ];

    if (acoesCriticasComJustificativa.includes(dto.tipoAcao)) {
      if (!dto.justificativa || dto.justificativa.trim().length < 10) {
        throw new BadRequestException(
          'Justificativa detalhada é obrigatória para esta ação (mínimo 10 caracteres)',
        );
      }
    }
  }

  /**
   * Valida dados para aprovação de solicitação
   */
  private async validarAprovacaoSolicitacao(dto: any): Promise<void> {
    // Verifica se a solicitação existe e pode ser aprovada
    if (dto.solicitacaoId) {
      const solicitacao = await this.aprovacaoService.buscarSolicitacaoPorId(
        dto.solicitacaoId,
      );

      if (!solicitacao) {
        throw new BadRequestException('Solicitação não encontrada');
      }

      if (solicitacao.status !== StatusSolicitacaoAprovacao.PENDENTE) {
        throw new BadRequestException(
          `Solicitação não pode ser aprovada. Status atual: ${solicitacao.status}`,
        );
      }

      // Verifica se não está expirada
      const agora = new Date();
      const diasExpiracao = 7; // Solicitações expiram em 7 dias
      const dataLimite = new Date(solicitacao.created_at);
      dataLimite.setDate(dataLimite.getDate() + diasExpiracao);

      if (agora > dataLimite) {
        throw new BadRequestException(
          'Solicitação expirada. Solicite uma nova aprovação.',
        );
      }
    }

    // Verifica se o aprovador tem permissão para esta ação
    if (dto.aprovadorId && dto.solicitacaoId) {
      const temPermissao = await this.aprovacaoService.verificarPermissaoAprovador(
        dto.aprovadorId,
        dto.solicitacaoId,
      );

      if (!temPermissao) {
        throw new BadRequestException(
          'Aprovador não possui permissão para esta solicitação',
        );
      }
    }
  }

  /**
   * Valida dados para rejeição de solicitação
   */
  private async validarRejeicaoSolicitacao(dto: any): Promise<void> {
    // Rejeição sempre requer justificativa
    if (!dto.justificativa || dto.justificativa.trim().length < 5) {
      throw new BadRequestException(
        'Justificativa é obrigatória para rejeição (mínimo 5 caracteres)',
      );
    }

    // Aplica as mesmas validações de aprovação para verificar se pode ser rejeitada
    await this.validarAprovacaoSolicitacao(dto);
  }

  /**
   * Valida dados para delegação de aprovação
   */
  private async validarDelegacaoAprovacao(dto: any): Promise<void> {
    // Verifica se origem e delegado são diferentes
    if (dto.aprovadorOrigemId === dto.aprovadorDelegadoId) {
      throw new BadRequestException(
        'Aprovador de origem e delegado devem ser diferentes',
      );
    }

    // Verifica se ambos os usuários existem e são aprovadores
    if (dto.aprovadorOrigemId) {
      const origemEhAprovador = await this.aprovacaoService.verificarSeEhAprovador(
        dto.aprovadorOrigemId,
      );
      if (!origemEhAprovador) {
        throw new BadRequestException('Usuário de origem não é um aprovador válido');
      }
    }

    if (dto.aprovadorDelegadoId) {
      const delegadoEhAprovador = await this.aprovacaoService.verificarSeEhAprovador(
        dto.aprovadorDelegadoId,
      );
      if (!delegadoEhAprovador) {
        throw new BadRequestException('Usuário delegado não é um aprovador válido');
      }
    }

    // Valida período de delegação
    if (dto.dataInicio && dto.dataFim) {
      const inicio = new Date(dto.dataInicio);
      const fim = new Date(dto.dataFim);
      const agora = new Date();

      if (inicio >= fim) {
        throw new BadRequestException(
          'Data de início deve ser anterior à data de fim',
        );
      }

      if (fim <= agora) {
        throw new BadRequestException(
          'Data de fim deve ser futura',
        );
      }

      // Limita delegação a no máximo 90 dias
      const diferencaDias = (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24);
      if (diferencaDias > 90) {
        throw new BadRequestException(
          'Delegação não pode exceder 90 dias',
        );
      }
    }

    // Valida valor máximo se especificado
    if (dto.valorMaximo !== undefined && dto.valorMaximo <= 0) {
      throw new BadRequestException('Valor máximo deve ser positivo');
    }
  }

  /**
   * Remove dados sensíveis do objeto
   */
  private sanitizarDados(object: any): any {
    if (!object || typeof object !== 'object') {
      return object;
    }

    const objetoLimpo = { ...object };
    const camposSensiveis = [
      'password',
      'senha',
      'token',
      'secret',
      'key',
      'apiKey',
      'accessToken',
    ];

    // Remove campos sensíveis
    camposSensiveis.forEach(campo => {
      if (objetoLimpo[campo]) {
        delete objetoLimpo[campo];
      }
    });

    // Sanitiza metadados se existirem
    if (objetoLimpo.metadados && typeof objetoLimpo.metadados === 'object') {
      camposSensiveis.forEach(campo => {
        if (objetoLimpo.metadados[campo]) {
          delete objetoLimpo.metadados[campo];
        }
      });
    }

    return objetoLimpo;
  }

  /**
   * Gera chave de contexto a partir dos dados
   */
  private gerarChaveContexto(dadosContexto: any): string {
    if (!dadosContexto || typeof dadosContexto !== 'object') {
      return '';
    }

    const elementos = [
      dadosContexto.params?.id || '',
      dadosContexto.entidadeId || '',
      dadosContexto.endpoint || '',
    ];

    return elementos.filter(Boolean).join(':');
  }
}

/**
 * Pipe específico para validar IDs de solicitação de aprovação
 */
@Injectable()
export class SolicitacaoIdValidationPipe implements PipeTransform {
  private readonly logger = new Logger(SolicitacaoIdValidationPipe.name);

  constructor(private readonly aprovacaoService: AprovacaoService) {}

  async transform(value: string, metadata: ArgumentMetadata): Promise<string> {
    // Valida formato do ID
    if (!value || typeof value !== 'string') {
      throw new BadRequestException('ID da solicitação é obrigatório');
    }

    // Verifica se é um UUID válido (assumindo que usamos UUIDs)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new BadRequestException('Formato de ID inválido');
    }

    // Verifica se a solicitação existe
    const solicitacao = await this.aprovacaoService.buscarSolicitacaoPorId(value);
    if (!solicitacao) {
      throw new BadRequestException('Solicitação não encontrada');
    }

    return value;
  }
}

/**
 * Pipe para validar e transformar filtros de busca de aprovações
 */
@Injectable()
export class FiltrosAprovacaoValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata): any {
    if (!value || typeof value !== 'object') {
      return {};
    }

    const filtrosLimpos: any = {};

    // Valida e transforma status
    if (value.status) {
      const statusValidos = Object.values(StatusSolicitacaoAprovacao);
      if (Array.isArray(value.status)) {
        filtrosLimpos.status = value.status.filter(s => statusValidos.includes(s));
      } else if (statusValidos.includes(value.status)) {
        filtrosLimpos.status = [value.status];
      }
    }

    // Valida e transforma tipos de ação
    if (value.tiposAcao) {
      const tiposValidos = Object.values(TipoAcaoCritica);
      if (Array.isArray(value.tiposAcao)) {
        filtrosLimpos.tiposAcao = value.tiposAcao.filter(t => tiposValidos.includes(t));
      } else if (tiposValidos.includes(value.tiposAcao)) {
        filtrosLimpos.tiposAcao = [value.tiposAcao];
      }
    }

    // Valida datas
    if (value.dataInicio) {
      const dataInicio = new Date(value.dataInicio);
      if (!isNaN(dataInicio.getTime())) {
        filtrosLimpos.dataInicio = dataInicio;
      }
    }

    if (value.dataFim) {
      const dataFim = new Date(value.dataFim);
      if (!isNaN(dataFim.getTime())) {
        filtrosLimpos.dataFim = dataFim;
      }
    }

    // Valida paginação
    if (value.page) {
      const page = parseInt(value.page, 10);
      if (page > 0) {
        filtrosLimpos.page = page;
      }
    }

    if (value.limit) {
      const limit = parseInt(value.limit, 10);
      if (limit > 0 && limit <= 100) { // Limita a 100 itens por página
        filtrosLimpos.limit = limit;
      }
    }

    return filtrosLimpos;
  }
}