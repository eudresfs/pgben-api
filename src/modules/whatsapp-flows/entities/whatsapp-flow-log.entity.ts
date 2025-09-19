import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsString,
  IsUUID,
  IsJSON,
  MaxLength,
} from 'class-validator';
import { WhatsAppFlowSession } from './whatsapp-flow-session.entity';
import { ActionType } from '../enums/action-type.enum';
import { ScreenType } from '../enums/screen-type.enum';

/**
 * Entity que representa um log de ação no WhatsApp Flows
 * 
 * @description Registra todas as ações realizadas pelos usuários
 * durante suas sessões no WhatsApp Flows, incluindo navegação
 * entre telas, tentativas de login, buscas e outras interações.
 * 
 * @author SEMTAS Development Team
 * @since 1.0.0
 */
@Entity('whatsapp_flow_logs')
@Index(['session_id'])
@Index(['action_type'])
@Index(['screen_type'])
@Index(['created_at'])
@Index(['session_id', 'created_at'])
export class WhatsAppFlowLog {
  /**
   * Identificador único do log
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * ID da sessão relacionada ao log
   */
  @Column({ type: 'uuid' })
  @IsNotEmpty({ message: 'ID da sessão é obrigatório' })
  @IsUUID('4', { message: 'ID da sessão deve ser um UUID válido' })
  session_id: string;

  /**
   * Tipo de ação realizada
   * Define qual operação foi executada
   */
  @Column({
    type: 'enum',
    enum: ActionType,
  })
  @IsEnum(ActionType, { message: 'Tipo de ação inválido' })
  @IsNotEmpty({ message: 'Tipo de ação é obrigatório' })
  action_type: ActionType;

  /**
   * Tela onde a ação foi realizada
   * Indica em qual interface a ação ocorreu
   */
  @Column({
    type: 'enum',
    enum: ScreenType,
  })
  @IsEnum(ScreenType, { message: 'Tipo de tela inválido' })
  @IsNotEmpty({ message: 'Tipo de tela é obrigatório' })
  screen_type: ScreenType;

  /**
   * Descrição detalhada da ação
   * Fornece contexto adicional sobre o que foi realizado
   */
  @Column({ type: 'varchar', length: 500 })
  @IsNotEmpty({ message: 'Descrição da ação é obrigatória' })
  @IsString({ message: 'Descrição deve ser uma string' })
  @MaxLength(500, { message: 'Descrição deve ter no máximo 500 caracteres' })
  action_description: string;

  /**
   * Dados da requisição em formato JSON
   * Armazena informações sobre os dados enviados
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON({ message: 'Dados da requisição devem estar em formato JSON válido' })
  request_data: Record<string, any>;

  /**
   * Dados da resposta em formato JSON
   * Armazena informações sobre a resposta gerada
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON({ message: 'Dados da resposta devem estar em formato JSON válido' })
  response_data: Record<string, any>;

  /**
   * Indica se a ação foi bem-sucedida
   * Facilita análises de sucesso/falha
   */
  @Column({ type: 'boolean', default: true })
  success: boolean;

  /**
   * Mensagem de erro (se houver)
   * Armazena detalhes de erros ocorridos
   */
  @Column({ type: 'varchar', length: 1000, nullable: true })
  @IsOptional()
  @IsString({ message: 'Mensagem de erro deve ser uma string' })
  @MaxLength(1000, { message: 'Mensagem de erro deve ter no máximo 1000 caracteres' })
  error_message: string;

  /**
   * Endereço IP do cliente (se disponível)
   * Para auditoria e segurança
   */
  @Column({ type: 'varchar', length: 45, nullable: true })
  @IsOptional()
  @IsString({ message: 'IP do cliente deve ser uma string' })
  @MaxLength(45, { message: 'IP do cliente deve ter no máximo 45 caracteres' })
  client_ip: string;

  /**
   * User Agent do cliente (se disponível)
   * Para análise de dispositivos e navegadores
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  @IsOptional()
  @IsString({ message: 'User Agent deve ser uma string' })
  @MaxLength(500, { message: 'User Agent deve ter no máximo 500 caracteres' })
  user_agent: string;

  /**
   * Tempo de processamento da ação em milissegundos
   * Para análise de performance
   */
  @Column({ type: 'integer', nullable: true })
  @IsOptional()
  processing_time_ms: number;

  /**
   * Data e hora de criação do log
   */
  @CreateDateColumn()
  created_at: Date;

  /*
   * Relacionamentos
   */

  /**
   * Sessão relacionada ao log
   */
  @ManyToOne(() => WhatsAppFlowSession, (session) => session.logs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session: WhatsAppFlowSession;

  /*
   * Métodos auxiliares
   */

  /**
   * Verifica se a ação foi realizada recentemente
   * @param minutes Número de minutos para considerar como recente (padrão: 5)
   * @returns true se a ação foi realizada nos últimos X minutos
   */
  isRecent(minutes: number = 5): boolean {
    const now = new Date();
    const threshold = new Date(now.getTime() - minutes * 60 * 1000);
    return this.created_at > threshold;
  }

  /**
   * Verifica se a ação resultou em erro
   * @returns true se houve erro na ação
   */
  hasError(): boolean {
    return !this.success || !!this.error_message;
  }

  /**
   * Obtém um resumo da ação para logs
   * @returns string com resumo da ação
   */
  getActionSummary(): string {
    const status = this.success ? 'SUCCESS' : 'ERROR';
    return `[${status}] ${this.action_type} on ${this.screen_type}: ${this.action_description}`;
  }

  /**
   * Verifica se a ação foi lenta (acima de um threshold)
   * @param thresholdMs Threshold em milissegundos (padrão: 5000)
   * @returns true se a ação foi considerada lenta
   */
  isSlow(thresholdMs: number = 5000): boolean {
    return this.processing_time_ms && this.processing_time_ms > thresholdMs;
  }

  /**
   * Remove dados sensíveis do log para exibição
   * @returns objeto com dados sanitizados
   */
  sanitizeForDisplay(): Partial<WhatsAppFlowLog> {
    const sanitized = { ...this };
    
    // Remove dados sensíveis dos request/response data
    if (sanitized.request_data) {
      const { password, token, ...safeRequestData } = sanitized.request_data;
      sanitized.request_data = safeRequestData;
    }
    
    if (sanitized.response_data) {
      const { password, token, sensitive_data, ...safeResponseData } = sanitized.response_data;
      sanitized.response_data = safeResponseData;
    }
    
    return sanitized;
  }
}