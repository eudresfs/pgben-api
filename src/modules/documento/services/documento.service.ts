import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  UnauthorizedException,
  InternalServerErrorException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Documento } from '../entities/documento.entity';
import { DocumentoEnviado } from '../entities/documento-enviado.entity';
import { UploadDocumentoDto } from '../dto/upload-documento.dto';
import { SolicitacaoService } from '../../solicitacao/services/solicitacao.service';
import { Role } from '../../auth/enums/role.enum';
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
    
    private solicitacaoService: SolicitacaoService
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
    
    // Criar diretório de upload se não existir
    const uploadDir = path.join(process.cwd(), 'uploads', 'documentos', uploadDocumentoDto.solicitacao_id);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Gerar nome de arquivo único
    const fileExtension = path.extname(arquivo.originalname);
    const fileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);
    
    // Calcular hash do arquivo para verificação de integridade
    const fileHash = crypto.createHash('sha256').update(arquivo.buffer).digest('hex');
    
    try {
      // Salvar arquivo no sistema de arquivos
      fs.writeFileSync(filePath, arquivo.buffer);
      
      // Criar registro do documento no banco de dados
      const documento = this.documentoRepository.create({
        solicitacao_id: uploadDocumentoDto.solicitacao_id,
        tipo_documento: uploadDocumentoDto.tipo_documento,
        nome_arquivo: arquivo.originalname,
        caminho_arquivo: `/uploads/documentos/${uploadDocumentoDto.solicitacao_id}/${fileName}`,
        tamanho: arquivo.size,
        mime_type: arquivo.mimetype,
        data_upload: new Date(),
        uploader_id: user.id,
        metadados: {
          hash: fileHash,
          observacoes: uploadDocumentoDto.observacoes,
          verificado: false
        }
      });
      
      const savedDocumento = await this.documentoRepository.save(documento);
      
      // Criar registro de envio do documento
      const documentoEnviado = this.documentoEnviadoRepository.create({
        documento_id: savedDocumento.id,
        solicitacao_id: uploadDocumentoDto.solicitacao_id,
        usuario_id: user.id,
        data_envio: new Date(),
        ip_origem: '127.0.0.1', // Em produção, obter do request
        user_agent: 'API', // Em produção, obter do request
      });
      
      await this.documentoEnviadoRepository.save(documentoEnviado);
      
      return savedDocumento;
    } catch (error) {
      // Em caso de erro, remover o arquivo se foi criado
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
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
      // Remover arquivo do sistema de arquivos
      const filePath = path.join(process.cwd(), documento.caminho_arquivo.substring(1));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Remover registro do banco de dados (soft delete)
      await this.documentoRepository.softDelete(id);
      
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
