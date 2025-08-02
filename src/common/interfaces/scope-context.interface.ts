import { ScopeType } from '../../enums/scope-type.enum';

/**
 * Interface que define o contexto de escopo para uma requisição
 *
 * @description
 * Contém as informações necessárias para aplicar filtros de escopo
 * automaticamente nas queries do banco de dados
 */
export interface IScopeContext {
  /** Tipo de escopo do usuário */
  tipo: ScopeType;

  /** ID do usuário que fez a requisição */
  user_id: string;

  /**
   * ID da unidade do usuário
   * Obrigatório para escopo UNIDADE
   * Opcional para outros escopos
   */
  unidade_id?: string;
}
