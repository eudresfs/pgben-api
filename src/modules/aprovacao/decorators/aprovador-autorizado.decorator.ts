import { SetMetadata } from '@nestjs/common';
import { TipoEscopo } from '../enums/aprovacao.enums';

/**
 * Interface para configuração de metadados de aprovador autorizado
 * Define as opções para verificar se um usuário pode aprovar uma solicitação
 */
export interface AprovadorAutorizadoMetadata {
  /** Roles que podem aprovar */
  rolesPermitidas?: string[];
  
  /** Permissões específicas necessárias */
  permissoesNecessarias?: string[];
  
  /** Escopo da aprovação */
  escopo?: TipoEscopo;
  
  /** Se deve verificar hierarquia organizacional */
  verificarHierarquia?: boolean;
  
  /** Valor máximo que o aprovador pode aprovar */
  valorMaximo?: number;
  
  /** Se permite delegação de aprovação */
  permiteDelegacao?: boolean;
}

/** Chave para armazenar metadados de aprovador autorizado */
export const APROVADOR_AUTORIZADO_METADATA_KEY = 'aprovador_autorizado_config';

/**
 * Decorator para marcar métodos que requerem verificação de aprovador autorizado
 * 
 * Este decorator verifica se o usuário atual tem autorização para aprovar
 * uma solicitação específica, considerando roles, permissões e escopo.
 * 
 * @param config Configuração da autorização do aprovador
 * 
 * @example
 * ```typescript
 * @AprovadorAutorizado({
 *   rolesPermitidas: ['ADMIN', 'GESTOR'],
 *   escopo: TipoEscopo.UNIDADE,
 *   verificarHierarquia: true
 * })
 * async aprovarSolicitacao(solicitacaoId: string, decisao: string) {
 *   // Implementação da aprovação
 * }
 * ```
 */
export const AprovadorAutorizado = (config: AprovadorAutorizadoMetadata) =>
  SetMetadata(APROVADOR_AUTORIZADO_METADATA_KEY, config);

/**
 * Decorator para aprovadores administrativos (sem restrições)
 * 
 * @example
 * ```typescript
 * @AprovadorAdmin()
 * async aprovarQualquerSolicitacao(solicitacaoId: string) {
 *   // Implementação
 * }
 * ```
 */
export const AprovadorAdmin = () =>
  AprovadorAutorizado({
    rolesPermitidas: ['ADMIN'],
    escopo: TipoEscopo.GLOBAL,
    verificarHierarquia: false,
    permiteDelegacao: true,
  });

/**
 * Decorator para aprovadores de unidade
 * 
 * @param valorMaximo Valor máximo que pode aprovar (opcional)
 * 
 * @example
 * ```typescript
 * @AprovadorUnidade(50000)
 * async aprovarSolicitacaoUnidade(solicitacaoId: string) {
 *   // Implementação
 * }
 * ```
 */
export const AprovadorUnidade = (valorMaximo?: number) =>
  AprovadorAutorizado({
    rolesPermitidas: ['GESTOR', 'COORDENADOR'],
    escopo: TipoEscopo.UNIDADE,
    verificarHierarquia: true,
    valorMaximo,
    permiteDelegacao: false,
  });

/**
 * Decorator para aprovadores técnicos
 * 
 * @param permissoesEspecificas Permissões específicas necessárias
 * 
 * @example
 * ```typescript
 * @AprovadorTecnico(['APROVAR_BENEFICIO', 'GERENCIAR_SOLICITACAO'])
 * async aprovarSolicitacaoTecnica(solicitacaoId: string) {
 *   // Implementação
 * }
 * ```
 */
export const AprovadorTecnico = (permissoesEspecificas: string[]) =>
  AprovadorAutorizado({
    rolesPermitidas: ['TECNICO_SEMTAS', 'ANALISTA'],
    permissoesNecessarias: permissoesEspecificas,
    escopo: TipoEscopo.UNIDADE,
    verificarHierarquia: false,
    permiteDelegacao: false,
  });