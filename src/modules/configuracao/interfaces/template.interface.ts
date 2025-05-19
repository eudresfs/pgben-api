import { TemplateTipoEnum } from '../enums';

/**
 * Interface que define a estrutura de um template do sistema.
 * Os templates são utilizados para gerar conteúdo dinâmico para emails,
 * notificações e documentos.
 */
export interface ITemplate {
  id: string;
  codigo: string;
  nome: string;
  tipo: TemplateTipoEnum;
  assunto?: string;
  conteudo: string;
  variaveis: string[];
  ativo: boolean;
  created_at: Date;
  updated_at: Date;
  updated_by: string;
}

/**
 * Interface que define os dados necessários para renderizar um template.
 */
export interface ITemplateRenderizacao {
  codigo: string;
  dados: Record<string, any>;
}
