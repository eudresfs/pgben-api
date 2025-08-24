import { Expose } from 'class-transformer';

/**
 * DTO para resposta da API do Portal da Transparência
 * 
 * Representa os dados retornados pela consulta de pessoa física
 * no Portal da Transparência do Governo Federal
 */
export class PortalTransparenciaResponseDto {
  @Expose()
  cpf: string;

  @Expose()
  nome: string;

  @Expose()
  nis: string;

  @Expose()
  favorecidoDespesas: boolean;

  @Expose()
  servidor: boolean;

  @Expose()
  beneficiarioDiarias: boolean;

  @Expose()
  permissionario: boolean;

  @Expose()
  contratado: boolean;

  @Expose()
  sancionadoCEIS: boolean;

  @Expose()
  sancionadoCNEP: boolean;

  @Expose()
  sancionadoCEAF: boolean;

  @Expose()
  portadorCPDC: boolean;

  @Expose()
  portadorCPGF: boolean;

  @Expose()
  favorecidoBolsaFamilia: boolean;

  @Expose()
  favorecidoPeti: boolean;

  @Expose()
  favorecidoSafra: boolean;

  @Expose()
  favorecidoSeguroDefeso: boolean;

  @Expose()
  favorecidoBpc: boolean;

  @Expose()
  favorecidoTransferencias: boolean;

  @Expose()
  favorecidoCPCC: boolean;

  @Expose()
  favorecidoCPDC: boolean;

  @Expose()
  favorecidoCPGF: boolean;

  @Expose()
  participanteLicitacao: boolean;

  @Expose()
  servidorInativo: boolean;

  @Expose()
  pensionistaOuRepresentanteLegal: boolean;

  @Expose()
  instituidorPensao: boolean;

  @Expose()
  auxilioEmergencial: boolean;

  @Expose()
  favorecidoAuxilioBrasil: boolean;

  @Expose()
  favorecidoNovoBolsaFamilia: boolean;

  @Expose()
  favorecidoAuxilioReconstrucao: boolean;
}

/**
 * DTO para resposta do endpoint novo-bolsa-familia-sacado-por-nis
 */
export class UfDto {
  @Expose()
  sigla: string;

  @Expose()
  nome: string;
}

export class MunicipioDto {
  @Expose()
  codigoIBGE: string;

  @Expose()
  nomeIBGE: string;

  @Expose()
  codigoRegiao: string;

  @Expose()
  nomeRegiao: string;

  @Expose()
  pais: string;

  @Expose()
  uf: UfDto;
}

export class BeneficiarioNovoBolsaFamiliaDto {
  @Expose()
  cpfFormatado: string;

  @Expose()
  nis: string;

  @Expose()
  nome: string;
}

export class NovoBolsaFamiliaSacadoResponseDto {
  @Expose()
  id: number;

  @Expose()
  dataMesCompetencia: string;

  @Expose()
  dataMesReferencia: string;

  @Expose()
  municipio: MunicipioDto;

  @Expose()
  beneficiarioNovoBolsaFamilia: BeneficiarioNovoBolsaFamiliaDto;

  @Expose()
  valorSaque: number;

  @Expose()
  naturalidade?: string;
}

/**
 * DTO consolidado com dados processados do Portal da Transparência
 * 
 * Contém informações organizadas e categorizadas sobre o cidadão
 * obtidas através da consulta ao Portal da Transparência
 */
export class DadosPortalTransparenciaDto {
  @Expose()
  cpf: string;

  @Expose()
  nome: string;

  @Expose()
  nis?: string;

  @Expose()
  naturalidade?: string;

  @Expose()
  beneficiosAtivos: string[];

  @Expose()
  sancoes: string[];

  @Expose()
  vinculosGovernamentais: string[];

  @Expose()
  dataConsulta: Date;

  @Expose()
  fonte: string;

  @Expose()
  novoBolsaFamiliaSacado?: NovoBolsaFamiliaSacadoResponseDto[];
}