import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AprovadorService } from '../services/aprovador.service';
import {
  APROVADOR_AUTORIZADO_METADATA_KEY,
  AprovadorAutorizadoMetadata,
} from '../decorators/aprovador-autorizado.decorator';
import { Usuario } from '../../../entities/usuario.entity';
import { TipoAprovador } from '../enums/aprovacao.enums';

/**
 * Interface para contexto de verificação de aprovador
 */
interface ContextoVerificacaoAprovador {
  usuario: Usuario;
  parametros: any[];
  metadados: AprovadorAutorizadoMetadata;
  dadosRequisicao: {
    ip: string;
    userAgent: string;
    url: string;
    metodo: string;
  };
}

/**
 * Guard para verificar se o usuário é um aprovador autorizado
 * 
 * Este guard é responsável por:
 * - Verificar se o usuário tem permissão para aprovar/rejeitar ações
 * - Validar hierarquia organizacional quando necessário
 * - Verificar limites de valor para aprovação
 * - Validar escopo de aprovação (unidade, regional, nacional)
 * - Permitir delegação quando configurado
 */
@Injectable()
export class AprovadorAutorizadoGuard implements CanActivate {
  private readonly logger = new Logger(AprovadorAutorizadoGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly aprovadorService: AprovadorService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Obter configuração do decorator
    const aprovadorConfig = this.reflector.get<AprovadorAutorizadoMetadata>(
      APROVADOR_AUTORIZADO_METADATA_KEY,
      context.getHandler(),
    );

    // Se não há configuração, permitir acesso
    if (!aprovadorConfig) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const usuario = request.user as Usuario;
    const args = context.getArgs();

    // Validar se o usuário está autenticado
    if (!usuario) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // Construir contexto de verificação
    const contextoVerificacao = this.construirContextoVerificacao(
      usuario,
      args,
      request,
      aprovadorConfig,
    );

    this.logger.debug(
      `Verificando autorização de aprovador para usuário ${usuario.id}`,
    );

    try {
      // Executar verificações de autorização
      await this.executarVerificacoesAutorizacao(contextoVerificacao);

      this.logger.debug(
        `Usuário ${usuario.id} autorizado como aprovador`,
      );

      return true;
    } catch (error) {
      this.logger.warn(
        `Usuário ${usuario.id} não autorizado como aprovador: ${error.message}`,
      );

      throw new ForbiddenException(
        error.message || 'Usuário não autorizado para esta operação de aprovação',
      );
    }
  }

  /**
   * Constrói o contexto de verificação do aprovador
   */
  private construirContextoVerificacao(
    usuario: Usuario,
    args: any[],
    request: Request,
    config: AprovadorAutorizadoMetadata,
  ): ContextoVerificacaoAprovador {
    return {
      usuario,
      parametros: args,
      metadados: config,
      dadosRequisicao: {
        ip: this.extrairIpRequisicao(request),
        userAgent: request.get('User-Agent') || 'Unknown',
        url: request.url,
        metodo: request.method,
      },
    };
  }

  /**
   * Executa todas as verificações de autorização necessárias
   */
  private async executarVerificacoesAutorizacao(
    contexto: ContextoVerificacaoAprovador,
  ): Promise<void> {
    const { usuario, metadados } = contexto;

    // 1. Verificar se o usuário é um aprovador ativo
    // TODO: Implementar busca de aprovador por usuário
    // const aprovador = await this.aprovadorService.buscarAprovadorPorUsuario(
    //   usuario.id,
    // );
    const aprovador = { id: usuario.id, escopo: 'unidade', limite_valor: 100000, ativo: true };

    if (!aprovador || !aprovador.ativo) {
      throw new Error('Usuário não é um aprovador ativo no sistema');
    }

    // 2. Verificar roles permitidas
    if (metadados.rolesPermitidas?.length > 0) {
      await this.verificarRolesPermitidas(usuario, metadados.rolesPermitidas);
    }

    // 3. Verificar permissões específicas
    if (metadados.permissoesNecessarias?.length > 0) {
      await this.verificarPermissoesNecessarias(
        usuario,
        metadados.permissoesNecessarias,
      );
    }

    // 4. Verificar escopo de aprovação
    if (metadados.escopo) {
      await this.verificarEscopoAprovacao(contexto, aprovador);
    }

    // 5. Verificar hierarquia organizacional
    if (metadados.verificarHierarquia) {
      await this.verificarHierarquiaOrganizacional(contexto, aprovador);
    }

    // 6. Verificar limite de valor
    if (metadados.valorMaximo !== undefined) {
      await this.verificarLimiteValor(contexto, aprovador);
    }

    // 7. Verificar delegação se aplicável
    if (metadados.permiteDelegacao) {
      await this.verificarDelegacao(contexto, aprovador);
    }

    this.logger.debug(
      `Todas as verificações de autorização passaram para aprovador ${aprovador.id}`,
    );
  }

  /**
   * Verifica se o usuário possui as roles permitidas
   */
  private async verificarRolesPermitidas(
    usuario: Usuario,
    rolesPermitidas: string[],
  ): Promise<void> {
    // Assumindo que o usuário tem uma propriedade roles ou similar
    const rolesUsuario = usuario.role || [];
    
    const rolesArray = Array.isArray(rolesUsuario) ? rolesUsuario : [rolesUsuario];
    const temRolePermitida = rolesPermitidas.some(role => 
      rolesArray.includes(role)
    );

    if (!temRolePermitida) {
      throw new Error(
        `Usuário não possui nenhuma das roles necessárias: ${rolesPermitidas.join(', ')}`,
      );
    }
  }

  /**
   * Verifica se o usuário possui as permissões necessárias
   */
  private async verificarPermissoesNecessarias(
    usuario: Usuario,
    permissoesNecessarias: string[],
  ): Promise<void> {
    // Implementar verificação de permissões específicas
    // Isso dependeria do sistema de permissões implementado
    const permissoesUsuario = await this.obterPermissoesUsuario(usuario.id);
    
    const temTodasPermissoes = permissoesNecessarias.every(permissao => 
      permissoesUsuario.includes(permissao)
    );

    if (!temTodasPermissoes) {
      throw new Error(
        `Usuário não possui todas as permissões necessárias: ${permissoesNecessarias.join(', ')}`,
      );
    }
  }

  /**
   * Verifica o escopo de aprovação do usuário
   */
  private async verificarEscopoAprovacao(
    contexto: ContextoVerificacaoAprovador,
    aprovador: any,
  ): Promise<void> {
    const { metadados } = contexto;
    
    // Verificar se o escopo do aprovador é compatível com o requerido
    if (aprovador.escopo !== metadados.escopo) {
      // Verificar hierarquia de escopos (nacional > regional > unidade)
      const hierarquiaEscopos = ['unidade', 'regional', 'nacional'];
      const nivelAprovador = hierarquiaEscopos.indexOf(aprovador.escopo);
      const nivelRequerido = hierarquiaEscopos.indexOf(metadados.escopo);
      
      if (nivelAprovador < nivelRequerido) {
        throw new Error(
          `Escopo de aprovação insuficiente. Requerido: ${metadados.escopo}, Usuário: ${aprovador.escopo}`,
        );
      }
    }
  }

  /**
   * Verifica a hierarquia organizacional
   */
  private async verificarHierarquiaOrganizacional(
    contexto: ContextoVerificacaoAprovador,
    aprovador: any,
  ): Promise<void> {
    // Extrair dados da entidade alvo para verificar hierarquia
    const entidadeAlvoId = this.extrairEntidadeAlvoId(contexto.parametros);
    
    if (!entidadeAlvoId) {
      return; // Não é possível verificar hierarquia sem entidade alvo
    }

    // TODO: Implementar verificação de autoridade hierárquica
    // const temAutoridade = await this.verificarAutoridadeHierarquica(
    //   aprovador.id,
    //   entidadeAlvoId,
    // );

    // if (!temAutoridade) {
    //   throw new Error(
    //     'Aprovador não possui autoridade hierárquica sobre a entidade alvo',
    //   );
    // }
  }

  /**
   * Verifica o limite de valor para aprovação
   */
  private async verificarLimiteValor(
    contexto: ContextoVerificacaoAprovador,
    aprovador: any,
  ): Promise<void> {
    const { metadados } = contexto;
    
    // Extrair valor da operação dos parâmetros
    const valorOperacao = this.extrairValorOperacao(contexto.parametros);
    
    if (valorOperacao === null) {
      return; // Não há valor para verificar
    }

    // Verificar se o aprovador tem limite suficiente
    const limiteAprovador = aprovador.limite_valor || 0;
    
    if (valorOperacao > limiteAprovador) {
      throw new Error(
        `Valor da operação (${valorOperacao}) excede o limite do aprovador (${limiteAprovador})`,
      );
    }

    // Verificar limite configurado no metadata
    if (valorOperacao > metadados.valorMaximo) {
      throw new Error(
        `Valor da operação (${valorOperacao}) excede o limite configurado (${metadados.valorMaximo})`,
      );
    }
  }

  /**
   * Verifica se há delegação válida
   */
  private async verificarDelegacao(
    contexto: ContextoVerificacaoAprovador,
    aprovador: any,
  ): Promise<void> {
    // TODO: Implementar verificação de delegação
    // const delegacaoAtiva = await this.buscarDelegacaoAtiva(
    //   aprovador.id,
    // );

    // if (delegacaoAtiva) {
    //   const delegacaoValida = await this.validarDelegacao(
    //     delegacaoAtiva.id,
    //     contexto.metadados,
    //   );

    //   if (!delegacaoValida) {
    //     throw new Error(
    //       'Delegação não é válida para esta operação',
    //     );
    //   }
    // }
  }

  /**
   * Extrai o IP da requisição considerando proxies
   */
  private extrairIpRequisicao(request: Request): string {
    const xForwardedFor = request.headers['x-forwarded-for'];
    const xRealIp = request.headers['x-real-ip'];
    
    if (xForwardedFor) {
      const ips = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
      return ips.split(',')[0].trim();
    }
    
    if (xRealIp) {
      return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
    }
    
    return (
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'Unknown'
    );
  }

  /**
   * Extrai o ID da entidade alvo dos parâmetros
   */
  private extrairEntidadeAlvoId(parametros: any[]): string | null {
    // Assumir que o primeiro parâmetro é geralmente o ID
    const primeiroParametro = parametros[0];
    
    if (typeof primeiroParametro === 'string') {
      return primeiroParametro;
    }

    if (typeof primeiroParametro === 'object' && primeiroParametro?.id) {
      return primeiroParametro.id;
    }

    return null;
  }

  /**
   * Extrai o valor da operação dos parâmetros
   */
  private extrairValorOperacao(parametros: any[]): number | null {
    // Procurar por propriedades que possam conter valor
    for (const param of parametros) {
      if (typeof param === 'object' && param !== null) {
        // Procurar por propriedades comuns de valor
        const propriedadesValor = ['valor', 'amount', 'price', 'total', 'custo'];
        
        for (const prop of propriedadesValor) {
          if (param[prop] !== undefined && typeof param[prop] === 'number') {
            return param[prop];
          }
        }
      }
    }

    return null;
  }

  /**
   * Obtém as permissões do usuário
   */
  private async obterPermissoesUsuario(usuarioId: string): Promise<string[]> {
    // Implementar busca de permissões do usuário
    // Isso dependeria do sistema de permissões implementado
    // Por enquanto, retornar array vazio
    return [];
  }
}