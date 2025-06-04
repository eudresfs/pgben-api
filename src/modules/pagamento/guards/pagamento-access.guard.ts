import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PagamentoService } from '../services/pagamento.service';
import { IntegracaoCidadaoService } from '../services/integracao-cidadao.service';
import { IntegracaoSolicitacaoService } from '../services/integracao-solicitacao.service';

// Chaves para metadados de controle de acesso
export const PERFIS_KEY = 'perfis_permitidos';
export const UNIDADES_KEY = 'verificar_unidade';

/**
 * Guard para controle de acesso aos endpoints do módulo de pagamento
 *
 * Implementa verificações de permissão baseadas em:
 * - Perfil do usuário (admin, operador, etc)
 * - Unidade do usuário vs unidade do pagamento/solicitação
 * - Propriedade do recurso (pagamento, comprovante, confirmação)
 *
 * @author Equipe PGBen
 */
@Injectable()
export class PagamentoAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private pagamentoService: PagamentoService,
    private cidadaoService: IntegracaoCidadaoService,
    private solicitacaoService: IntegracaoSolicitacaoService,
  ) {}

  /**
   * Verifica se o usuário tem permissão para acessar o recurso
   *
   * @param context Contexto de execução
   * @returns true se o usuário tem permissão, false caso contrário
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const perfisPermitidos =
      this.reflector.getAllAndOverride<string[]>(PERFIS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    const verificarUnidade =
      this.reflector.getAllAndOverride<boolean>(UNIDADES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || false;

    const request = context.switchToHttp().getRequest();
    const usuario = request.user;

    // Se não há usuário autenticado, negar acesso
    if (!usuario) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // Verificar perfil do usuário
    if (
      perfisPermitidos.length > 0 &&
      !perfisPermitidos.includes(usuario.perfil)
    ) {
      throw new ForbiddenException(
        `Acesso restrito a: ${perfisPermitidos.join(', ')}`,
      );
    }

    // Super admin sempre tem acesso
    if (usuario.perfil === 'super_admin') {
      return true;
    }

    // Se não precisa verificar unidade, permitir acesso
    if (!verificarUnidade) {
      return true;
    }

    // Obter IDs dos parâmetros da requisição
    const pagamentoId = request.params.pagamentoId || request.params.id;
    const beneficiarioId = request.params.beneficiarioId;
    const comprovanteId = request.params.comprovanteId;

    // Verificar acesso baseado no ID do pagamento
    if (pagamentoId) {
      try {
        const pagamento =
          await this.pagamentoService.findOneWithRelations(pagamentoId);

        if (!pagamento) {
          throw new NotFoundException('Pagamento não encontrado');
        }

        // Verificar status da solicitação associada ao pagamento
        // Usando o método que existe no serviço
        const solicitacaoStatus =
          await this.solicitacaoService.verificarSolicitacaoAprovada(
            pagamento.solicitacaoId,
          );

        if (!solicitacaoStatus) {
          throw new NotFoundException('Solicitação não encontrada');
        }

        // Obter a unidade da solicitação
        const unidadeId = solicitacaoStatus.unidadeId;

        // Verificar se o usuário pertence à mesma unidade da solicitação
        if (usuario.unidadeId !== unidadeId && usuario.perfil !== 'admin') {
          throw new ForbiddenException('Acesso restrito à unidade responsável');
        }

        // Verificações adicionais para comprovantes
        if (comprovanteId && usuario.perfil !== 'admin') {
          // Verificar se o comprovante existe e pertence ao pagamento
          // Usando um método genérico que deve existir no serviço
          const comprovante =
            await this.pagamentoService.findOne(comprovanteId);

          // Verificar se o comprovante pertence ao pagamento
          if (
            !comprovante ||
            comprovante.solicitacaoId !== pagamento.solicitacaoId
          ) {
            throw new ForbiddenException(
              'Comprovante não encontrado ou não pertence ao pagamento',
            );
          }
        }
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw error;
        }
        throw new ForbiddenException('Erro ao verificar permissões de acesso');
      }

      return true;
    }

    // Verificar acesso baseado no ID do beneficiário
    if (beneficiarioId) {
      try {
        // Obter informações do beneficiário usando o método correto que existe no serviço
        const cidadao =
          await this.cidadaoService.obterDadosPessoais(beneficiarioId);

        if (!cidadao) {
          throw new NotFoundException('Beneficiário não encontrado');
        }

        // Verificar se o usuário pertence à mesma unidade do cidadão
        // Assumindo que a unidade está disponível nos dados retornados
        const unidadeId = cidadao.unidadeId || null;

        if (
          unidadeId &&
          usuario.unidadeId !== unidadeId &&
          usuario.perfil !== 'admin'
        ) {
          throw new ForbiddenException(
            'Acesso restrito à unidade responsável pelo beneficiário',
          );
        }
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw error;
        }
        throw new ForbiddenException(
          'Erro ao verificar permissões de acesso ao beneficiário',
        );
      }

      return true;
    }

    // Se chegou aqui, permitir acesso
    return true;
  }
}
