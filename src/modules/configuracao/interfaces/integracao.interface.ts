import { IntegracaoTipoEnum } from '../enums';

/**
 * Interface que define a estrutura de uma configuração de integração.
 * As configurações de integração permitem conectar o sistema com serviços
 * externos como email, storage, SMS e APIs.
 */
export interface IConfiguracaoIntegracao {
  id: string;
  tipo: IntegracaoTipoEnum;
  nome: string;
  ativo: boolean;
  parametros: Record<string, string>;
  created_at: Date;
  updated_at: Date;
  updated_by: string;
}
