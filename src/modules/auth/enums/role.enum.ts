/**
 * Enum para definir os papéis de usuário no sistema
 * 
 * Estes papéis são utilizados para controle de acesso baseado em papéis (RBAC)
 */
export enum Role {
  ADMIN = 'administrador',
  GESTOR_SEMTAS = 'gestor_semtas',
  TECNICO_SEMTAS = 'tecnico_semtas',
  TECNICO_UNIDADE = 'tecnico_unidade',
  COORDENADOR = "coordenador_unidade",
}
