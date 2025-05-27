import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { Usuario } from '../../modules/usuario/entities/usuario.entity';
import { UsuarioRepository } from '../../modules/usuario/repositories/usuario.repository';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  ValidateTokenDto as ValidateResetTokenDto,
  ForgotPasswordResponseDto,
  ResetPasswordResponseDto,
  ValidateTokenResponseDto as ValidateResetTokenResponseDto,
} from '../dto/password-reset.dto';

/**
 * Serviço de Recuperação de Senha
 * 
 * Implementa funcionalidades seguras para:
 * - Solicitação de recuperação de senha
 * - Validação de tokens de recuperação
 * - Reset de senha com token
 * - Limpeza automática de tokens expirados
 * - Auditoria de tentativas de recuperação
 */
@Injectable()
export class PasswordRecoveryService {
  private readonly logger = new Logger(PasswordRecoveryService.name);
  private readonly TOKEN_EXPIRY_MINUTES = 15;
  private readonly MAX_ATTEMPTS = 5;
  private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 horas

  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    private readonly usuarioRepository: UsuarioRepository,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {
    // Iniciar limpeza automática de tokens expirados
    this.startTokenCleanup();
  }

  /**
   * Solicita recuperação de senha para um email
   * @param forgotPasswordDto Dados da solicitação
   * @param clientIp IP do cliente
   * @param userAgent User Agent do cliente
   * @returns Resposta da solicitação
   */
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
    clientIp?: string,
    userAgent?: string,
  ): Promise<ForgotPasswordResponseDto> {
    const { email } = forgotPasswordDto;

    try {
      // Buscar usuário pelo email
      const usuario = await this.usuarioRepository.findByEmail(email.toLowerCase());

      // Por segurança, sempre retornamos sucesso mesmo se o email não existir
      // Isso previne enumeração de emails válidos
      if (!usuario) {
        this.logger.warn(`Tentativa de recuperação para email inexistente: ${email}`, {
          email,
          clientIp,
          userAgent,
        });
        
        return {
          message: 'Se o email existir em nossa base, você receberá instruções para recuperação de senha',
          timestamp: new Date().toISOString(),
          expiresInMinutes: this.TOKEN_EXPIRY_MINUTES,
        };
      }

      // Verificar se o usuário está ativo
      if (!usuario.ativo) {
        this.logger.warn(`Tentativa de recuperação para usuário inativo: ${email}`, {
          usuarioId: usuario.id,
          email,
          clientIp,
        });
        
        return {
          message: 'Se o email existir em nossa base, você receberá instruções para recuperação de senha',
          timestamp: new Date().toISOString(),
          expiresInMinutes: this.TOKEN_EXPIRY_MINUTES,
        };
      }

      // Verificar rate limiting - máximo 3 solicitações por hora
      await this.checkRateLimit(usuario.id, clientIp);

      // Invalidar tokens anteriores do usuário
      await this.invalidateUserTokens(usuario.id, 'new_request');

      // Gerar novo token
      const token = await this.generateResetToken(
        usuario,
        clientIp,
        userAgent,
      );

      // Aqui você integraria com o serviço de email
      // await this.emailService.sendPasswordResetEmail(usuario.email, token.token);

      this.logger.log(`Token de recuperação gerado para usuário: ${usuario.id}`, {
        usuarioId: usuario.id,
        email: usuario.email,
        tokenId: token.id,
        expiresAt: token.expires_at,
        clientIp,
      });

      return {
        message: 'Se o email existir em nossa base, você receberá instruções para recuperação de senha',
        timestamp: new Date().toISOString(),
        expiresInMinutes: this.TOKEN_EXPIRY_MINUTES,
      };
    } catch (error) {
      this.logger.error(`Erro ao processar recuperação de senha: ${error.message}`, {
        email,
        clientIp,
        error: error.stack,
      });
      
      throw new InternalServerErrorException(
        'Erro interno do servidor. Tente novamente mais tarde.',
      );
    }
  }

  /**
   * Valida um token de recuperação
   * @param validateTokenDto Dados de validação
   * @returns Status de validação do token
   */
  async validateResetToken(
    validateTokenDto: ValidateResetTokenDto,
  ): Promise<ValidateResetTokenResponseDto> {
    const { token } = validateTokenDto;

    try {
      const resetToken = await this.findValidToken(token);

      if (!resetToken) {
        return {
          valid: false,
          error: 'Token inválido ou expirado',
        };
      }

      return {
        valid: true,
        email: resetToken.usuario.email,
        minutesRemaining: resetToken.getMinutesUntilExpiration(),
      };
    } catch (error) {
      this.logger.error(`Erro ao validar token: ${error.message}`, {
        token: token.substring(0, 10) + '...',
        error: error.stack,
      });
      
      return {
        valid: false,
        error: 'Erro ao validar token',
      };
    }
  }

  /**
   * Reseta a senha usando um token válido
   * @param resetPasswordDto Dados do reset
   * @param clientIp IP do cliente
   * @returns Resposta do reset
   */
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
    clientIp?: string,
  ): Promise<ResetPasswordResponseDto> {
    const { token, newPassword, confirmPassword } = resetPasswordDto;

    // Validar se as senhas coincidem
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('As senhas não coincidem');
    }

    try {
      const resetToken = await this.findValidToken(token);

      if (!resetToken) {
        throw new UnauthorizedException('Token inválido ou expirado');
      }

      // Incrementar tentativas
      resetToken.incrementAttempts();
      await this.passwordResetTokenRepository.save(resetToken);

      // Verificar limite de tentativas
      if (resetToken.attempts > this.MAX_ATTEMPTS) {
        resetToken.markAsUsed('max_attempts_exceeded');
        await this.passwordResetTokenRepository.save(resetToken);
        
        this.logger.warn(`Limite de tentativas excedido para token`, {
          tokenId: resetToken.id,
          usuarioId: resetToken.usuario_id,
          attempts: resetToken.attempts,
          clientIp,
        });
        
        throw new UnauthorizedException('Limite de tentativas excedido');
      }

      // Hash da nova senha
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Atualizar senha do usuário
      await this.dataSource
        .createQueryBuilder()
        .update('usuario')
        .set({
          senha: hashedPassword,
          updated_at: new Date()
        })
        .where("id = :id", { id: resetToken.usuario_id })
        .execute();

      // Marcar token como usado
      resetToken.markAsUsed('password_reset_successful');
      await this.passwordResetTokenRepository.save(resetToken);

      // Invalidar todos os outros tokens do usuário
      await this.invalidateUserTokens(resetToken.usuario_id, 'password_changed');

      this.logger.log(`Senha alterada com sucesso`, {
        usuarioId: resetToken.usuario_id,
        tokenId: resetToken.id,
        clientIp,
      });

      // Retornar resposta de sucesso
      return {
        message: 'Senha alterada com sucesso',
        timestamp: new Date().toISOString(),
        requiresReauth: true,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      
      this.logger.error(`Erro ao resetar senha: ${error.message}`, {
        token: token.substring(0, 10) + '...',
        clientIp,
        error: error.stack,
      });
      
      throw new InternalServerErrorException(
        'Erro interno do servidor. Tente novamente mais tarde.',
      );
    }
  }

  /**
   * Gera um token de recuperação seguro
   * @param usuario Usuário para o token
   * @param clientIp IP do cliente
   * @param userAgent User Agent do cliente
   * @returns Token gerado
   */
  private async generateResetToken(
    usuario: Usuario,
    clientIp?: string,
    userAgent?: string,
  ): Promise<PasswordResetToken> {
    // Gerar token seguro
    const tokenBytes = crypto.randomBytes(32);
    const token = tokenBytes.toString('hex');
    const tokenHash = await bcrypt.hash(token, 10);

    // Calcular data de expiração
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.TOKEN_EXPIRY_MINUTES);

    // Criar registro do token
    const resetToken = this.passwordResetTokenRepository.create({
      token,
      token_hash: tokenHash,
      usuario_id: usuario.id,
      expires_at: expiresAt,
      client_ip: clientIp,
      user_agent: userAgent,
      metadata: {
        generatedAt: new Date().toISOString(),
        expiryMinutes: this.TOKEN_EXPIRY_MINUTES,
      },
    });

    return await this.passwordResetTokenRepository.save(resetToken);
  }

  /**
   * Busca um token válido
   * @param token Token a ser validado
   * @returns Token válido ou null
   */
  private async findValidToken(token: string): Promise<PasswordResetToken | null> {
    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: { token },
      relations: ['usuario'],
    });

    if (!resetToken || !resetToken.isValid()) {
      return null;
    }

    return resetToken;
  }

  /**
   * Verifica rate limiting para solicitações de recuperação
   * @param usuarioId ID do usuário
   * @param clientIp IP do cliente
   */
  private async checkRateLimit(usuarioId: string, clientIp?: string): Promise<void> {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const recentTokens = await this.passwordResetTokenRepository.count({
      where: {
        usuario_id: usuarioId,
        created_at: LessThan(oneHourAgo),
      },
    });

    if (recentTokens >= 3) {
      this.logger.warn(`Rate limit excedido para recuperação de senha`, {
        usuarioId,
        clientIp,
        recentTokens,
      });
      
      throw new BadRequestException(
        'Muitas solicitações de recuperação. Tente novamente em 1 hora.',
      );
    }
  }

  /**
   * Invalida todos os tokens de um usuário
   * @param usuarioId ID do usuário
   * @param reason Motivo da invalidação
   */
  private async invalidateUserTokens(
    usuarioId: string,
    reason: string,
  ): Promise<void> {
    await this.passwordResetTokenRepository.update(
      {
        usuario_id: usuarioId,
        is_used: false,
      },
      {
        is_used: true,
        used_at: new Date(),
        invalidation_reason: reason,
      },
    );
  }

  /**
   * Inicia a limpeza automática de tokens expirados
   */
  private startTokenCleanup(): void {
    // Executar limpeza a cada 24 horas
    setInterval(async () => {
      try {
        await this.cleanupExpiredTokens();
      } catch (error) {
        this.logger.error(`Erro na limpeza automática de tokens: ${error.message}`);
      }
    }, this.CLEANUP_INTERVAL);
    
    // Executar limpeza de tokens usados a cada 24 horas
    setInterval(async () => {
      try {
        await this.cleanupOldUsedTokens();
      } catch (error) {
        this.logger.error(`Erro na limpeza de tokens usados: ${error.message}`);
      }
    }, this.CLEANUP_INTERVAL);
  }
  
  /**
   * Limpa tokens antigos que já foram usados
   * @returns Número de tokens removidos
   */
  async cleanupOldUsedTokens(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await this.passwordResetTokenRepository.delete({
        is_used: true,
        used_at: LessThan(thirtyDaysAgo),
      });

      if (result.affected && result.affected > 0) {
        this.logger.log(`Removidos ${result.affected} tokens de recuperação antigos`);
      }
      
      return result.affected || 0;
    } catch (error) {
      this.logger.error('Erro na limpeza de tokens antigos', error.stack);
      return 0;
    }
  }

  /**
   * Limpa manualmente tokens expirados
   * @returns Número de tokens removidos
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await this.passwordResetTokenRepository.delete({
        expires_at: LessThan(new Date()),
      });
      
      const deletedCount = result.affected || 0;
      this.logger.log(`Limpeza manual: ${deletedCount} tokens expirados removidos`);
      
      return deletedCount;
    } catch (error) {
      this.logger.error(`Erro na limpeza manual de tokens: ${error.message}`);
      throw new InternalServerErrorException('Erro ao limpar tokens expirados');
    }
  }

  /**
   * Obtém estatísticas de tokens de recuperação
   * @returns Estatísticas dos tokens
   */
  async getTokenStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    used: number;
  }> {
    const now = new Date();
    
    const [total, active, expired, used] = await Promise.all([
      this.passwordResetTokenRepository.count(),
      this.passwordResetTokenRepository.count({
        where: {
          is_used: false,
          expires_at: LessThan(now),
        },
      }),
      this.passwordResetTokenRepository.count({
        where: {
          expires_at: LessThan(now),
        },
      }),
      this.passwordResetTokenRepository.count({
        where: {
          is_used: true,
        },
      }),
    ]);

    return { total, active, expired, used };
  }
}