// src/auth/services/refresh-token.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Usuario } from '../../modules/usuario/entities/usuario.entity';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async createToken(user: Usuario, ttl: number): Promise<RefreshToken> {
    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + ttl * 1000);

    const refreshToken = this.refreshTokenRepository.create({
      usuario: user,
      token: this.generateToken(),
      expiresAt,
    });

    return this.refreshTokenRepository.save(refreshToken);
  }

  async findToken(token: string): Promise<RefreshToken | null> {
    return this.refreshTokenRepository.findOne({
      where: { token },
      relations: ['usuario'],
    });
  }

  async revokeToken(token: string, ipAddress: string, replacedByToken?: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { token },
      {
        revoked: true,
        revokedAt: new Date(),
        revokedByIp: ipAddress,
        replacedByToken,
      },
    );
  }

  async revokeDescendantTokens(refreshToken: RefreshToken, ipAddress: string): Promise<void> {
    // Se houver um token que substituiu este token, revogue-o também
    if (refreshToken.replacedByToken) {
      const childToken = await this.refreshTokenRepository.findOne({
        where: { token: refreshToken.replacedByToken },
      });

      if (childToken && !childToken.revoked) {
        await this.revokeToken(childToken.token, ipAddress);
      }
    }
  }

  private generateToken(): string {
    // Gera um token aleatório seguro
    return require('crypto').randomBytes(40).toString('hex');
  }
}