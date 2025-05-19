import { ParametroTipoEnum } from '../enums';

/**
 * Interface que define a estrutura de um parâmetro de configuração.
 * Os parâmetros são utilizados para personalizar o comportamento do sistema
 * sem necessidade de alterações no código-fonte.
 */
export interface IParametro {
  id: string;
  chave: string;
  valor: string;
  tipo: ParametroTipoEnum;
  descricao: string;
  categoria: string;
  created_at: Date;
  updated_at: Date;
  updated_by: string;
}

/**
 * Interface que define o valor tipado de um parâmetro,
 * após conversão para o tipo correto.
 */
export interface IParametroValorTipado<T> {
  valorTipado: T;
  tipo: ParametroTipoEnum;
}
