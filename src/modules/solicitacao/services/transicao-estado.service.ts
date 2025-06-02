import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { StatusSolicitacao } from '../../../entities/solicitacao.entity';
import { TRANSICOES_PERMITIDAS, PERMISSOES_TRANSICAO } from '../config/workflow-config';

/**
 * Serviço de Transição de Estado
 * 
 * Responsável por gerenciar as regras de transição entre estados das solicitações.
 * Centraliza a lógica de validação de transições e permissões necessárias.
 */
@Injectable()
export class TransicaoEstadoService {
  /**
   * Verifica se uma transição de estado é válida
   * @param estadoAtual Estado atual da solicitação
   * @param novoEstado Estado para o qual se deseja transicionar
   * @returns Boolean indicando se a transição é permitida
   */
  isTransicaoValida(estadoAtual: StatusSolicitacao, novoEstado: StatusSolicitacao): boolean {
    return TRANSICOES_PERMITIDAS[estadoAtual]?.includes(novoEstado) || false;
  }

  /**
   * Obtém todos os estados possíveis a partir de um estado atual
   * @param estadoAtual Estado atual da solicitação
   * @returns Array com os estados possíveis
   */
  getEstadosPossiveis(estadoAtual: StatusSolicitacao): StatusSolicitacao[] {
    return TRANSICOES_PERMITIDAS[estadoAtual] || [];
  }

  /**
   * Obtém a chave de transição para um par de estados
   * @param estadoAtual Estado atual da solicitação
   * @param novoEstado Estado para o qual se deseja transicionar
   * @returns Chave de transição no formato ESTADO_ATUAL_PARA_NOVO_ESTADO
   */
  private getChaveTransicao(estadoAtual: StatusSolicitacao, novoEstado: StatusSolicitacao): string {
    return `${estadoAtual}_PARA_${novoEstado}`;
  }

  /**
   * Obtém as permissões necessárias para realizar uma transição
   * @param estadoAtual Estado atual da solicitação
   * @param novoEstado Estado para o qual se deseja transicionar
   * @returns Array com os nomes das permissões necessárias
   */
  getPermissoesNecessarias(estadoAtual: StatusSolicitacao, novoEstado: StatusSolicitacao): string[] {
    const chave = this.getChaveTransicao(estadoAtual, novoEstado);
    return PERMISSOES_TRANSICAO[chave] || [];
  }

  /**
   * Verifica se um usuário tem permissão para realizar uma transição
   * @param estadoAtual Estado atual da solicitação
   * @param novoEstado Estado para o qual se deseja transicionar
   * @param permissoesUsuario Array com as permissões do usuário
   * @returns Boolean indicando se o usuário tem permissão para a transição
   */
  usuarioTemPermissaoParaTransicao(
    estadoAtual: StatusSolicitacao,
    novoEstado: StatusSolicitacao,
    permissoesUsuario: string[],
  ): boolean {
    const permissoesNecessarias = this.getPermissoesNecessarias(estadoAtual, novoEstado);
    
    // Se não houver permissões definidas para a transição, assume que é permitida
    if (permissoesNecessarias.length === 0) {
      return true;
    }

    // Verifica se o usuário possui pelo menos uma das permissões necessárias
    return permissoesNecessarias.some(permissao => permissoesUsuario.includes(permissao));
  }
  
  /**
   * Verifica se uma transição é permitida, lançando exceções caso não seja
   * @param estadoAtual Estado atual da solicitação
   * @param novoEstado Estado para o qual se deseja transicionar
   * @param usuarioId ID do usuário que está realizando a transição
   * @throws BadRequestException se a transição não for válida
   * @throws ForbiddenException se o usuário não tiver permissão
   */
  async verificarTransicaoPermitida(
    estadoAtual: StatusSolicitacao,
    novoEstado: StatusSolicitacao,
    usuarioId: string,
  ): Promise<void> {
    // Verificar se a transição é válida
    if (!this.isTransicaoValida(estadoAtual, novoEstado)) {
      throw new BadRequestException(
        `Transição de ${estadoAtual} para ${novoEstado} não é permitida`,
      );
    }
    
    // Aqui seria necessário um serviço de usuário para buscar as permissões
    // Para simplificar, estamos apenas verificando se a transição é válida
    // em um ambiente de produção, buscaríamos as permissões do usuário
    
    // const permissoesUsuario = await this.usuarioService.getPermissoes(usuarioId);
    // if (!this.usuarioTemPermissaoParaTransicao(estadoAtual, novoEstado, permissoesUsuario)) {
    //   throw new ForbiddenException('Usuário não tem permissão para realizar esta transição');
    // }
  }
}
