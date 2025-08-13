import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AprovacaoService } from '../services/aprovacao.service';
import {
  APROVACAO_METADATA_KEY,
  ConfiguracaoAprovacaoMetadata,
} from '../decorators/requer-aprovacao.decorator';
import { StatusSolicitacaoAprovacao } from '../enums/aprovacao.enums';

/**
 * Guard responsável por verificar se uma ação crítica pode ser executada
 * 
 * Este guard:
 * 1. Verifica se o método requer aprovação
 * 2. Valida se existe aprovação válida para a ação
 * 3. Verifica permissões de auto-aprovação
 * 4. Bloqueia execução se necessário
 * 
 * Diferente do interceptor, o guard atua como uma barreira inicial,
 * enquanto o interceptor gerencia o fluxo completo de aprovação.
 */
@Injectable()
export class AprovacaoGuard implements CanActivate {
  private readonly logger = new Logger(AprovacaoGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly aprovacaoService: AprovacaoService,
  ) {}

  /**
   * Determina se a requisição pode prosseguir
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Obtém configuração de aprovação do método
    const aprovacaoConfig = this.reflector.get<ConfiguracaoAprovacaoMetadata>(
      APROVACAO_METADATA_KEY,
      context.getHandler(),
    );

    // Se não requer aprovação, permite execução
    if (!aprovacaoConfig) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const usuario = request.user || request['usuario'];

    // Valida autenticação
    if (!usuario) {
      this.logger.warn('Tentativa de acesso a ação crítica sem autenticação');
      throw new ForbiddenException('Autenticação necessária para ações críticas');
    }

    this.logger.debug(
      `Verificando permissões para ação ${aprovacaoConfig.acao} - usuário ${usuario.id}`,
    );

    try {
      // Verifica se pode auto-aprovar
      if (aprovacaoConfig.permitirAutoAprovacao) {
        const podeAutoAprovar = await this.verificarAutoAprovacao(
          aprovacaoConfig,
          usuario,
          request,
        );
        
        if (podeAutoAprovar) {
          this.logger.log(
            `Auto-aprovação concedida para usuário ${usuario.id} na ação ${aprovacaoConfig.acao}`,
          );
          return true;
        }
      }

      // Verifica se existe aprovação válida
      const temAprovacao = await this.verificarAprovacaoExistente(
        aprovacaoConfig,
        usuario,
        request,
      );

      if (temAprovacao) {
        this.logger.log(
          `Aprovação válida encontrada para usuário ${usuario.id} na ação ${aprovacaoConfig.acao}`,
        );
        return true;
      }

      // Bloqueia execução - requer aprovação
      this.logger.warn(
        `Acesso negado para usuário ${usuario.id} na ação ${aprovacaoConfig.acao} - aprovação necessária`,
      );
      
      throw new ForbiddenException(
        'Esta ação requer aprovação prévia. Solicite aprovação através do sistema.',
      );
    } catch (erro) {
      if (erro instanceof ForbiddenException) {
        throw erro;
      }
      
      this.logger.error(
        `Erro ao verificar permissões de aprovação para usuário ${usuario.id}:`,
        erro.stack,
      );
      
      throw new ForbiddenException(
        'Erro interno ao verificar permissões de aprovação',
      );
    }
  }

  /**
   * Verifica se o usuário pode auto-aprovar a ação
   */
  private async verificarAutoAprovacao(
    config: ConfiguracaoAprovacaoMetadata,
    usuario: any,
    request: Request,
  ): Promise<boolean> {
    // Se há condições customizadas, avalia elas
    if (config.condicoesAutoAprovacao) {
      try {
        const contexto = {
          usuario,
          request,
          params: request.params,
          body: request.body,
          query: request.query,
          headers: request.headers,
        };
        
        return config.condicoesAutoAprovacao(contexto);
      } catch (erro) {
        this.logger.warn(
          `Erro ao avaliar condições customizadas de auto-aprovação: ${erro.message}`,
        );
        return false;
      }
    }

    // Verifica permissões padrão através do serviço
    return await this.aprovacaoService.verificarPermissaoAprovador(
      usuario.id,
      config.acao,
    );
  }

  /**
   * Verifica se existe aprovação válida para a ação
   */
  private async verificarAprovacaoExistente(
    config: ConfiguracaoAprovacaoMetadata,
    usuario: any,
    request: Request,
  ): Promise<boolean> {
    // Gera chave de contexto para identificar a ação específica
    const chaveContexto = this.gerarChaveContexto(request);
    
    // Busca solicitação de aprovação existente
    const solicitacao = await this.aprovacaoService.buscarSolicitacaoPendente(
      usuario.id,
      config.acao,
      chaveContexto,
    );

    if (!solicitacao) {
      return false;
    }

    // Verifica se está aprovada e ainda válida
    if (solicitacao.status === StatusSolicitacaoAprovacao.APROVADA) {
      // Verifica se a aprovação ainda está dentro do prazo de validade
      const agora = new Date();
      const dataAprovacao = new Date(solicitacao.data_primeira_aprovacao || solicitacao.created_at);
      const validadeHoras = 24; // Aprovação válida por 24 horas
      const diferencaHoras = (agora.getTime() - dataAprovacao.getTime()) / (1000 * 60 * 60);
      
      if (diferencaHoras <= validadeHoras) {
        return true;
      } else {
        this.logger.warn(
          `Aprovação expirada para solicitação ${solicitacao.id} - ${diferencaHoras.toFixed(2)}h desde aprovação`,
        );
        
        // Marca aprovação como expirada
        await this.aprovacaoService.rejeitarSolicitacao(solicitacao.id, usuario.id, 'Solicitação expirada');
        return false;
      }
    }

    return false;
  }

  /**
   * Gera chave única para identificar o contexto da ação
   */
  private gerarChaveContexto(request: Request): string {
    const elementos = [
      request.method,
      request.route?.path || request.url,
      request.params?.id || '',
    ];
    
    return elementos.filter(Boolean).join(':');
  }
}

/**
 * Guard simplificado para verificar apenas se o usuário tem permissão
 * para executar ações críticas (sem verificar aprovações específicas)
 */
@Injectable()
export class PermissaoAcaoCriticaGuard implements CanActivate {
  private readonly logger = new Logger(PermissaoAcaoCriticaGuard.name);

  constructor(private readonly aprovacaoService: AprovacaoService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const usuario = request.user || request['usuario'];

    if (!usuario) {
      throw new ForbiddenException('Autenticação necessária');
    }

    // Verifica se o usuário tem permissão geral para ações críticas
    const temPermissao = await this.aprovacaoService.verificarPermissaoAprovador(
      usuario.id,
      'temp-solicitacao-id'
    );

    if (!temPermissao) {
      this.logger.warn(
        `Usuário ${usuario.id} tentou acessar ação crítica sem permissão`,
      );
      throw new ForbiddenException(
        'Usuário não possui permissão para executar ações críticas',
      );
    }

    return true;
  }
}

/**
 * Guard para verificar se o usuário pode aprovar solicitações
 */
@Injectable()
export class AprovadorGuard implements CanActivate {
  private readonly logger = new Logger(AprovadorGuard.name);

  constructor(private readonly aprovacaoService: AprovacaoService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const usuario = request.user || request['usuario'];

    if (!usuario) {
      throw new ForbiddenException('Autenticação necessária');
    }

    // Verifica se o usuário é um aprovador ativo
    const ehAprovador = await this.aprovacaoService.verificarSeEhAprovador(usuario.id);

    if (!ehAprovador) {
      this.logger.warn(
        `Usuário ${usuario.id} tentou acessar funcionalidades de aprovador sem permissão`,
      );
      throw new ForbiddenException(
        'Usuário não possui permissão para aprovar solicitações',
      );
    }

    return true;
  }
}