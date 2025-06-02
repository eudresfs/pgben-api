import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtBlacklist } from '../../entities/jwt-blacklist.entity';
import {
  AddToBlacklistDto,
  CheckBlacklistDto,
  InvalidateUserTokensDto,
  BlacklistResponseDto,
  CheckBlacklistResponseDto,
  BlacklistQueryDto,
  BlacklistStatsDto,
} from '../dtos/jwt-blacklist.dto';

/**
 * Serviço de Blacklist de Tokens JWT
 * 
 * Gerencia tokens JWT invalidados para prevenir reutilização
 * de tokens comprometidos, revogados ou de usuários deslogados
 */
@Injectable()
export class JwtBlacklistService {
  private readonly logger = new Logger(JwtBlacklistService.name);
  private readonly CLEANUP_INTERVAL = 6 * 60 * 60 * 1000; // 6 horas
  private lastCleanup: Date = new Date();

  constructor(
    @InjectRepository(JwtBlacklist)
    private readonly jwtBlacklistRepository: Repository<JwtBlacklist>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    // Iniciar limpeza automática de tokens expirados
    this.startTokenCleanup();
  }

  /**
   * Adiciona um token à blacklist
   * @param addToBlacklistDto Dados do token a ser invalidado
   * @returns Resposta da operação
   */
  async addToBlacklist(
    addToBlacklistDto: AddToBlacklistDto,
  ): Promise<BlacklistResponseDto> {
    try {
      // Verificar se o token já está na blacklist
      const existingToken = await this.jwtBlacklistRepository.findOne({
        where: { jti: addToBlacklistDto.jti },
      });

      if (existingToken) {
        this.logger.warn(`Token já está na blacklist: ${addToBlacklistDto.jti}`, {
          jti: addToBlacklistDto.jti,
          usuarioId: addToBlacklistDto.usuario_id,
          existingReason: existingToken.reason,
          newReason: addToBlacklistDto.reason,
        });

        return {
          message: 'Token já está na blacklist',
          success: true,
          affected_count: 0,
        };
      }

      // Criar registro na blacklist
      const blacklistEntry = this.jwtBlacklistRepository.create({
        jti: addToBlacklistDto.jti,
        usuario_id: addToBlacklistDto.usuario_id,
        token_type: addToBlacklistDto.token_type,
        expires_at: new Date(addToBlacklistDto.expires_at),
        reason: addToBlacklistDto.reason,
        client_ip: addToBlacklistDto.client_ip,
        user_agent: addToBlacklistDto.user_agent,
        metadata: addToBlacklistDto.metadata,
      });

      await this.jwtBlacklistRepository.save(blacklistEntry);

      this.logger.log(`Token adicionado à blacklist: ${addToBlacklistDto.jti}`, {
        jti: addToBlacklistDto.jti,
        usuarioId: addToBlacklistDto.usuario_id,
        tokenType: addToBlacklistDto.token_type,
        reason: addToBlacklistDto.reason,
        expiresAt: addToBlacklistDto.expires_at,
      });

      return {
        message: 'Token adicionado à blacklist com sucesso',
        success: true,
        affected_count: 1,
      };
    } catch (error) {
      this.logger.error(`Erro ao adicionar token à blacklist: ${error.message}`, {
        jti: addToBlacklistDto.jti,
        error: error.stack,
      });
      
      throw new InternalServerErrorException(
        'Erro interno ao invalidar token',
      );
    }
  }

  /**
   * Verifica se um token está na blacklist
   * @param checkBlacklistDto Dados do token a ser verificado
   * @returns Status do token na blacklist
   */
  async isTokenBlacklisted(
    checkBlacklistDto: CheckBlacklistDto,
  ): Promise<CheckBlacklistResponseDto> {
    try {
      const blacklistEntry = await this.jwtBlacklistRepository.findOne({
        where: { jti: checkBlacklistDto.jti },
      });

      if (!blacklistEntry) {
        return {
          is_blacklisted: false,
        };
      }

      // Verificar se o token ainda está válido na blacklist
      const isStillBlacklisted = blacklistEntry.isStillBlacklisted();

      if (!isStillBlacklisted) {
        // Token expirou, pode ser removido da blacklist
        await this.jwtBlacklistRepository.remove(blacklistEntry);
        
        return {
          is_blacklisted: false,
        };
      }

      return {
        is_blacklisted: true,
        reason: blacklistEntry.reason,
        expires_at: blacklistEntry.expires_at.toISOString(),
        minutes_until_expiration: blacklistEntry.getMinutesUntilExpiration(),
      };
    } catch (error) {
      this.logger.error(`Erro ao verificar blacklist: ${error.message}`, {
        jti: checkBlacklistDto.jti,
        error: error.stack,
      });
      
      // Em caso de erro, assumir que o token não está blacklisted
      // para não bloquear usuários desnecessariamente
      return {
        is_blacklisted: false,
      };
    }
  }

  /**
   * Invalida todos os tokens de um usuário
   * @param invalidateDto Dados da invalidação
   * @param activeTokens Lista de tokens ativos do usuário
   * @returns Resposta da operação
   */
  async invalidateUserTokens(
    invalidateDto: InvalidateUserTokensDto,
    activeTokens: Array<{
      jti: string;
      token_type: 'access' | 'refresh';
      expires_at: Date;
    }>,
  ): Promise<BlacklistResponseDto> {
    try {
      if (!activeTokens || activeTokens.length === 0) {
        return {
          message: 'Nenhum token ativo encontrado para invalidar',
          success: true,
          affected_count: 0,
        };
      }

      // Filtrar tokens por tipo se especificado
      let tokensToInvalidate = activeTokens;
      if (invalidateDto.token_type && invalidateDto.token_type !== 'all') {
        tokensToInvalidate = activeTokens.filter(
          token => token.token_type === invalidateDto.token_type,
        );
      }

      // Criar registros na blacklist
      const blacklistEntries = tokensToInvalidate.map(token => 
        this.jwtBlacklistRepository.create({
          jti: token.jti,
          usuario_id: invalidateDto.usuario_id,
          token_type: token.token_type,
          expires_at: token.expires_at,
          reason: invalidateDto.reason,
          client_ip: invalidateDto.client_ip,
          user_agent: invalidateDto.user_agent,
          metadata: {
            bulk_invalidation: true,
            invalidated_at: new Date().toISOString(),
          },
        }),
      );

      await this.jwtBlacklistRepository.save(blacklistEntries);

      this.logger.log(`Tokens de usuário invalidados em massa`, {
        usuarioId: invalidateDto.usuario_id,
        tokenType: invalidateDto.token_type || 'all',
        reason: invalidateDto.reason,
        affectedCount: blacklistEntries.length,
        tokenJtis: tokensToInvalidate.map(t => t.jti),
      });

      return {
        message: `${blacklistEntries.length} token(s) invalidado(s) com sucesso`,
        success: true,
        affected_count: blacklistEntries.length,
      };
    } catch (error) {
      this.logger.error(`Erro ao invalidar tokens do usuário: ${error.message}`, {
        usuarioId: invalidateDto.usuario_id,
        error: error.stack,
      });
      
      throw new InternalServerErrorException(
        'Erro interno ao invalidar tokens do usuário',
      );
    }
  }

  /**
   * Remove um token específico da blacklist
   * @param jti JWT ID do token
   * @returns Resposta da operação
   */
  async removeFromBlacklist(jti: string): Promise<BlacklistResponseDto> {
    try {
      const result = await this.jwtBlacklistRepository.delete({ jti });

      if (result.affected === 0) {
        throw new NotFoundException('Token não encontrado na blacklist');
      }

      this.logger.log(`Token removido da blacklist: ${jti}`);

      return {
        message: 'Token removido da blacklist com sucesso',
        success: true,
        affected_count: result.affected || 0,
      };
    } catch (error) {
      this.logger.error(`Erro ao remover token da blacklist: ${error.message}`, {
        jti,
        error: error.stack,
      });
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new InternalServerErrorException(
        'Erro interno ao remover token da blacklist',
      );
    }
  }

  /**
   * Lista tokens na blacklist com filtros
   * @param queryDto Filtros de consulta
   * @returns Lista paginada de tokens
   */
  async listBlacklistedTokens(
    queryDto: BlacklistQueryDto,
  ): Promise<{
    data: JwtBlacklist[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const page = queryDto.page || 1;
      const limit = Math.min(queryDto.limit || 10, 100);
      const skip = (page - 1) * limit;

      const queryBuilder = this.jwtBlacklistRepository.createQueryBuilder('blacklist');

      // Aplicar filtros
      if (queryDto.usuario_id) {
        queryBuilder.andWhere('blacklist.usuario_id = :usuario_id', {
          usuario_id: queryDto.usuario_id,
        });
      }

      if (queryDto.token_type) {
        queryBuilder.andWhere('blacklist.token_type = :token_type', {
          token_type: queryDto.token_type,
        });
      }

      if (queryDto.reason) {
        queryBuilder.andWhere('blacklist.reason = :reason', {
          reason: queryDto.reason,
        });
      }

      if (queryDto.only_active) {
        queryBuilder.andWhere('blacklist.expires_at > :now', {
          now: new Date(),
        });
      }

      // Ordenar por data de criação (mais recentes primeiro)
      queryBuilder.orderBy('blacklist.created_at', 'DESC');

      // Aplicar paginação
      queryBuilder.skip(skip).take(limit);

      const [data, total] = await queryBuilder.getManyAndCount();
      const totalPages = Math.ceil(total / limit);

      return {
        data,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`Erro ao listar tokens blacklisted: ${error.message}`, {
        queryDto,
        error: error.stack,
      });
      
      throw new InternalServerErrorException(
        'Erro interno ao consultar blacklist',
      );
    }
  }

  /**
   * Obtém estatísticas da blacklist
   * @returns Estatísticas detalhadas
   */
  async getBlacklistStats(): Promise<BlacklistStatsDto> {
    try {
      const now = new Date();

      const [total, expired, active, accessTokens, refreshTokens, reasonStats] = await Promise.all([
        this.jwtBlacklistRepository.count(),
        this.jwtBlacklistRepository.count({
          where: { expires_at: LessThan(now) },
        }),
        this.jwtBlacklistRepository.count({
          where: { expires_at: MoreThan(now) },
        }),
        this.jwtBlacklistRepository.count({
          where: { token_type: 'access' },
        }),
        this.jwtBlacklistRepository.count({
          where: { token_type: 'refresh' },
        }),
        this.getReasonStats(),
      ]);

      return {
        total,
        active,
        expired,
        access_tokens: accessTokens,
        refresh_tokens: refreshTokens,
        by_reason: reasonStats,
        last_cleanup: this.lastCleanup.toISOString(),
      };
    } catch (error) {
      this.logger.error(`Erro ao obter estatísticas da blacklist: ${error.message}`, {
        error: error.stack,
      });
      
      throw new InternalServerErrorException(
        'Erro interno ao obter estatísticas',
      );
    }
  }

  /**
   * Limpa tokens expirados da blacklist
   * @returns Número de tokens removidos
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await this.jwtBlacklistRepository.delete({
        expires_at: LessThan(new Date()),
      });

      const deletedCount = result.affected || 0;
      this.lastCleanup = new Date();

      this.logger.log(`Limpeza da blacklist: ${deletedCount} tokens expirados removidos`);

      return deletedCount;
    } catch (error) {
      this.logger.error(`Erro na limpeza da blacklist: ${error.message}`, {
        error: error.stack,
      });
      
      throw new InternalServerErrorException(
        'Erro interno na limpeza da blacklist',
      );
    }
  }

  /**
   * Obtém estatísticas por motivo de invalidação
   * @returns Contagem por motivo
   */
  private async getReasonStats(): Promise<Record<string, number>> {
    try {
      const results = await this.jwtBlacklistRepository
        .createQueryBuilder('blacklist')
        .select('blacklist.reason', 'reason')
        .addSelect('COUNT(*)', 'count')
        .groupBy('blacklist.reason')
        .getRawMany();

      const stats: Record<string, number> = {};
      results.forEach(result => {
        stats[result.reason] = parseInt(result.count, 10);
      });

      return stats;
    } catch (error) {
      this.logger.error(`Erro ao obter estatísticas por motivo: ${error.message}`);
      return {};
    }
  }

  /**
   * Inicia limpeza automática de tokens expirados
   */
  private startTokenCleanup(): void {
    setInterval(async () => {
      try {
        const deletedCount = await this.cleanupExpiredTokens();
        if (deletedCount > 0) {
          this.logger.log(`Limpeza automática da blacklist: ${deletedCount} tokens removidos`);
        }
      } catch (error) {
        this.logger.error(`Erro na limpeza automática da blacklist: ${error.message}`);
      }
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Extrai JTI de um token JWT
   * @param token Token JWT
   * @returns JTI ou null se inválido
   */
  extractJtiFromToken(token: string): string | null {
    try {
      const decoded = this.jwtService.decode(token) as any;
      return decoded?.jti || null;
    } catch (error) {
      this.logger.warn(`Erro ao extrair JTI do token: ${error.message}`);
      return null;
    }
  }

  /**
   * Valida se um token JWT não está na blacklist
   * Método utilitário para uso em guards
   * @param token Token JWT completo
   * @returns true se o token é válido (não blacklisted)
   */
  async validateTokenNotBlacklisted(token: string): Promise<boolean> {
    const jti = this.extractJtiFromToken(token);
    if (!jti) {
      return false;
    }

    const result = await this.isTokenBlacklisted({ jti });
    return !result.is_blacklisted;
  }
}