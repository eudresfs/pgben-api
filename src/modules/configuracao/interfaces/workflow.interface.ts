import { WorkflowAcaoEnum } from '../enums';

/**
 * Interface que define uma etapa no workflow de um benefício.
 */
export interface IWorkflowEtapa {
  ordem: number;
  descricao: string;
  setor_id: string;
  acao: WorkflowAcaoEnum;
  prazo_sla: number; // Prazo em horas para SLA
  template_notificacao_id?: string;
}

/**
 * Interface que define a estrutura de um workflow de benefício.
 * Os workflows definem o fluxo de processamento para cada tipo de benefício.
 */
export interface IWorkflowBeneficio {
  id: string;
  tipo_beneficio_id: string;
  nome: string;
  descricao: string;
  etapas: IWorkflowEtapa[];
  ativo: boolean;
  created_at: Date;
  updated_at: Date;
  updated_by: string;
}
