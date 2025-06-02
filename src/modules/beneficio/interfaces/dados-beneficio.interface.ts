/**
 * Interface base para todas as entidades de dados de benefícios
 */
export interface IDadosBeneficio {
  id: string;
  solicitacao_id: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

/**
 * Interface base para DTOs de criação de dados de benefícios
 */
export interface ICreateDadosBeneficioDto {
  solicitacao_id: string;
  [key: string]: any;
}

/**
 * Interface base para DTOs de atualização de dados de benefícios
 */
export interface IUpdateDadosBeneficioDto {
  [key: string]: any;
}

/**
 * Interface para serviços de dados de benefícios
 */
export interface IDadosBeneficioService<T extends IDadosBeneficio, C extends ICreateDadosBeneficioDto, U extends IUpdateDadosBeneficioDto> {
  create(createDto: C): Promise<T>;
  findOne(id: string): Promise<T>;
  findBySolicitacao(solicitacaoId: string): Promise<T>;
  update(id: string, updateDto: U): Promise<T>;
  remove(id: string): Promise<void>;
  existsBySolicitacao(solicitacaoId: string): Promise<boolean>;
}

/**
 * Enum para tipos de dados de benefícios
 */
export enum TipoDadosBeneficio {
  ALUGUEL_SOCIAL = 'aluguel-social',
  CESTA_BASICA = 'cesta-basica',
  FUNERAL = 'funeral',
  NATALIDADE = 'natalidade'
}

/**
 * Mapeamento de tipos para entidades
 */
export interface TipoBeneficioMapping {
  [TipoDadosBeneficio.ALUGUEL_SOCIAL]: {
    entity: 'DadosAluguelSocial';
    createDto: 'CreateDadosAluguelSocialDto';
    updateDto: 'UpdateDadosAluguelSocialDto';
  };
  [TipoDadosBeneficio.CESTA_BASICA]: {
    entity: 'DadosCestaBasica';
    createDto: 'CreateDadosCestaBasicaDto';
    updateDto: 'UpdateDadosCestaBasicaDto';
  };
  [TipoDadosBeneficio.FUNERAL]: {
    entity: 'DadosFuneral';
    createDto: 'CreateDadosFuneralDto';
    updateDto: 'UpdateDadosFuneralDto';
  };
  [TipoDadosBeneficio.NATALIDADE]: {
    entity: 'DadosNatalidade';
    createDto: 'CreateDadosNatalidadeDto';
    updateDto: 'UpdateDadosNatalidadeDto';
  };
}