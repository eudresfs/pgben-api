import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { LogAuditoria } from '../../../entities';

/**
 * Serviço para assinatura e validação de registros de auditoria
 *
 * Utiliza JWT para garantir a integridade dos registros de auditoria,
 * implementando o conceito de não-repúdio e evitando adulteração dos logs.
 */
@Injectable()
export class AuditoriaSignatureService {
  private readonly logger = new Logger(AuditoriaSignatureService.name);
  private readonly signingKey: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    // Utiliza uma chave separada apenas para assinar logs de auditoria
    const auditSigningKey = this.configService.get<string>('AUDIT_SIGNING_KEY');
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    
    if (auditSigningKey) {
      this.signingKey = auditSigningKey;
    } else {
      this.logger.warn(
        'AUDIT_SIGNING_KEY não configurada! Usando JWT_SECRET como fallback. ' +
          'Recomenda-se configurar uma chave dedicada para assinatura de logs de auditoria.',
      );
      
      if (!jwtSecret) {
        throw new Error('Nenhuma chave de assinatura configurada. Configure AUDIT_SIGNING_KEY ou JWT_SECRET.');
      }
      
      this.signingKey = jwtSecret;
    }
  }

  /**
   * Calcula o hash dos dados de auditoria
   *
   * @param logAuditoria Dados do log de auditoria
   * @returns Hash SHA-256 dos dados
   */
  private calculateHash(logAuditoria: Partial<LogAuditoria>): string {
    if (!logAuditoria.tipo_operacao || !logAuditoria.entidade_afetada || !logAuditoria.usuario_id) {
      throw new Error('Dados insuficientes para calcular o hash do log de auditoria');
    }

    const dataToHash = JSON.stringify({
      tipo_operacao: logAuditoria.tipo_operacao,
      entidade_afetada: logAuditoria.entidade_afetada,
      entidade_id: logAuditoria.entidade_id || null,
      usuario_id: logAuditoria.usuario_id,
      endpoint: logAuditoria.endpoint || null,
      metodo_http: logAuditoria.metodo_http || null,
      ip_origem: logAuditoria.ip_origem || null,
      data_hora: logAuditoria.data_hora ? logAuditoria.data_hora.toISOString() : null,
    });

    return createHash('sha256').update(dataToHash).digest('hex');
  }

  /**
   * Assina um log de auditoria
   *
   * @param logAuditoria Dados do log de auditoria
   * @returns Assinatura JWT dos dados
   */
  async assinarLog(logAuditoria: Partial<LogAuditoria>): Promise<string> {
    try {
      const hash = this.calculateHash(logAuditoria);

      if (!logAuditoria.id) {
        throw new Error('ID do log de auditoria não fornecido');
      }

      const payload = {
        id: logAuditoria.id,
        hash,
        timestamp: new Date().toISOString(),
      };

      const token = await this.jwtService.signAsync(payload, {
        secret: this.signingKey,
        expiresIn: '100y', // Tokens para auditoria não expiram
      });

      this.logger.debug(
        `Log de auditoria assinado com sucesso: ${logAuditoria.id}`,
      );
      return token;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error(
        `Erro ao assinar log de auditoria: ${errorMessage}`,
        errorStack,
      );
      throw new Error(`Falha ao assinar log de auditoria: ${errorMessage}`);
    }
  }

  /**
   * Valida a assinatura de um log de auditoria
   *
   * @param logAuditoria Dados do log de auditoria
   * @param assinatura Assinatura JWT
   * @returns true se a assinatura for válida
   */
  async validarAssinatura(
    logAuditoria: Partial<LogAuditoria>,
    assinatura: string,
  ): Promise<boolean> {
    try {
      // Verificar se a assinatura é um JWT válido
      const payload = await this.jwtService.verifyAsync<{ id: string; hash: string }>(assinatura, {
        secret: this.signingKey,
      });

      // Verificar se o ID do log corresponde ao ID na assinatura
      if (payload.id !== logAuditoria.id) {
        this.logger.warn(
          `ID do log (${logAuditoria.id}) não corresponde ao ID na assinatura (${payload.id})`,
        );
        return false;
      }

      // Recalcular o hash e comparar
      const currentHash = this.calculateHash(logAuditoria);
      if (payload.hash !== currentHash) {
        this.logger.warn(
          `Hash do log foi modificado. Original: ${payload.hash}, Atual: ${currentHash}`,
        );
        return false;
      }

      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error(
        `Erro ao validar assinatura: ${errorMessage}`,
        errorStack,
      );
      return false;
    }
  }

  /**
   * Verifica a integridade de um conjunto de logs de auditoria
   *
   * @param logs Array de logs de auditoria com suas assinaturas
   * @returns Array com resultados da validação para cada log
   */
  async verificarIntegridadeLogs(
    logs: Array<{ log: LogAuditoria; assinatura: string }>,
  ): Promise<Array<{ id: string; integro: boolean; motivo?: string }>> {
    const resultados: Array<{ id: string; integro: boolean; motivo?: string }> = [];

    for (const item of logs) {
      try {
        if (!item.log.id) {
          throw new Error('ID do log não fornecido');
        }

        const integro = await this.validarAssinatura(item.log, item.assinatura);

        resultados.push({
          id: item.log.id,
          integro,
          motivo: integro
            ? undefined
            : 'Assinatura inválida ou dados modificados',
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        
        resultados.push({
          id: item.log.id || 'id-desconhecido',
          integro: false,
          motivo: `Erro na verificação: ${errorMessage}`,
        });
      }
    }

    return resultados;
  }
}
