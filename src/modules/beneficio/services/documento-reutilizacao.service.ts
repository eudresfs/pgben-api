import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { IDocumentoReutilizacaoService } from '../interfaces';
import { Documento } from '../../../entities';

/**
 * Serviço responsável pela reutilização de documentos em renovações
 * Implementa a lógica de cópia e referenciamento de documentos
 */
@Injectable()
export class DocumentoReutilizacaoService implements IDocumentoReutilizacaoService {
  private readonly logger = new Logger(DocumentoReutilizacaoService.name);

  constructor(
    @InjectRepository(Documento)
    private readonly documentoRepository: Repository<Documento>,
    // Usando repositório de Documento diretamente
  ) {}

  /**
   * Reutiliza documentos de uma solicitação original para uma nova solicitação de renovação
   * Cria referências aos documentos existentes sem duplicar arquivos
   */
  async reutilizarDocumentos(
    solicitacaoOriginalId: string,
    novaSolicitacaoId: string,
    queryRunner?: QueryRunner
  ): Promise<void> {
    this.logger.log(`Iniciando reutilização de documentos - Original: ${solicitacaoOriginalId}, Nova: ${novaSolicitacaoId}`);

    try {
      // Buscar todos os documentos da solicitação original
      const documentosOriginais = await this.buscarDocumentosSolicitacao(solicitacaoOriginalId);

      if (documentosOriginais.length === 0) {
        this.logger.warn(`Nenhum documento encontrado para reutilização na solicitação: ${solicitacaoOriginalId}`);
        return;
      }

      let documentosReutilizados = 0;

      for (const documento of documentosOriginais) {
        // Verificar se o documento pode ser reutilizado
        const podeReutilizar = await this.verificarDocumentoPodeSerReutilizado(documento.id);
        
        if (podeReutilizar) {
          // Criar nova referência do documento para a nova solicitação
          await this.criarReferenciaDocumento(
            documento,
            novaSolicitacaoId
          );
          documentosReutilizados++;
        } else {
          this.logger.warn(`Documento ${documento.id} não pode ser reutilizado`);
        }
      }

      this.logger.log(`Reutilização concluída - ${documentosReutilizados} documentos reutilizados de ${documentosOriginais.length} disponíveis`);

    } catch (error) {
      this.logger.error(`Erro ao reutilizar documentos: ${error.message}`, error.stack);
      throw new Error('Erro interno ao reutilizar documentos');
    }
  }

  /**
   * Busca todos os documentos associados a uma solicitação
   */
  async buscarDocumentosSolicitacao(solicitacaoId: string): Promise<Documento[]> {
    this.logger.log(`Buscando documentos da solicitação: ${solicitacaoId}`);
    return await this.documentoRepository.find({
      where: { solicitacao_id: solicitacaoId },
      relations: ['cidadao']
    });
  }

  /**
   * Cria uma nova referência de documento para uma solicitação
   * Não duplica o arquivo físico, apenas cria nova associação
   */
  async criarReferenciaDocumento(
    documentoOriginal: any,
    novaSolicitacaoId: string
  ): Promise<any> {
    this.logger.log(`Criando referência de documento - Doc: ${documentoOriginal.id}, Solicitação: ${novaSolicitacaoId}`);

    // Criar nova referência de documento para a nova solicitação
    const novoDocumento = this.documentoRepository.create({
      ...documentoOriginal,
      id: undefined, // Remove o ID para criar novo
      solicitacao_id: novaSolicitacaoId,
      data_upload: new Date(),
      reutilizavel: true
    });

    return await this.documentoRepository.save(novoDocumento);
  }

  /**
   * Verifica se um documento pode ser reutilizado
   * Valida integridade, validade e outras regras de negócio
   */
  async verificarDocumentoPodeSerReutilizado(documentoId: string): Promise<boolean> {
    try {
      const documento = await this.documentoRepository.findOne({
        where: { id: documentoId },
        select: ['id', 'verificado', 'data_validade', 'mimetype', 'tamanho']
      });

      if (!documento) {
        this.logger.warn(`Documento não encontrado: ${documentoId}`);
        return false;
      }

      // 1. Verificar se o documento está ativo/válido
      if (!documento.verificado) {
        this.logger.warn(`Documento ${documentoId} não está verificado: ${documento.verificado}`);
        return false;
      }

      // 2. Verificar validade do documento (se aplicável)
      if (documento.data_validade) {
        const agora = new Date();
        const dataValidade = new Date(documento.data_validade);
        
        if (dataValidade < agora) {
          this.logger.warn(`Documento ${documentoId} está vencido`);
          return false;
        }

        // Verificar se o documento não vence nos próximos 30 dias
        const trintaDias = new Date();
        trintaDias.setDate(trintaDias.getDate() + 30);
        
        if (dataValidade < trintaDias) {
          this.logger.warn(`Documento ${documentoId} vence em menos de 30 dias`);
          return false;
        }
      }

      // 3. Verificar integridade do arquivo
      if (!documento.tamanho || documento.tamanho <= 0) {
        this.logger.warn(`Documento ${documentoId} parece estar corrompido`);
        return false;
      }

      // 4. Verificar tipos de arquivo permitidos para reutilização
      const tiposPermitidos = ['PDF', 'JPG', 'JPEG', 'PNG', 'DOC', 'DOCX'];
      if (!tiposPermitidos.includes(documento.mimetype?.toUpperCase())) {
        this.logger.warn(`Tipo de arquivo não permitido para reutilização: ${documento.mimetype}`);
        return false;
      }

      return true;

    } catch (error) {
      this.logger.error(`Erro ao verificar se documento pode ser reutilizado: ${error.message}`);
      return false;
    }
  }

  /**
   * Remove referências de documentos reutilizados (método auxiliar)
   */
  async removerReferenciasReutilizadas(solicitacaoId: string): Promise<void> {
    try {
      await this.documentoRepository.delete({
        solicitacao_id: solicitacaoId,
        reutilizavel: true
      });

      this.logger.log(`Referências de documentos reutilizados removidas para solicitação: ${solicitacaoId}`);
    } catch (error) {
      this.logger.error(`Erro ao remover referências reutilizadas: ${error.message}`);
      throw error;
    }
  }

  /**
   * Lista documentos reutilizados de uma solicitação
   */
  async listarDocumentosReutilizados(solicitacaoId: string): Promise<Documento[]> {
    try {
      return await this.documentoRepository.find({
        where: {
          solicitacao_id: solicitacaoId,
          reutilizavel: true
        },
        relations: ['cidadao'],
        order: { data_upload: 'ASC' }
      });
    } catch (error) {
      this.logger.error(`Erro ao listar documentos reutilizados: ${error.message}`);
      return [];
    }
  }

  /**
   * Atualiza status de reutilização de documentos
   */
  async atualizarStatusReutilizacao(
    documentoId: string,
    novoStatus: boolean
  ): Promise<void> {
    try {
      await this.documentoRepository.update(
        { id: documentoId },
        {
          reutilizavel: novoStatus,
          updated_at: new Date()
        }
      );

      this.logger.log(`Status de reutilização atualizado - Doc: ${documentoId}, Status: ${novoStatus}`);
    } catch (error) {
      this.logger.error(`Erro ao atualizar status de reutilização: ${error.message}`);
      throw error;
    }
  }
}