import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { Usuario } from '../../modules/usuario/entities/usuario.entity';
import { UsuarioRepository } from '../../modules/usuario/repositories/usuario.repository';
import { EmailService } from '../../common/services/email.service';
import { AuditService } from '../../audit/services/audit.service';
import { ClientInfo } from '../../common/interfaces/client-info.interface';
import { AuditAction, AuditSeverity } from '../../audit/entities/audit-log.entity';

export interface RequestPasswordResetDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordResetStats {
  totalRequests: number;
  activeTokens: number;
  expiredTokens: number;
  usedTokens: number;
  requestsLast24h: number;
  averageTimeToUse: number; // em minutos
}

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly tokenExpirationMinutes: number;
  private readonly maxAttemptsPerToken: number;
  private readonly maxRequestsPerHour: number;

  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    private readonly usuarioRepository: UsuarioRepository,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {
    this.tokenExpirationMinutes = this.configService.get<number>(
      'PASSWORD_RESET_EXPIRATION_MINUTES',
      15,
    );
    this.maxAttemptsPerToken = this.configService.get<number>(
      'PASSWORD_RESET_MAX_ATTEMPTS',
      3,
    );
    this.maxRequestsPerHour = this.configService.get<number>(
      'PASSWORD_RESET_MAX_REQUESTS_PER_HOUR',
      5,
    );
  }

  /**
   * Solicita recuperação de senha
   */
  async requestPasswordReset(
    requestDto: RequestPasswordResetDto,
    clientInfo: ClientInfo,
  ): Promise<{ message: string; expiresInMinutes: number }> {
    const { email } = requestDto;

    try {
      // Buscar usuário pelo email
      const usuario = await this.usuarioRepository.findByEmail(email.toLowerCase());

      // Por segurança, sempre retornamos sucesso mesmo se o email não existir
      if (!usuario) {
        this.logger.warn(`Tentativa de reset para email inexistente: ${email}`, {
          ip: clientInfo.ip,
          userAgent: clientInfo.userAgent,
        });

        await this.auditService.logSecurityEvent(
          AuditAction.PASSWORD_RESET,
          `Tentativa de reset para email inexistente: ${email}`,
          undefined,
          AuditSeverity.MEDIUM,
          { email },
          { ip: clientInfo.ip, userAgent: clientInfo.userAgent }
        );

        return {
          message: 'Se o email existir, você receberá instruções para redefinir sua senha.',
          expiresInMinutes: this.tokenExpirationMinutes,
        };
      }

      // Verificar rate limiting
      await this.checkRateLimit(usuario.id, clientInfo.ip);

      // Invalidar tokens anteriores do usuário
      await this.invalidateUserTokens(usuario.id, 'new_request');

      // Gerar novo token
      const token = this.generateSecureToken();
      const tokenHash = await this.hashToken(token);
      const expiresAt = new Date(Date.now() + this.tokenExpirationMinutes * 60 * 1000);

      // Salvar token no banco
      const passwordResetToken = this.passwordResetTokenRepository.create({
        token: token.substring(0, 8) + '...', // Armazenar apenas parte do token para auditoria
        token_hash: tokenHash,
        usuario_id: usuario.id,
        expires_at: expiresAt,
        client_ip: clientInfo.ip,
        user_agent: clientInfo.userAgent,
        metadata: {
          origin: clientInfo.origin,
          referer: clientInfo.referer,
        },
      });

      await this.passwordResetTokenRepository.save(passwordResetToken);

      // Enviar email
      await this.sendPasswordResetEmail(usuario, token, expiresAt);

      // Log de auditoria
      await this.auditService.logUserAction(
        usuario.id,
        AuditAction.PASSWORD_RESET,
        'password_reset_token',
        passwordResetToken.id,
        'Solicitação de recuperação de senha',
        { ip: clientInfo.ip, userAgent: clientInfo.userAgent }
      );

      this.logger.log(`Token de recuperação gerado para usuário ${usuario.id}`);

      return {
        message: 'Se o email existir, você receberá instruções para redefinir sua senha.',
        expiresInMinutes: this.tokenExpirationMinutes,
      };
    } catch (error) {
      this.logger.error('Erro ao solicitar recuperação de senha', error.stack);
      
      await this.auditService.logSecurityEvent(
        AuditAction.PASSWORD_RESET,
        `Erro ao processar solicitação de reset: ${error.message}`,
        undefined,
        AuditSeverity.HIGH,
        { email, error: error.message },
        { ip: clientInfo.ip, userAgent: clientInfo.userAgent }
      );

      throw new InternalServerErrorException(
        'Erro interno. Tente novamente mais tarde.',
      );
    }
  }

  /**
   * Redefine a senha usando o token
   */
  async resetPassword(
    resetDto: ResetPasswordDto,
    clientInfo: ClientInfo,
  ): Promise<{ message: string }> {
    const { token, newPassword, confirmPassword } = resetDto;

    // Validar senhas
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('As senhas não coincidem');
    }

    if (newPassword.length < 8) {
      throw new BadRequestException('A senha deve ter pelo menos 8 caracteres');
    }

    try {
      // Buscar token válido
      const resetToken = await this.findValidToken(token);
      if (!resetToken) {
        await this.auditService.logSecurityEvent(
          AuditAction.PASSWORD_RESET,
          'Tentativa de uso de token inválido para reset de senha',
          undefined,
          AuditSeverity.HIGH,
          { tokenPrefix: token.substring(0, 8) },
          { ip: clientInfo.ip, userAgent: clientInfo.userAgent }
        );
        throw new UnauthorizedException('Token inválido ou expirado');
      }

      // Carregar usuário pelo ID
      const usuario = await this.usuarioRepository.findById(resetToken.usuario_id);

      if (!usuario) {
        throw new NotFoundException('Usuário não encontrado');
      }

      // Verificar se a nova senha é diferente da atual
      const isSamePassword = await bcrypt.compare(newPassword, usuario.senha);
      if (isSamePassword) {
        throw new BadRequestException(
          'A nova senha deve ser diferente da senha atual',
        );
      }

      // Hash da nova senha
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Atualizar senha do usuário usando query builder
      await this.passwordResetTokenRepository
        .manager
        .createQueryBuilder()
        .update('usuario')
        .set({
          senha: hashedPassword,
          updated_at: new Date()
        })
        .where("id = :id", { id: usuario.id })
        .execute();

      // Marcar token como usado
      resetToken.markAsUsed('password_changed');
      await this.passwordResetTokenRepository.save(resetToken);

      // Invalidar outros tokens do usuário
      await this.invalidateUserTokens(usuario.id, 'password_changed', resetToken.id);

      // Enviar email de confirmação
      await this.sendPasswordResetConfirmationEmail(usuario, clientInfo);

      // Log de auditoria
      await this.auditService.logUserAction(
        usuario.id,
        AuditAction.PASSWORD_RESET,
        'usuario',
        usuario.id,
        'Senha redefinida com sucesso',
        { ip: clientInfo.ip, userAgent: clientInfo.userAgent }
      );

      await this.auditService.logSecurityEvent(
        AuditAction.PASSWORD_RESET,
        `Senha redefinida com sucesso para o usuário ${usuario.email}`,
        usuario.id,
        AuditSeverity.MEDIUM,
        { email: usuario.email },
        { ip: clientInfo.ip, userAgent: clientInfo.userAgent }
      );

      this.logger.log(`Senha redefinida com sucesso para usuário ${usuario.id}`);

      return {
        message: 'Senha redefinida com sucesso. Você pode fazer login com sua nova senha.',
      };
    } catch (error) {
      // Registrar erro e redirecionar
      const foundToken = await this.findValidToken(token);
      if (foundToken) {
        foundToken.markAsUsed('password_reset_error');
        await this.passwordResetTokenRepository.save(foundToken);
      }

      this.logger.error('Erro ao redefinir senha', error.stack);
      
      await this.auditService.logSecurityEvent(
        AuditAction.PASSWORD_RESET,
        `Erro ao redefinir senha: ${error.message}`,
        foundToken?.usuario?.id,
        AuditSeverity.HIGH,
        { tokenPrefix: token.substring(0, 8), error: error.message },
        { ip: clientInfo.ip, userAgent: clientInfo.userAgent }
      );

      if (error instanceof BadRequestException || 
          error instanceof UnauthorizedException || 
          error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Erro interno. Tente novamente mais tarde.',
      );
    }
  }

  /**
   * Valida se um token é válido
   */
  async validateToken(token: string): Promise<{ valid: boolean; expiresInMinutes?: number }> {
    try {
      const resetToken = await this.findValidToken(token);
      
      if (!resetToken) {
        return { valid: false };
      }

      return {
        valid: true,
        expiresInMinutes: resetToken.getMinutesUntilExpiration(),
      };
    } catch (error) {
      this.logger.error('Erro ao validar token', error.stack);
      return { valid: false };
    }
  }

  /**
   * Obtém estatísticas de recuperação de senha
   */
  async getPasswordResetStats(): Promise<PasswordResetStats> {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [totalRequests, activeTokens, expiredTokens, usedTokens, requestsLast24h] = 
      await Promise.all([
        this.passwordResetTokenRepository.count(),
        this.passwordResetTokenRepository.count({
          where: {
            is_used: false,
            expires_at: LessThan(now),
          },
        }),
        this.passwordResetTokenRepository.count({
          where: {
            is_used: false,
            expires_at: LessThan(now),
          },
        }),
        this.passwordResetTokenRepository.count({
          where: { is_used: true },
        }),
        this.passwordResetTokenRepository.count({
          where: {
            created_at: LessThan(last24h),
          },
        }),
      ]);

    // Calcular tempo médio de uso
    const usedTokensWithTime = await this.passwordResetTokenRepository
      .createQueryBuilder('token')
      .select('AVG(EXTRACT(EPOCH FROM (token.used_at - token.created_at)) / 60)', 'avgMinutes')
      .where('token.is_used = true AND token.used_at IS NOT NULL')
      .getRawOne();

    const averageTimeToUse = parseFloat(usedTokensWithTime?.avgMinutes || '0');

    return {
      totalRequests,
      activeTokens,
      expiredTokens,
      usedTokens,
      requestsLast24h,
      averageTimeToUse,
    };
  }

  /**
   * Limpeza automática de tokens expirados (executa a cada hora)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const now = new Date();
      const result = await this.passwordResetTokenRepository.delete({
        expires_at: LessThan(now),
        is_used: false,
      });

      if (result.affected && result.affected > 0) {
        this.logger.log(`Removidos ${result.affected} tokens de recuperação expirados`);
      }
    } catch (error) {
      this.logger.error('Erro na limpeza de tokens expirados', error.stack);
    }
  }

  /**
   * Limpeza de tokens antigos usados (executa diariamente)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldUsedTokens(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await this.passwordResetTokenRepository.delete({
        is_used: true,
        used_at: LessThan(thirtyDaysAgo),
      });

      if (result.affected && result.affected > 0) {
        this.logger.log(`Removidos ${result.affected} tokens de recuperação antigos`);
      }
    } catch (error) {
      this.logger.error('Erro na limpeza de tokens antigos', error.stack);
    }
  }

  // Métodos privados

  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  }

  private async findValidToken(token: string): Promise<PasswordResetToken | null> {
    const tokens = await this.passwordResetTokenRepository.find({
      where: {
        is_used: false,
        expires_at: LessThan(new Date()),
      },
      relations: ['usuario'],
    });

    for (const resetToken of tokens) {
      const isValid = await bcrypt.compare(token, resetToken.token_hash);
      if (isValid && resetToken.isValid()) {
        // Incrementar tentativas
        resetToken.incrementAttempts();
        await this.passwordResetTokenRepository.save(resetToken);
        
        // Verificar limite de tentativas
        if (resetToken.attempts > this.maxAttemptsPerToken) {
          resetToken.markAsUsed('max_attempts_exceeded');
          await this.passwordResetTokenRepository.save(resetToken);
          return null;
        }
        
        return resetToken;
      }
    }

    return null;
  }

  private async checkRateLimit(usuarioId: string, ip: string): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentRequests = await this.passwordResetTokenRepository.count({
      where: [
        {
          usuario_id: usuarioId,
          created_at: LessThan(oneHourAgo),
        },
        {
          client_ip: ip,
          created_at: LessThan(oneHourAgo),
        },
      ],
    });

    if (recentRequests >= this.maxRequestsPerHour) {
      throw new BadRequestException(
        'Muitas solicitações de recuperação. Tente novamente mais tarde.',
      );
    }
  }

  private async invalidateUserTokens(
    usuarioId: string,
    reason: string,
    excludeTokenId?: string,
  ): Promise<void> {
    const query = this.passwordResetTokenRepository
      .createQueryBuilder()
      .update(PasswordResetToken)
      .set({
        is_used: true,
        invalidation_reason: reason,
        updated_at: new Date(),
      })
      .where('usuario_id = :usuarioId', { usuarioId })
      .andWhere('is_used = false');

    if (excludeTokenId) {
      query.andWhere('id != :excludeTokenId', { excludeTokenId });
    }

    await query.execute();
  }

  private async sendPasswordResetEmail(
    usuario: Usuario,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    const expiresInMinutes = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60));

    await this.emailService.sendPasswordResetEmail(
      usuario.email,
      usuario.nome,
      token,
      expiresInMinutes
    );
  }

  private async sendPasswordResetConfirmationEmail(
    usuario: Usuario,
    clientInfo: ClientInfo,
  ): Promise<void> {
    await this.emailService.sendPasswordResetConfirmationEmail(
      usuario.email,
      usuario.nome
    );
  }
}