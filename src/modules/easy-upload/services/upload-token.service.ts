import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between } from 'typeorm';
import { DocumentoService } from '../../documento/services/documento.service';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { QrCodeService } from './qr-code.service';
import { UploadToken } from '../entities/upload-token.entity';
import { UploadTokenStatus } from '../entities/upload-token.entity';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { CreateLogAuditoriaDto } from '../../auditoria/dto/create-log-auditoria.dto';
import { BaseDto } from '../../../shared/dtos/base.dto';
import { TipoDocumentoEnum } from '@/enums';

/**
 * Serviço responsável pelo gerenciamento de tokens de upload
 */
@Injectable()
export class UploadTokenService {
  private readonly logger = new Logger(UploadTokenService.name);
  private readonly tokenExpirationMinutes: number;

  constructor(
    @InjectRepository(UploadToken)
    private readonly uploadTokenRepository: Repository<UploadToken>,
    private readonly qrCodeService: QrCodeService,
    private readonly configService: ConfigService,
    private readonly auditoriaService: AuditoriaService,
    private readonly documentoService?: DocumentoService,
  ) {
    this.tokenExpirationMinutes = this.configService.get<number>('EASY_UPLOAD_TOKEN_EXPIRATION_MINUTES', 60);
    this.logger.log('UploadTokenService inicializado');
  }

  /**
   * Cria um novo token de upload
   * @param data Dados para criação do token
   * @param userId ID do usuário que está criando o token
   * @returns O token criado com QR Code
   */
  async createUploadToken(data: Partial<UploadToken>, userId: string): Promise<UploadToken> {
    try {
      // Gerar token único
      const token = this.generateToken();
      
      // Calcular data de expiração
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.tokenExpirationMinutes);

      // Criar nova instância do token
      const uploadToken = this.uploadTokenRepository.create({
        ...data,
        token,
        usuario_id: userId,
        expires_at: expiresAt,
        status: UploadTokenStatus.ATIVO
        // qr_code será gerenciado separadamente, não é parte da entidade
      });

      // Salvar no banco de dados
      const savedToken = await this.uploadTokenRepository.save(uploadToken);
      this.logger.debug(`Token criado com sucesso: ${savedToken.id}`);

      // Registrar na auditoria
      const logDto = BaseDto.plainToInstance({
        entidade_afetada: 'UploadToken',
        entidade_id: savedToken.id,
        usuario_id: userId,
        tipo_operacao: TipoOperacao.CREATE,
        dados_novos: { token: savedToken.token.substring(0, 8) + '...' }
      }, CreateLogAuditoriaDto);
      await this.auditoriaService.create(logDto);

      // Gerar QR Code
      const qrCodeBase64 = await this.qrCodeService.generateQrCodeBase64(token);
      
      // Armazenar o QR Code como metadado
      const metadata = savedToken.metadata || {};
      metadata.qrCode = qrCodeBase64;
      await this.uploadTokenRepository.update(savedToken.id, { metadata });
      savedToken.metadata = metadata;

      return savedToken;
    } catch (error) {
      this.logger.error(`Erro ao criar token de upload: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao criar token de upload');
    }
  }

  /**
   * Busca um token pelo código token
   * @param token Código do token
   * @returns O token encontrado ou undefined
   */
  async findByToken(token: string): Promise<UploadToken | null> {
    try {
      return await this.uploadTokenRepository.findOne({
        where: { token },
        relations: ['usuario'],
      });
    } catch (error) {
      this.logger.error(`Erro ao buscar token: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Gera um token único aleatório
   * @returns String de token único
   */
  private generateToken(): string {
    // Usando UUID v4 (aleatório) sem hifens para maior compatibilidade
    return randomUUID().replace(/-/g, '');
  }

  /**
   * Valida um token e verifica se está ativo
   * @param token Código do token
   * @returns O token validado
   * @throws NotFoundException se o token não for encontrado
   * @throws BadRequestException se o token estiver expirado ou inativo
   */
  async validateToken(token: string): Promise<UploadToken> {
    const uploadToken = await this.findByToken(token);
    
    if (!uploadToken) {
      this.logger.warn(`Token não encontrado: ${token}`);
      throw new NotFoundException('Token de upload não encontrado');
    }

    // Verificar se o token está expirado
    if (uploadToken.isExpired()) {
      this.logger.warn(`Token expirado: ${uploadToken.id}`);
      throw new BadRequestException('Token de upload expirado');
    }

    // Verificar se o token está cancelado
    if (uploadToken.isCancelled()) {
      this.logger.warn(`Token cancelado: ${uploadToken.id}`);
      throw new BadRequestException('Token de upload cancelado');
    }

    // Verificar se o token já foi utilizado completamente
    if (uploadToken.isUsed()) {
      this.logger.warn(`Token já utilizado: ${uploadToken.id}`);
      throw new BadRequestException('Token de upload já foi utilizado');
    }

    return uploadToken;
  }

  /**
   * Lista tokens de upload com filtros
   * @param filters Filtros para a listagem
   * @param userId ID do usuário que está fazendo a consulta
   * @returns Lista paginada de tokens
   */
  async listTokens(filters: any, userId: string): Promise<{ items: UploadToken[]; total: number }> {
    try {
      const where: FindOptionsWhere<UploadToken> = {
        usuario_id: userId,
      };

      // Aplicar filtros
      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.solicitacao_id) {
        where.solicitacao_id = filters.solicitacao_id;
      }

      if (filters.cidadao_id) {
        where.cidadao_id = filters.cidadao_id;
      }

      // Filtro por data de criação
      if (filters.created_from && filters.created_to) {
        where.created_at = Between(
          new Date(filters.created_from),
          new Date(filters.created_to),
        );
      }

      // Configurar paginação
      const take = filters.limit || 10;
      const skip = filters.offset || 0;

      // Executar consulta
      const [items, total] = await this.uploadTokenRepository.findAndCount({
        where,
        order: { created_at: 'DESC' },
        take,
        skip,
        relations: ['usuario'],
      });

      return {
        items,
        total,
      };
    } catch (error) {
      this.logger.error(`Erro ao listar tokens: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao listar tokens de upload');
    }
  }

  /**
   * Obtém detalhes de um token de upload
   * @param id ID do token
   * @param usuarioId ID do usuário que está consultando o token
   * @returns Detalhes do token com contagem de uploads
   */
  async getTokenDetails(id: string, usuarioId: string): Promise<any> {
    try {
      const token = await this.uploadTokenRepository.findOne({
        where: { id },
        relations: ['usuario'],
      });

      if (!token) {
        throw new NotFoundException('Token não encontrado');
      }

      // Verificar se o usuário tem permissão para ver este token
      if (token.usuario_id !== usuarioId) {
        throw new UnauthorizedException('Você não tem permissão para acessar este token');
      }

      // Obter contagem de uploads
      const uploadCount = await this.getUploadCount(token.token);
      
      return {
        ...token,
        uploadCount,
        remainingUploads: Math.max(0, token.max_files - uploadCount)
      };
    } catch (error) {
      this.logger.error(`Erro ao obter detalhes do token: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Cancela um token de upload
   * @param id ID do token
   * @param usuarioId ID do usuário que está cancelando o token
   * @param motivo Motivo do cancelamento (opcional)
   * @returns Token cancelado
   */
  async cancelToken(
    id: string,
    usuarioId: string,
    motivo?: string,
  ): Promise<UploadToken> {
    try {
      const token = await this.uploadTokenRepository.findOne({
        where: { id },
      });

      if (!token) {
        throw new NotFoundException('Token não encontrado');
      }

      // Verificar se o usuário tem acesso a este token
      if (token.usuario_id !== usuarioId) {
        this.logger.warn(`Tentativa de cancelamento não autorizado do token ${id} pelo usuário ${usuarioId}`);
        throw new UnauthorizedException('Você não tem permissão para cancelar este token');
      }

      // Cancelar o token
      token.status = UploadTokenStatus.CANCELADO;
      token.metadata = {
        ...token.metadata,
        cancelamento: {
          data: new Date(),
          motivo: motivo || 'Não especificado',
          usuario_id: usuarioId,
        },
      };

      await this.uploadTokenRepository.save(token);

      // Registrar na auditoria
      const logDto = BaseDto.plainToInstance({
        entidade_afetada: 'UploadToken',
        entidade_id: id,
        usuario_id: usuarioId,
        tipo_operacao: TipoOperacao.DELETE,
        dados_novos: { motivo }
      }, CreateLogAuditoriaDto);
      await this.auditoriaService.create(logDto);

      this.logger.debug(`Token ${id} cancelado por ${usuarioId}`);
      
      return token;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Erro ao cancelar token: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao cancelar token de upload');
    }
  }

  /**
   * Marca um token como utilizado
   * @param id ID do token
   */
  async markTokenAsUsed(id: string): Promise<void> {
    try {
      await this.uploadTokenRepository.update(
        { id },
        { status: UploadTokenStatus.USADO }
      );
      this.logger.debug(`Token ${id} marcado como utilizado`);
    } catch (error) {
      this.logger.error(`Erro ao marcar token como utilizado: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao atualizar status do token');
    }
  }

  /**
   * Marca um token como expirado
   * @param id ID do token
   */
  async expireToken(id: string): Promise<void> {
    try {
      await this.uploadTokenRepository.update(
        { id },
        { status: UploadTokenStatus.EXPIRADO }
      );
      this.logger.debug(`Token ${id} marcado como expirado`);
    } catch (error) {
      this.logger.error(`Erro ao marcar token como expirado: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao expirar token');
    }
  }

  /**
   * Busca tokens que estão expirados mas ainda não foram marcados como tal
   * @returns Lista de tokens expirados
   */
  async findExpiredTokens(): Promise<UploadToken[]> {
    try {
      const now = new Date();
      return await this.uploadTokenRepository.find({
        where: {
          status: UploadTokenStatus.ATIVO,
          expires_at: Between(new Date(0), now),
        },
      });
    } catch (error) {
      this.logger.error(`Erro ao buscar tokens expirados: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Tarefa agendada para marcar tokens expirados
   */
  async processExpiredTokens(): Promise<void> {
    try {
      const expiredTokens = await this.findExpiredTokens();
      
      for (const token of expiredTokens) {
        await this.expireToken(token.id);
        this.logger.debug(`Token expirado processado: ${token.id}`);
      }
      
      if (expiredTokens.length > 0) {
        this.logger.log(`${expiredTokens.length} tokens expirados foram processados`);
      }
    } catch (error) {
      this.logger.error(`Erro ao processar tokens expirados: ${error.message}`, error.stack);
    }
  }

  /**
   * Atualiza informações de um token
   * @param id ID do token
   * @param data Dados a serem atualizados
   */
  async updateToken(id: string, data: Partial<UploadToken>): Promise<void> {
    try {
      await this.uploadTokenRepository.update({ id }, data);
      this.logger.debug(`Token ${id} atualizado com sucesso`);
    } catch (error) {
      this.logger.error(`Erro ao atualizar token: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao atualizar token');
    }
  }

  /**
   * Regenera o QR Code de um token
   * @param id ID do token
   * @returns O QR Code atualizado
   */
  async regenerateQrCode(id: string): Promise<string> {
    try {
      const token = await this.uploadTokenRepository.findOne({
        where: { id },
      });

      if (!token) {
        throw new NotFoundException('Token não encontrado');
      }

      const qrCodeBase64 = await this.qrCodeService.generateQrCodeBase64(token.token);
      
      // Armazenar o QR Code como metadado
      const metadata = token.metadata || {};
      metadata.qrCode = qrCodeBase64;
      await this.uploadTokenRepository.update(id, { metadata });
      
      return qrCodeBase64;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao regenerar QR Code: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao regenerar QR Code');
    }
  }

  /**
   * Obtém a contagem de uploads realizados com um token específico
   * @param token Código do token
   * @returns Número de uploads realizados
   */
  async getUploadCount(token: string): Promise<number> {
    try {
      // Implementação simplificada - na versão real, consultaria a tabela de documentos
      // ou a tabela de sessões para contar os uploads associados ao token
      const uploadToken = await this.uploadTokenRepository.findOne({
        where: { token },
      });

      if (!uploadToken) {
        return 0;
      }

      // Usando o campo metadata para armazenar a contagem de uploads
      // Em um sistema real, isso seria uma consulta à tabela de documentos
      const metadata = uploadToken.metadata || {};
      return metadata.upload_count || 0;
    } catch (error) {
      this.logger.error(`Erro ao obter contagem de uploads: ${error.message}`, error.stack);
      return 0;
    }
  }

  /**
   * Processa o upload de um arquivo usando um token
   * @param tokenData Dados do token
   * @param file Arquivo enviado
   * @param documentInfo Informações do documento
   * @returns Documento criado
   */
  async processFileUpload(
    tokenData: UploadToken,
    file: any, // Alterado de Express.Multer.File para any
    documentInfo: { tipo: string; descricao: string; metadata: Record<string, any> },
  ): Promise<any> {
    try {
      // Verificar se o token está válido
      if (tokenData.isExpired?.() || tokenData.isCancelled?.()) {
        throw new BadRequestException('Token inválido ou expirado');
      }

      if (!this.documentoService) {
        throw new InternalServerErrorException('Serviço de documentos não disponível');
      }

      // Verificar se cidadao_id existe, pois é obrigatório no UploadDocumentoDto
      if (!tokenData.cidadao_id) {
        throw new BadRequestException('ID do cidadão é obrigatório para upload de documentos');
      }

      // Criar documento usando o serviço de documentos
      const documento = await this.documentoService.upload(
        file,
        {
          cidadao_id: tokenData.cidadao_id,
          ...(tokenData.solicitacao_id ? { solicitacao_id: tokenData.solicitacao_id } : {}),
          tipo: documentInfo.tipo as TipoDocumentoEnum,
          descricao: documentInfo.descricao,
          arquivo: file.buffer,
          // Propriedade reutilizavel removida pois não existe na entidade UploadToken
        },
        tokenData.usuario_id // ID do usuário que criou o token
      );

      // Verificar se o documento foi criado com sucesso
      if (!documento) {
        throw new InternalServerErrorException('Falha ao criar documento');
      }

      // Atualizar contagem de uploads no token
      const metadata = tokenData.metadata || {};
      metadata.upload_count = (metadata.upload_count || 0) + 1;
      metadata.last_upload_at = new Date().toISOString();
      
      await this.uploadTokenRepository.update(tokenData.id, { metadata });

      // Registrar na auditoria
      const logDto = BaseDto.plainToInstance({
        entidade_afetada: 'Documento',
        entidade_id: documento.id, // Seguro acessar documento.id pois já verificamos que documento não é nulo
        usuario_id: tokenData.usuario_id,
        tipo_operacao: TipoOperacao.CREATE,
        dados_novos: { 
          tipo: documentInfo.tipo,
          nome_arquivo: file.originalname,
          tamanho: file.size,
        }
      }, CreateLogAuditoriaDto);
      await this.auditoriaService.create(logDto);

      return documento;
    } catch (error) {
      this.logger.error(`Erro ao processar upload de arquivo: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Falha ao processar upload de arquivo');
    }
  }
}
