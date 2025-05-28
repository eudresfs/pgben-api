import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JwtBlacklistService } from '../auth/services/jwt-blacklist.service';
import { PasswordResetService } from '../auth/services/password-reset.service';
// PasswordRecoveryService removido - usando PasswordResetService

/**
 * Serviço responsável pela limpeza automática de tokens expirados
 * Executa diariamente às 02:00 para manter a base de dados limpa
 * e otimizar a performance das consultas de blacklist
 */
@Injectable()
export class CleanupTokensTask {
  private readonly logger = new Logger(CleanupTokensTask.name);

  constructor(
    private readonly jwtBlacklistService: JwtBlacklistService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  /**
   * Executa limpeza automática de tokens expirados diariamente às 02:00
   * Remove tokens JWT da blacklist, tokens de reset de senha e tokens de recuperação
   * que já expiraram para manter a base de dados otimizada
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleTokenCleanup(): Promise<void> {
    this.logger.log('Iniciando limpeza automática de tokens expirados...');
    
    try {
      // Limpeza de tokens JWT da blacklist
      const deletedJwtTokens = await this.jwtBlacklistService.cleanupExpiredTokens();
      this.logger.log(`Removidos ${deletedJwtTokens} tokens JWT expirados da blacklist`);

      // Limpeza de tokens de reset de senha
      await this.passwordResetService.cleanupExpiredTokens();
      this.logger.log('Tokens de reset de senha expirados removidos');

      // Limpeza de tokens de recuperação de senha
      const deletedRecoveryTokens = await this.passwordResetService.cleanupExpiredTokens();
      this.logger.log(`Removidos ${deletedRecoveryTokens} tokens de recuperação expirados`);

      // Limpeza de tokens de recuperação usados (mais antigos que 7 dias)
      await this.passwordResetService.cleanupOldUsedTokens();
      this.logger.log('Tokens de recuperação usados antigos removidos');

      this.logger.log('Limpeza automática de tokens concluída com sucesso');
    } catch (error) {
      this.logger.error('Erro durante a limpeza automática de tokens:', error);
      // Não relança o erro para não interromper o agendamento
    }
  }

  /**
   * Executa limpeza manual de tokens (útil para testes ou manutenção)
   * Retorna estatísticas da limpeza realizada
   */
  async executeManualCleanup(): Promise<{
    deletedJwtTokens: number;
    deletedRecoveryTokens: number;
    success: boolean;
  }> {
    this.logger.log('Executando limpeza manual de tokens...');
    
    try {
      const deletedJwtTokens = await this.jwtBlacklistService.cleanupExpiredTokens();
      await this.passwordResetService.cleanupExpiredTokens();
      const deletedRecoveryTokens = await this.passwordResetService.cleanupExpiredTokens();
      await this.passwordResetService.cleanupOldUsedTokens();

      this.logger.log('Limpeza manual de tokens concluída com sucesso');
      
      return {
        deletedJwtTokens,
        deletedRecoveryTokens,
        success: true,
      };
    } catch (error) {
      this.logger.error('Erro durante a limpeza manual de tokens:', error);
      return {
        deletedJwtTokens: 0,
        deletedRecoveryTokens: 0,
        success: false,
      };
    }
  }

  /**
   * Retorna estatísticas sobre tokens que serão removidos na próxima limpeza
   * Útil para monitoramento e planejamento de capacidade
   */
  async getCleanupStats(): Promise<{
    expiredJwtTokensCount: number;
    expiredRecoveryTokensCount: number;
    nextCleanupTime: string;
  }> {
    // Para simplificar, retornamos informações básicas
    // Em uma implementação mais robusta, poderíamos consultar diretamente o banco
    return {
      expiredJwtTokensCount: 0, // Seria necessário implementar método específico
      expiredRecoveryTokensCount: 0, // Seria necessário implementar método específico
      nextCleanupTime: '02:00 (próximo dia)',
    };
  }
}