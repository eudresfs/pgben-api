import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { RegistroMetrica } from './registro-metrica.entity';
import { RegraAlerta } from './regra-alerta.entity';

/**
 * Tipos de métricas suportados pelo sistema
 */
export enum TipoMetricaEnum {
  SEGURANCA = 'seguranca',
  LGPD = 'lgpd',
  DOCUMENTO = 'documento',
  SISTEMA = 'sistema',
  BANCO_DADOS = 'banco_dados',
  HTTP = 'http',
}

/**
 * Categorias de métricas
 */
export enum CategoriaMetricaEnum {
  CONTAGEM = 'contagem',
  DURACAO = 'duracao',
  TAMANHO = 'tamanho',
  PERCENTUAL = 'percentual',
  ESTADO = 'estado',
  ERRO = 'erro',
}

/**
 * Entidade que representa uma definição de métrica no sistema
 *
 * Esta entidade armazena as informações básicas sobre uma métrica,
 * como seu nome, tipo, categoria e limiares para alertas.
 */
@Entity('metricas')
export class Metrica {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  nome: string;

  @Column({
    type: 'enum',
    enum: TipoMetricaEnum,
  })
  tipo: TipoMetricaEnum;

  @Column({
    type: 'enum',
    enum: CategoriaMetricaEnum,
  })
  categoria: CategoriaMetricaEnum;

  @Column({ type: 'text', nullable: true })
  descricao: string;

  @Column({ default: true })
  ativo: boolean;

  @Column({ length: 50, nullable: true })
  unidade_medida: string;

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  limiar_alerta: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  limiar_critico: number;

  @Column({ type: 'jsonb', nullable: true })
  tags: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({ nullable: true })
  removed_at: Date;

  @OneToMany(() => RegistroMetrica, (registro) => registro.metrica)
  registros: RegistroMetrica[];

  @OneToMany(() => RegraAlerta, (regra) => regra.metrica)
  regras_alerta: RegraAlerta[];
}
