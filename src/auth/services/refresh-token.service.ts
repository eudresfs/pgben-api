/* eslint-disable prettier/prettier */
// src/auth/services/refresh-token.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Usuario } from '../../modules/usuario/entities/usuario.entity';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  /**
   * Cria um novo token de refresh para o usuário
   * @param user Usuário para quem o token será criado
   * @param ttl Tempo de vida do token em segundos
   * @returns O token de refresh criado
   */
  async createToken(user: Usuario, ttl: number): Promise<RefreshToken> {
    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + ttl * 1000);

    const refreshToken = this.refreshTokenRepository.create({
      usuario: user,
      usuario_id: user.id, 
      token: this.generateToken(),
      expires_at: expiresAt,
    });

    return this.refreshTokenRepository.save(refreshToken);
  }

  /**
   * Encontra um token pelo seu valor
   * @param token Valor do token a ser encontrado
   * @returns O token encontrado ou null
   */
  async findToken(token: string): Promise<RefreshToken | null> {
    return this.refreshTokenRepository.findOne({
      where: { token },
      relations: ['usuario'],
    });
  }

  /**
   * Busca todos os tokens ativos de um usuário
   * @param usuarioId ID do usuário
   * @returns Lista de tokens ativos
   */
  async findActiveTokensByUserId(usuarioId: string): Promise<RefreshToken[]> {
    return this.refreshTokenRepository.find({
      where: {
        usuario_id: usuarioId,
        revoked: false,
        expires_at: MoreThan(new Date()) // Apenas tokens não expirados
      }
    });
  }

  /**
   * Revoga um token específico
   * @param token Valor do token a ser revogado
   * @param ipAddress Endereço IP que solicitou a revogação
   * @param replacedByToken Token que substituiu este (opcional)
   */
  async revokeToken(token: string, ipAddress: string, replacedByToken?: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { token },
      {
        revoked: true,
        revoked_at: new Date(),
        revokedByIp: ipAddress,
        replacedByToken: replacedByToken,
      },
    );
  }

  /**
   * Revoga todos os tokens descendentes deste token
   * @param refreshToken Token pai
   * @param ipAddress Endereço IP que solicitou a revogação
   */
  async revokeDescendantTokens(refreshToken: RefreshToken, ipAddress: string): Promise<void> {
    // Se houver um token que substituiu este token, revogue-o também
    if (refreshToken.replacedByToken) {
      const childToken = await this.refreshTokenRepository.findOne({
        where: { token: refreshToken.replacedByToken },
      });

      if (childToken && !childToken.revoked) {
        await this.revokeToken(childToken.token, ipAddress);
        
        // Recursivamente revogar descendentes
        await this.revokeDescendantTokens(childToken, ipAddress);
      }
    }
  }

  /**
   * Revoga todos os tokens ativos de um usuário
   * @param usuarioId ID do usuário
   * @param ipAddress Endereço IP que solicitou a revogação
   * @returns Número de tokens revogados
   */
  async revokeAllUserTokens(usuarioId: string, ipAddress: string): Promise<number> {
    const tokens = await this.findActiveTokensByUserId(usuarioId);
    
    for (const token of tokens) {
      await this.revokeToken(token.token, ipAddress);
    }
    
    return tokens.length;
  }

  /**
   * Gera um valor de token aleatório e seguro
   * @returns String hexadecimal aleatória
   */
  private generateToken(): string {
    return require('crypto').randomBytes(40).toString('hex');
  }
}