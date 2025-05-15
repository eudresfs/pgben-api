import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  UnauthorizedException,
  InternalServerErrorException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Multer } from 'multer'; 
import { Repository } from 'typeorm';
import { Documento } from '../entities/documento.entity';
import { DocumentoEnviado } from '../entities/documento-enviado.entity';
import { UploadDocumentoDto } from '../dto/upload-documento.dto';
import { SolicitacaoService } from '../../solicitacao/services/solicitacao.service';
import { Role } from '../../../shared/enums/role.enum';
import { MinioService } from '../../../shared/services/minio.service';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { TipoOperacao } from '../../auditoria/enums/tipo-operacao.enum';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Serviço de Documentos
 * 
 * Responsável pela lógica de negócio relacionada aos documentos
 * anexados às solicitações de benefícios
 */
@Injectable()
export class DocumentoService {
  constructor(
    @InjectRepository(Documento)
    private documentoRepository: Repository<Documento>,
    
    @InjectRepository(DocumentoEnviado)
    private documentoEnviadoRepository: Repository<DocumentoEnviado>,
    
    private solicitacaoService: SolicitacaoService,
    private minioService: MinioService,
    private auditoriaService: AuditoriaService
  ) {}

  /**
   * Lista todos os documentos de uma solicitação
   */
  async findBySolicitacao(solicitacaoId: string, user: any) {
    // Verificar se a solicitação existe e se o usuário tem permissão para acessá-la
    const solicitacao = await this.solicitacaoService.findById(solicitacaoId);
    
    if (!this.solicitacaoService.canAccessSolicitacao(solicitacao, user)) {
      throw new UnauthorizedException('Você não tem permissão para acessar os documentos desta solicitação');
    }
    
    // Buscar documentos
    return this.documentoRepository.find({
      where: { solicitacao_id: solicitacaoId },
      relations: ['uploader'],
      order: { data_upload: 'DESC' },
    });
  }

  /**
   * Busca um documento pelo ID
   */
  async findById(id: string, user: any) {
    const documento = await this.documentoRepository.findOne({
      where: { id },
      relations: ['solicitacao', 'uploader'],
    });
    
    if (!documento) {
      throw new NotFoundException(`Documento com ID ${id} não encontrado`);
    }
    
    // Verificar se o usuário tem permissão para acessar este documento
    const solicitacao = await this.solicitacaoService.findById(documento.solicitacao_id);
    
    if (!this.solicitacaoService.canAccessSolicitacao(solicitacao, user)) {
      throw new UnauthorizedException('Você não tem permissão para acessar este documento');
    }
    
    // Registrar acesso ao documento na auditoria (especialmente se for sensível)
    if (documento.metadados?.criptografado) {
      await this.auditoriaService.create({
        tipo_operacao: TipoOperacao.READ,
        entidade_afetada: 'Documento',
        entidade_id: id,
        usuario_id: user.id,
        endpoint: `/api/v1/documentos/${id}`,
        metodo_http: 'GET',
        dados_sensiveis_acessados: [documento.tipo_documento],
        contemDadosLGPD: () => true
      } as any);
    }
    
    return documento;
  }

  /**
   * Faz upload de um novo documento para uma solicitação
   */
  async upload(
    arquivo: Express.Multer.File,
    uploadDocumentoDto: UploadDocumentoDto,
    user: any
  ) {
    // Verificar se a solicitação existe e se o usuário tem permissão para acessá-la
    const solicitacao = await this.solicitacaoService.findById(uploadDocumentoDto.solicitacao_id);
    
    if (!this.solicitacaoService.canAccessSolicitacao(solicitacao, user)) {
      throw new UnauthorizedException('Você não tem permissão para adicionar documentos a esta solicitação');
    }
    
    try {
      // Upload do arquivo para o MinIO com criptografia (se for documento sensível)
      const resultado = await this.minioService.uploadArquivo(
        arquivo.buffer,
        arquivo.originalname,
        uploadDocumentoDto.solicitacao_id,
        uploadDocumentoDto.tipo_documento
      );
      
      // Criar registro do documento no banco de dados
      const documento = this.documentoRepository.create({
        solicitacao_id: uploadDocumentoDto.solicitacao_id,
        tipo_documento: uploadDocumentoDto.tipo_documento,
        nome_arquivo: arquivo.originalname,
        caminho_arquivo: resultado.nomeArquivo, // Caminho no MinIO
        tamanho: resultado.tamanho,
        mime_type: arquivo.mimetype,
        data_upload: new Date(),
        uploader_id: user.id,
        metadados: {
          hash: resultado.hash,
          observacoes: uploadDocumentoDto.observacoes,
          verificado: false,
          criptografado: resultado.criptografado
        }
      });
      
      const savedDocumento = await this.documentoRepository.save(documento);
      
      // Criar registro de envio do documento
      const documentoEnviado = new DocumentoEnviado();
      documentoEnviado.documento_id = savedDocumento.id;
      documentoEnviado.nome_arquivo = arquivo.originalname;
      documentoEnviado.caminho_arquivo = resultado.nomeArquivo;
      documentoEnviado.tamanho = resultado.tamanho;
      documentoEnviado.mime_type = arquivo.mimetype;
      documentoEnviado.enviado_por_id = user.id;
      documentoEnviado.data_envio = new Date();
      documentoEnviado.observacoes = uploadDocumentoDto.observacoes || 'Enviado via API';
      
      await this.documentoEnviadoRepository.save(documentoEnviado);
      
      // Registrar operação na auditoria
      await this.auditoriaService.create({
        tipo_operacao: TipoOperacao.CREATE,
        entidade_afetada: 'Documento',
        entidade_id: savedDocumento.id,
        dados_novos: { 
          id: savedDocumento.id,
          tipo_documento: savedDocumento.tipo_documento,
          nome_arquivo: savedDocumento.nome_arquivo,
          tamanho: savedDocumento.tamanho,
          solicitacao_id: savedDocumento.solicitacao_id,
          criptografado: resultado.criptografado
        },
        usuario_id: user.id,
        endpoint: `/api/v1/documentos`,
        metodo_http: 'POST',
        dados_sensiveis_acessados: resultado.criptografado ? [uploadDocumentoDto.tipo_documento] : undefined,
        contemDadosLGPD: () => resultado.criptografado
      } as any);
      
      return savedDocumento;
    } catch (error) {
      throw new InternalServerErrorException(`Erro ao salvar documento: ${error.message}`);
    }
  }

  /**
   * Remove um documento de uma solicitação
   */
  async remove(id: string, user: any) {
    // Buscar o documento
    const documento = await this.findById(id, user);
    
    // Verificar se o usuário tem permissão para remover este documento
    // Apenas o usuário que fez upload, administradores ou gestores SEMTAS podem remover
    if (documento.uploader_id !== user.id && 
        ![Role.ADMIN, Role.GESTOR_SEMTAS].includes(user.role)) {
      throw new UnauthorizedException('Você não tem permissão para remover este documento');
    }
    
    // Verificar status da solicitação
    const solicitacao = await this.solicitacaoService.findById(documento.solicitacao_id);
    if (['APROVADA', 'LIBERADA'].includes(solicitacao.status)) {
      throw new BadRequestException('Não é possível remover documentos de solicitações aprovadas ou liberadas');
    }
    
    try {
      // Remover arquivo do MinIO
      await this.minioService.removerArquivo(documento.caminho_arquivo);
      
      // Remover registro do banco de dados (soft delete)
      await this.documentoRepository.softDelete(id);
      
      // Registrar operação na auditoria
      await this.auditoriaService.create({
        tipo_operacao: TipoOperacao.DELETE,
        entidade_afetada: 'Documento',
        entidade_id: id,
        dados_anteriores: {
          id: documento.id,
          tipo_documento: documento.tipo_documento,
          nome_arquivo: documento.nome_arquivo,
          solicitacao_id: documento.solicitacao_id
        },
        usuario_id: user.id,
        endpoint: `/api/v1/documentos/${id}`,
        metodo_http: 'DELETE',
        dados_sensiveis_acessados: documento.metadados?.criptografado ? [documento.tipo_documento] : undefined,
        contemDadosLGPD: () => !!documento.metadados?.criptografado
      } as any);
      
      return { message: 'Documento removido com sucesso' };
    } catch (error) {
      throw new InternalServerErrorException(`Erro ao remover documento: ${error.message}`);
    }
  }

  /**
   * Verifica um documento
   */
  async verificarDocumento(id: string, observacoes: string, user: any) {
    // Buscar o documento
    const documento = await this.findById(id, user);
    
    // Verificar se o usuário tem permissão para verificar documentos
    if (![Role.ADMIN, Role.GESTOR_SEMTAS, Role.TECNICO_SEMTAS, Role.COORDENADOR_UNIDADE].includes(user.role)) {
      throw new UnauthorizedException('Você não tem permissão para verificar documentos');
    }
    
    // Atualizar metadados do documento
    documento.metadados = {
      ...documento.metadados,
      verificado: true,
      observacoes: observacoes || documento.metadados?.observacoes
    };
    
    return this.documentoRepository.save(documento);
  }
}
