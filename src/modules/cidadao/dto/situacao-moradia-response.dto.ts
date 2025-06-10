import { Expose, Type } from 'class-transformer';
import {
  TipoMoradiaEnum,
  ProgramaHabitacionalEnum,
  TipoDesastreEnum,
  TipoDespesaEnum,
} from '../../../enums/situacao-moradia.enum';

export class DespesaMensalResponseDto {
  @Expose()
  tipo: TipoDespesaEnum;

  @Expose()
  valor: number;

  @Expose()
  descricao?: string;
}

export class SituacaoMoradiaResponseDto {
  @Expose()
  id: string;

  @Expose()
  cidadao_id: string;

  // Seção 1 - Tipo de Moradia
  @Expose()
  tipo_moradia?: TipoMoradiaEnum;

  @Expose()
  numero_comodos?: number;

  @Expose()
  valor_aluguel?: number;

  @Expose()
  tempo_moradia?: number;

  // Seção 2 - Condições da Moradia
  @Expose()
  possui_banheiro?: boolean;

  @Expose()
  possui_energia_eletrica?: boolean;

  @Expose()
  possui_agua_encanada?: boolean;

  @Expose()
  possui_coleta_lixo?: boolean;

  // Seção 3 - Situações Especiais
  @Expose()
  moradia_cedida?: boolean;

  @Expose()
  moradia_invadida?: boolean;

  @Expose()
  tipo_desastre?: TipoDesastreEnum;

  @Expose()
  descricao_desastre?: string;

  @Expose()
  outro_tipo_moradia?: string;

  // Seção 4 - Programas Habitacionais
  @Expose()
  programa_habitacional?: ProgramaHabitacionalEnum;

  @Expose()
  inscrito_programa_habitacional?: boolean;

  @Expose()
  reside_2_anos_natal?: boolean;

  // Seção 5 - Despesas Mensais
  @Expose()
  @Type(() => DespesaMensalResponseDto)
  despesas_mensais?: DespesaMensalResponseDto[];

  @Expose()
  observacoes?: string;

  @Expose()
  created_at: Date;

  @Expose()
  updated_at: Date;
}