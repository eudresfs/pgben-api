import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import {
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsString,
  IsUUID,
  IsJSON,
  IsDate,
} from 'class-validator';
import { Usuario } from '../../../entities/usuario.entity';
import { Cidadao } from '../../../entities/cidadao.entity';
import { ScreenType } from '../enums/screen-type.enum';
import { WhatsAppFlowLog } from './whatsapp-flow-log.entity';

/**
 * Entity que representa uma sessão ativa do WhatsApp Flows
 * 
 * @description Armazena informações sobre sessões de usuários interagindo
 * com o sistema através do WhatsApp Business API. Cada sessão mantém
 * o estado atual do fluxo e dados temporários da interação.
 * 
 * @author SEMTAS Development Team
 * @since 1.0.0
 */
@Entity('whatsapp_flow_sessions')
@Index(['flow_token'], { unique: true })
@Index(['usuario_id'])
@Index(['cidadao_id'])
@Index(['expires_at'])
@Index(['created_at'])
export class WhatsAppFlowSession {
  /**
   * Identificador único da sessão
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Token único do fluxo fornecido pelo WhatsApp
   * Utilizado para identificar a sessão específica
   */
  @Column({ type: 'varchar', length: 255, unique: true })
  @IsNotEmpty({ message: 'Flow token é obrigatório' })
  @IsString({ message: 'Flow token deve ser uma string' })
  flow_token: string;

  /**
   * Tela atual em que o usuário se encontra no fluxo
   * Define qual interface está sendo exibida
   */
  @Column({
    type: 'enum',
    enum: ScreenType,
    default: ScreenType.INICIO,
  })
  @IsEnum(ScreenType, { message: 'Tipo de tela inválido' })
  current_screen: ScreenType;

  /**
   * Dados da sessão em formato JSON
   * Armazena informações temporárias e estado do fluxo
   */
  @Column({ type: 'jsonb', default: '{}' })
  @IsOptional()
  @IsJSON({ message: 'Dados da sessão devem estar em formato JSON válido' })
  session_data: Record<string, any>;

  /**
   * ID do usuário autenticado (opcional)
   * Preenchido após login bem-sucedido
   */
  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'ID do usuário deve ser um UUID válido' })
  usuario_id: string;

  /**
   * ID do cidadão relacionado (opcional)
   * Preenchido quando um cidadão é encontrado ou cadastrado
   */
  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'ID do cidadão deve ser um UUID válido' })
  cidadao_id: string;

  /**
   * Data e hora de criação da sessão
   */
  @CreateDateColumn()
  created_at: Date;

  /**
   * Data e hora da última atualização da sessão
   */
  @UpdateDateColumn()
  updated_at: Date;

  /**
   * Data e hora de expiração da sessão
   * Por padrão, sessões expiram em 24 horas
   */
  @Column({
    type: 'timestamp with time zone',
    default: () => "NOW() + INTERVAL '24 hours'",
  })
  @IsDate({ message: 'Data de expiração deve ser uma data válida' })
  expires_at: Date;

  /*
   * Relacionamentos
   */

  /**
   * Usuário autenticado relacionado à sessão
   */
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  /**
   * Cidadão relacionado à sessão
   */
  @ManyToOne(() => Cidadao, { nullable: true })
  @JoinColumn({ name: 'cidadao_id' })
  cidadao: Cidadao;

  /**
   * Logs de ações realizadas nesta sessão
   */
  @OneToMany(() => WhatsAppFlowLog, (log) => log.session)
  logs: WhatsAppFlowLog[];

  /*
   * Métodos auxiliares
   */

  /**
   * Verifica se a sessão está expirada
   * @returns true se a sessão expirou
   */
  isExpired(): boolean {
    return new Date() > this.expires_at;
  }

  /**
   * Verifica se o usuário está autenticado na sessão
   * @returns true se há um usuário autenticado
   */
  isAuthenticated(): boolean {
    return !!this.usuario_id;
  }

  /**
   * Verifica se há um cidadão associado à sessão
   * @returns true se há um cidadão associado
   */
  hasCidadao(): boolean {
    return !!this.cidadao_id;
  }

  /**
   * Atualiza os dados da sessão
   * @param data Novos dados para armazenar na sessão
   */
  updateSessionData(data: Record<string, any>): void {
    this.session_data = { ...this.session_data, ...data };
  }

  /**
   * Limpa dados sensíveis da sessão
   * Remove informações como senhas e tokens temporários
   */
  clearSensitiveData(): void {
    if (this.session_data) {
      delete this.session_data.password;
      delete this.session_data.temp_token;
      delete this.session_data.sensitive_info;
    }
  }

  /**
   * Estende o tempo de expiração da sessão
   * @param hours Número de horas para estender (padrão: 24)
   */
  extendExpiration(hours: number = 24): void {
    const now = new Date();
    this.expires_at = new Date(now.getTime() + hours * 60 * 60 * 1000);
  }
}