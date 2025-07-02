import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Documento } from '../../../entities/documento.entity';
import { CacheService } from '../../../shared/cache/cache.service';
import { LoggingService } from '../../../shared/logging/logging.service';

/**
 * Interface para dados de URL privada armazenados no cache
 */
interface PrivateUrlData {
  documentoId: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Serviço responsável por gerar URLs públicas e privadas para documentos
 * Implementa sistema simplificado conforme ADR Fase 3
 */
@Injectable()
export class DocumentoUrlService {
  private readonly baseUrl: string;
  private readonly defaultTtlHours: number = 24;
  private readonly cachePrefix = 'doc_private';

  constructor(
    @InjectRepository(Documento)
    private readonly documentoRepository: Repository<Documento>,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly logger: LoggingService,
  ) {
    this.baseUrl = this.configService.get<string>('BASE_URL', 'http://localhost:3000');
  }

  /**
   * Gera URL pública para acesso direto ao documento
   * Utilizada para documentos não sensíveis
   * 
   * @param documentoId ID do documento
   * @returns URL pública para acesso direto
   */
  async generatePublicUrl(documentoId: string): Promise<string> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Gerando URL pública para documento', DocumentoUrlService.name, {
        documentoId,
      });

      // Verificar se o documento existe
      const documento = await this.documentoRepository.findOne({
        where: { id: documentoId },
        select: ['id', 'nome_arquivo', 'caminho']
      });

      if (!documento) {
        throw new NotFoundException('Documento não encontrado');
      }

      // Gerar URL pública direta
      const publicUrl = `${this.baseUrl}/api/v1/documento/${documentoId}/public`;

      this.logger.info('URL pública gerada com sucesso', DocumentoUrlService.name, {
        documentoId,
        url: publicUrl,
        duration: Date.now() - startTime,
      });

      return publicUrl;
    } catch (error) {
      this.logger.error(
        'Erro ao gerar URL pública',
        error,
        DocumentoUrlService.name,
        {
          documentoId,
          duration: Date.now() - startTime,
        }
      );
      throw error;
    }
  }

  /**
   * Gera URL privada com hash único e TTL
   * Utilizada para documentos sensíveis com controle de acesso
   * 
   * @param documentoId ID do documento
   * @param ttlHours Tempo de vida em horas (padrão: 24h)
   * @returns URL privada com hash único
   */
  async generatePrivateUrl(documentoId: string, ttlHours: number = this.defaultTtlHours): Promise<string> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Gerando URL privada para documento', DocumentoUrlService.name, {
        documentoId,
        ttlHours,
      });

      // Verificar se o documento existe
      const documento = await this.documentoRepository.findOne({
        where: { id: documentoId },
        select: ['id', 'nome_arquivo']
      });

      if (!documento) {
        throw new NotFoundException('Documento não encontrado');
      }

      // Gerar hash único para URL privada
      const timestamp = Date.now();
      const randomBytes = crypto.randomBytes(16).toString('hex');
      const hash = crypto
        .createHash('sha256')
        .update(`${documentoId}:${timestamp}:${randomBytes}`)
        .digest('hex');

      // Calcular data de expiração
      const expiresAt = new Date(Date.now() + (ttlHours * 60 * 60 * 1000));
      const createdAt = new Date();

      // Dados para armazenar no cache
      const urlData: PrivateUrlData = {
        documentoId,
        createdAt,
        expiresAt,
      };

      // Armazenar no cache Redis com TTL
      const cacheKey = `${this.cachePrefix}:${hash}`;
      const ttlSeconds = ttlHours * 60 * 60;
      
      await this.cacheService.set(cacheKey, JSON.stringify(urlData), ttlSeconds);

      // Gerar URL privada
      const privateUrl = `${this.baseUrl}/api/documento/private/${hash}`;

      this.logger.info('URL privada gerada com sucesso', DocumentoUrlService.name, {
        documentoId,
        hash: hash.substring(0, 8) + '...', // Log apenas parte do hash por segurança
        ttlHours,
        expiresAt,
        duration: Date.now() - startTime,
      });

      return privateUrl;
    } catch (error) {
      this.logger.error(
        'Erro ao gerar URL privada',
        error,
        DocumentoUrlService.name,
        {
          documentoId,
          ttlHours,
          duration: Date.now() - startTime,
        }
      );
      throw error;
    }
  }

  /**
   * Valida acesso via URL privada usando hash
   * Verifica se o hash existe no cache e não expirou
   * 
   * @param hash Hash da URL privada
   * @returns Dados do documento se válido
   * @throws UnauthorizedException se hash inválido ou expirado
   */
  async validatePrivateAccess(hash: string): Promise<{ documentoId: string }> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Validando acesso via URL privada', DocumentoUrlService.name, {
        hash: hash.substring(0, 8) + '...', // Log apenas parte do hash por segurança
      });

      // Buscar dados no cache
      const cacheKey = `${this.cachePrefix}:${hash}`;
      const cachedData = await this.cacheService.get(cacheKey);

      if (!cachedData) {
        this.logger.warn('URL privada não encontrada ou expirada', DocumentoUrlService.name, {
          hash: hash.substring(0, 8) + '...',
          duration: Date.now() - startTime,
        });
        throw new UnauthorizedException('URL privada inválida ou expirada');
      }

      // Parse dos dados do cache
      let urlData: PrivateUrlData;
      try {
        urlData = JSON.parse(cachedData as string);
      } catch (parseError) {
        this.logger.error(
          'Erro ao fazer parse dos dados da URL privada',
          parseError,
          DocumentoUrlService.name,
          {
            hash: hash.substring(0, 8) + '...',
          }
        );
        throw new UnauthorizedException('Dados da URL privada corrompidos');
      }

      // Verificar se ainda não expirou (dupla verificação)
      const now = new Date();
      const expiresAt = new Date(urlData.expiresAt);
      
      if (now > expiresAt) {
        this.logger.warn('URL privada expirada', DocumentoUrlService.name, {
          hash: hash.substring(0, 8) + '...',
          expiresAt,
          now,
        });
        
        // Remover do cache
        await this.cacheService.del(cacheKey);
        
        throw new UnauthorizedException('URL privada expirada');
      }

      this.logger.info('Acesso via URL privada validado com sucesso', DocumentoUrlService.name, {
        documentoId: urlData.documentoId,
        hash: hash.substring(0, 8) + '...',
        createdAt: urlData.createdAt,
        expiresAt: urlData.expiresAt,
        duration: Date.now() - startTime,
      });

      return { documentoId: urlData.documentoId };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      this.logger.error(
        'Erro ao validar acesso via URL privada',
        error,
        DocumentoUrlService.name,
        {
          hash: hash.substring(0, 8) + '...',
          duration: Date.now() - startTime,
        }
      );
      
      throw new UnauthorizedException('Erro interno ao validar URL privada');
    }
  }

  /**
   * Revoga uma URL privada removendo-a do cache
   * 
   * @param hash Hash da URL privada a ser revogada
   * @returns true se revogada com sucesso
   */
  async revokePrivateUrl(hash: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Revogando URL privada', DocumentoUrlService.name, {
        hash: hash.substring(0, 8) + '...',
      });

      const cacheKey = `${this.cachePrefix}:${hash}`;
      await this.cacheService.del(cacheKey);

      this.logger.info('URL privada revogada', DocumentoUrlService.name, {
        hash: hash.substring(0, 8) + '...',
        duration: Date.now() - startTime,
      });

      return true;
    } catch (error) {
      this.logger.error(
        'Erro ao revogar URL privada',
        error,
        DocumentoUrlService.name,
        {
          hash: hash.substring(0, 8) + '...',
          duration: Date.now() - startTime,
        }
      );
      
      return false;
    }
  }

  /**
   * Lista URLs privadas ativas para um documento
   * Útil para auditoria e gerenciamento
   * 
   * @param documentoId ID do documento
   * @returns Lista de hashes ativos (apenas primeiros 8 caracteres por segurança)
   */
  async listActivePrivateUrls(documentoId: string): Promise<string[]> {
    try {
      this.logger.debug('Listando URLs privadas ativas', DocumentoUrlService.name, {
        documentoId,
      });

      // Como o CacheService não tem método keys, vamos usar uma abordagem alternativa
       // Por enquanto, retornamos array vazio e logamos que a funcionalidade não está disponível
       this.logger.warn('Método listActivePrivateUrls não implementado - CacheService não possui método keys', DocumentoUrlService.name, {
         documentoId,
       });
       
       return [];
    } catch (error) {
      this.logger.error(
        'Erro ao listar URLs privadas ativas',
        error,
        DocumentoUrlService.name,
        {
          documentoId,
        }
      );
      
      return [];
    }
  }
}