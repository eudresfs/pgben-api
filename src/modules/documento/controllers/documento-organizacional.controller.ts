import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Logger,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { Usuario } from '../../../entities/usuario.entity';
import { DocumentoService } from '../services/documento.service';
import { DocumentoPathService } from '../services/documento-path.service';
import { Documento } from '../../../entities/documento.entity';
import { TipoDocumentoEnum } from '../../../enums/tipo-documento.enum';

export interface DocumentoHierarquicoDto {
  id: string;
  nome_arquivo: string;
  tipo: TipoDocumentoEnum;
  tamanho: number;
  mimetype: string;
  data_upload: Date;
  caminho_hierarquico: string;
  estrutura_caminho: {
    cidadaoId: string;
    categoria: 'documentos-gerais' | 'solicitacoes';
    tipoDocumento: string;
    solicitacaoId?: string;
  };
  metadados?: any;
}

export interface EstruturaPastasDto {
  cidadaoId: string;
  pastas: {
    documentosGerais: {
      tipos: string[];
      totalDocumentos: number;
    };
    solicitacoes: Array<{
      solicitacaoId: string;
      tipos: string[];
      totalDocumentos: number;
    }>;
  };
  totalDocumentos: number;
}

export interface ListagemHierarquicaDto {
  documentos: DocumentoHierarquicoDto[];
  estrutura: EstruturaPastasDto;
  paginacao: {
    pagina: number;
    limite: number;
    total: number;
    totalPaginas: number;
  };
}

@ApiTags('Documentos')
@Controller('documentos/organizacional')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class DocumentoOrganizacionalController {
  private readonly logger = new Logger(DocumentoOrganizacionalController.name);

  constructor(
    private readonly documentoService: DocumentoService,
    private readonly pathService: DocumentoPathService,
  ) {}

  /**
   * Lista documentos de um cidadão organizados por estrutura hierárquica
   */
  @Get('cidadao/:cidadaoId')
  @RequiresPermission({ permissionName: 'documento.listar' })
  @ApiOperation({
    summary: 'Lista documentos por estrutura hierárquica',
    description:
      'Retorna documentos organizados por pastas hierárquicas (documentos-gerais e solicitações)',
  })
  @ApiResponse({
    status: 200,
    description: 'Documentos listados com sucesso',
    type: Object, // Seria ideal criar um DTO específico
  })
  @ApiQuery({
    name: 'pagina',
    required: false,
    type: Number,
    description: 'Número da página (padrão: 1)',
  })
  @ApiQuery({
    name: 'limite',
    required: false,
    type: Number,
    description: 'Itens por página (padrão: 20, máx: 100)',
  })
  @ApiQuery({
    name: 'tipo',
    required: false,
    enum: TipoDocumentoEnum,
    description: 'Filtrar por tipo de documento',
  })
  @ApiQuery({
    name: 'categoria',
    required: false,
    enum: ['documentos-gerais', 'solicitacoes'],
    description: 'Filtrar por categoria',
  })
  @ApiQuery({
    name: 'solicitacaoId',
    required: false,
    type: String,
    description: 'Filtrar por ID da solicitação',
  })
  async listarDocumentosHierarquicos(
    @GetUser() usuario: Usuario,
    @Param('cidadaoId', ParseUUIDPipe) cidadaoId: string,
    @Query('pagina') pagina: number = 1,
    @Query('limite') limite: number = 20,
    @Query('tipo') tipo?: TipoDocumentoEnum,
    @Query('categoria') categoria?: 'documentos-gerais' | 'solicitacoes',
    @Query('solicitacaoId') solicitacaoId?: string,
  ): Promise<ListagemHierarquicaDto> {
    try {
      // Validar parâmetros
      if (pagina < 1) pagina = 1;
      if (limite < 1 || limite > 100) limite = 20;

      this.logger.log(
        `Listando documentos hierárquicos para cidadão ${cidadaoId} - Página: ${pagina}, Limite: ${limite}`,
      );

      // Buscar documentos do cidadão
      const documentos = await this.documentoService.findByCidadao(
        cidadaoId,
        tipo,
      );

      // Simular paginação (implementar paginação adequada se necessário)
      const total = documentos.length;

      // Filtrar documentos que estão na estrutura hierárquica
      const documentosHierarquicos = documentos.filter((doc) =>
        this.pathService.isValidHierarchicalPath(doc.caminho),
      );

      // Aplicar filtros adicionais
      let documentosFiltrados = documentosHierarquicos;

      if (tipo) {
        documentosFiltrados = documentosFiltrados.filter(
          (doc) => doc.tipo === tipo,
        );
      }

      if (categoria || solicitacaoId) {
        documentosFiltrados = documentosFiltrados.filter((doc) => {
          try {
            const pathInfo = this.pathService.parseDocumentPath(doc.caminho);

            if (categoria && pathInfo.categoria !== categoria) {
              return false;
            }

            if (solicitacaoId && pathInfo.solicitacaoId !== solicitacaoId) {
              return false;
            }

            return true;
          } catch (error) {
            this.logger.warn(
              `Erro ao analisar caminho ${doc.caminho}: ${error.message}`,
            );
            return false;
          }
        });
      }

      // Converter para DTO hierárquico
      const documentosDto: DocumentoHierarquicoDto[] = documentosFiltrados
        .map((doc) => {
          try {
            const estruturaCaminho = this.pathService.parseDocumentPath(
              doc.caminho,
            );

            return {
              id: doc.id,
              nome_arquivo: doc.nome_arquivo,
              tipo: doc.tipo,
              tamanho: doc.tamanho,
              mimetype: doc.mimetype,
              data_upload: doc.data_upload,
              caminho_hierarquico: doc.caminho,
              estrutura_caminho: estruturaCaminho,
              metadados: doc.metadados,
            };
          } catch (error) {
            this.logger.warn(
              `Erro ao processar documento ${doc.id}: ${error.message}`,
            );
            return null;
          }
        })
        .filter(Boolean);

      // Gerar estrutura de pastas
      const estrutura = await this.gerarEstruturaPastas(
        cidadaoId,
        documentosHierarquicos,
      );

      // Calcular paginação
      const totalFiltrado = documentosDto.length;
      const totalPaginas = Math.ceil(totalFiltrado / limite);
      const inicio = (pagina - 1) * limite;
      const documentosPaginados = documentosDto.slice(inicio, inicio + limite);

      return {
        documentos: documentosPaginados,
        estrutura,
        paginacao: {
          pagina,
          limite,
          total: totalFiltrado,
          totalPaginas,
        },
      };
    } catch (error) {
      this.logger.error(
        `Erro ao listar documentos hierárquicos para cidadão ${cidadaoId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Obtém a estrutura de pastas de um cidadão
   */
  @Get('estrutura/:cidadaoId')
  @RequiresPermission({ permissionName: 'documento.listar' })
  @ApiOperation({
    summary: 'Obtém estrutura de pastas',
    description:
      'Retorna a estrutura hierárquica de pastas e tipos de documentos de um cidadão',
  })
  @ApiResponse({
    status: 200,
    description: 'Estrutura obtida com sucesso',
    type: Object,
  })
  async obterEstruturaPastas(
    @GetUser() usuario: Usuario,
    @Param('cidadaoId', ParseUUIDPipe) cidadaoId: string,
  ): Promise<EstruturaPastasDto> {
    try {
      this.logger.log(`Obtendo estrutura de pastas para cidadão ${cidadaoId}`);

      // Verificar acesso ao cidadão (implementar verificação de acesso se necessário)
      // await this.documentoService.checkUserDocumentAccess(documentoId, usuario.id, usuario.roles);

      // Buscar todos os documentos do cidadão
      const documentos = await this.documentoService.findByCidadao(cidadaoId);

      // Filtrar apenas documentos hierárquicos
      const documentosHierarquicos = documentos.filter((doc) =>
        this.pathService.isValidHierarchicalPath(doc.caminho),
      );

      return await this.gerarEstruturaPastas(cidadaoId, documentosHierarquicos);
    } catch (error) {
      this.logger.error(
        `Erro ao obter estrutura de pastas para cidadão ${cidadaoId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Lista documentos de uma pasta específica
   */
  @Get('pasta/:cidadaoId/:categoria')
  @RequiresPermission({ permissionName: 'documento.listar' })
  @ApiOperation({
    summary: 'Lista documentos de uma pasta específica',
    description:
      'Retorna documentos de uma categoria específica (documentos-gerais ou solicitações)',
  })
  @ApiResponse({
    status: 200,
    description: 'Documentos da pasta listados com sucesso',
  })
  @ApiQuery({
    name: 'tipo',
    required: false,
    enum: TipoDocumentoEnum,
    description: 'Filtrar por tipo de documento',
  })
  @ApiQuery({
    name: 'solicitacaoId',
    required: false,
    type: String,
    description: 'ID da solicitação (apenas para categoria solicitacoes)',
  })
  async listarDocumentosPasta(
    @GetUser() usuario: Usuario,
    @Param('cidadaoId', ParseUUIDPipe) cidadaoId: string,
    @Param('categoria') categoria: string,
    @Query('tipo') tipo?: TipoDocumentoEnum,
    @Query('solicitacaoId') solicitacaoId?: string,
  ): Promise<DocumentoHierarquicoDto[]> {
    try {
      // Validar categoria
      if (!['documentos-gerais', 'solicitacoes'].includes(categoria)) {
        throw new BadRequestException(
          'Categoria deve ser "documentos-gerais" ou "solicitacoes"',
        );
      }

      // Se categoria é solicitacoes, solicitacaoId é obrigatório
      if (categoria === 'solicitacoes' && !solicitacaoId) {
        throw new BadRequestException(
          'solicitacaoId é obrigatório para categoria "solicitacoes"',
        );
      }

      this.logger.log(
        `Listando documentos da pasta ${categoria} para cidadão ${cidadaoId}`,
      );

      // Buscar documentos do cidadão
      const documentos = await this.documentoService.findByCidadao(cidadaoId);

      // Filtrar por pasta e critérios
      const documentosFiltrados = documentos
        .filter((doc) => this.pathService.isValidHierarchicalPath(doc.caminho))
        .filter((doc) => {
          try {
            const pathInfo = this.pathService.parseDocumentPath(doc.caminho);

            // Filtrar por categoria
            if (pathInfo.categoria !== categoria) {
              return false;
            }

            // Filtrar por solicitação se especificado
            if (solicitacaoId && pathInfo.solicitacaoId !== solicitacaoId) {
              return false;
            }

            // Filtrar por tipo se especificado
            if (tipo && doc.tipo !== tipo) {
              return false;
            }

            return true;
          } catch (error) {
            this.logger.warn(
              `Erro ao analisar caminho ${doc.caminho}: ${error.message}`,
            );
            return false;
          }
        });

      // Converter para DTO
      return documentosFiltrados.map((doc) => {
        const estruturaCaminho = this.pathService.parseDocumentPath(
          doc.caminho,
        );

        return {
          id: doc.id,
          nome_arquivo: doc.nome_arquivo,
          tipo: doc.tipo,
          tamanho: doc.tamanho,
          mimetype: doc.mimetype,
          data_upload: doc.data_upload,
          caminho_hierarquico: doc.caminho,
          estrutura_caminho: estruturaCaminho,
          metadados: doc.metadados,
        };
      });
    } catch (error) {
      this.logger.error(
        `Erro ao listar documentos da pasta ${categoria} para cidadão ${cidadaoId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Gera a estrutura de pastas baseada nos documentos
   */
  private async gerarEstruturaPastas(
    cidadaoId: string,
    documentos: Documento[],
  ): Promise<EstruturaPastasDto> {
    const estrutura: EstruturaPastasDto = {
      cidadaoId,
      pastas: {
        documentosGerais: {
          tipos: [],
          totalDocumentos: 0,
        },
        solicitacoes: [],
      },
      totalDocumentos: documentos.length,
    };

    const tiposDocumentosGerais = new Set<string>();
    const solicitacoesMap = new Map<
      string,
      { tipos: Set<string>; total: number }
    >();

    for (const documento of documentos) {
      try {
        const pathInfo = this.pathService.parseDocumentPath(documento.caminho);

        if (pathInfo.categoria === 'documentos-gerais') {
          tiposDocumentosGerais.add(pathInfo.tipoDocumento);
          estrutura.pastas.documentosGerais.totalDocumentos++;
        } else if (
          pathInfo.categoria === 'solicitacoes' &&
          pathInfo.solicitacaoId
        ) {
          if (!solicitacoesMap.has(pathInfo.solicitacaoId)) {
            solicitacoesMap.set(pathInfo.solicitacaoId, {
              tipos: new Set<string>(),
              total: 0,
            });
          }

          const solicitacao = solicitacoesMap.get(pathInfo.solicitacaoId);
          solicitacao.tipos.add(pathInfo.tipoDocumento);
          solicitacao.total++;
        }
      } catch (error) {
        this.logger.warn(
          `Erro ao processar documento ${documento.id}: ${error.message}`,
        );
      }
    }

    // Converter sets para arrays
    estrutura.pastas.documentosGerais.tipos = Array.from(
      tiposDocumentosGerais,
    ).sort();

    estrutura.pastas.solicitacoes = Array.from(solicitacoesMap.entries())
      .map(([solicitacaoId, data]) => ({
        solicitacaoId,
        tipos: Array.from(data.tipos).sort(),
        totalDocumentos: data.total,
      }))
      .sort((a, b) => a.solicitacaoId.localeCompare(b.solicitacaoId));

    return estrutura;
  }
}
