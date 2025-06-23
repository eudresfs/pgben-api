import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadToken, UploadTokenStatus } from '../entities/upload-token.entity';
import { DocumentoService } from '../../documento/services/documento.service';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { BaseDto } from '../../../shared/dtos/base.dto';
import { CreateLogAuditoriaDto } from '../../auditoria/dto/create-log-auditoria.dto';

/**
 * Extensão do serviço de token de upload com métodos adicionais
 * para suportar o controller simplificado EasyUpload
 */
@Injectable()
export class UploadTokenExtensionsService {
  private readonly logger = new Logger(UploadTokenExtensionsService.name);

  constructor(
    @InjectRepository(UploadToken)
    private readonly uploadTokenRepository: Repository<UploadToken>,
    private readonly documentoService: DocumentoService,
    private readonly auditoriaService: AuditoriaService,
  ) {
    this.logger.log('UploadTokenExtensionsService inicializado');
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
    file: Express.Multer.File,
    documentInfo: { tipo: string; descricao: string; metadata: Record<string, any> },
  ): Promise<any> {
    try {
      // Verificar se o token está válido
      if (tokenData.isExpired?.() || tokenData.isCancelled?.()) {
        throw new BadRequestException('Token inválido ou expirado');
      }

      // Criar documento usando o serviço de documentos
      const documento = await this.documentoService.createDocumento({
        cidadao_id: tokenData.cidadao_id,
        solicitacao_id: tokenData.solicitacao_id,
        tipo_documento: documentInfo.tipo,
        descricao: documentInfo.descricao,
        arquivo: file.buffer,
        nome_arquivo: file.originalname,
        mime_type: file.mimetype,
        tamanho: file.size,
        metadata: {
          ...documentInfo.metadata,
          upload_token_id: tokenData.id,
          upload_method: 'easy_upload',
        },
      });

      // Atualizar contagem de uploads no token
      const metadata = tokenData.metadata || {};
      metadata.upload_count = (metadata.upload_count || 0) + 1;
      metadata.last_upload_at = new Date().toISOString();
      
      await this.uploadTokenRepository.update(tokenData.id, { metadata });

      // Registrar na auditoria
      const logDto = BaseDto.plainToInstance({
        entidade_afetada: 'Documento',
        entidade_id: documento.id,
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

  /**
   * Busca um token pelo ID
   * @param id ID do token
   * @returns O token encontrado ou null
   */
  async findById(id: string): Promise<UploadToken | null> {
    try {
      return await this.uploadTokenRepository.findOne({
        where: { id },
        relations: ['usuario'],
      });
    } catch (error) {
      this.logger.error(`Erro ao buscar token por ID: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Cancela um token de upload
   * @param id ID do token
   * @param userId ID do usuário que está cancelando o token
   * @returns true se o token foi cancelado com sucesso, false caso contrário
   */
  async cancelToken(id: string, userId: string): Promise<boolean> {
    try {
      const token = await this.findById(id);
      
      if (!token) {
        return false;
      }

      // Atualizar status do token
      await this.uploadTokenRepository.update(id, {
        status: UploadTokenStatus.CANCELADO,
        updated_at: new Date(),
      });

      // Registrar na auditoria
      const logDto = BaseDto.plainToInstance({
        entidade_afetada: 'UploadToken',
        entidade_id: id,
        usuario_id: userId,
        tipo_operacao: TipoOperacao.UPDATE,
        dados_novos: { status: UploadTokenStatus.CANCELADO }
      }, CreateLogAuditoriaDto);
      await this.auditoriaService.create(logDto);

      return true;
    } catch (error) {
      this.logger.error(`Erro ao cancelar token: ${error.message}`, error.stack);
      return false;
    }
  }
}
