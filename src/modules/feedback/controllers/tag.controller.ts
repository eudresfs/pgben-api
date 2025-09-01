import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ValidationPipe,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
  NotFoundException,
  ForbiddenException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TagService } from '../services/tag.service';
import {
  CreateTagDto,
  UpdateTagDto,
  TagResponseDto,
  TagFilterDto,
  TagSugestionsDto
} from '../dto/tag.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../../../auth/guards/optional-auth.guard';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { Usuario } from '../../../entities/usuario.entity';

/**
 * Interface para filtros de query
 */
interface TagQueryFilters {
  nome?: string;
  categoria?: string;
  ativo?: boolean;
  popular?: boolean;
  uso_minimo?: number;
  page?: number;
  limite?: number;
  ordenacao?: 'nome' | 'contador_uso' | 'created_at';
  direcao?: 'ASC' | 'DESC';
}

@ApiTags('Tags')
@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  /**
   * Listar todas as tags com filtros
   */
  @Get()
  @ApiOperation({ summary: 'Listar tags com filtros opcionais' })
  @ApiQuery({ name: 'nome', type: String, required: false, description: 'Filtrar por nome da tag' })
  @ApiQuery({ name: 'categoria', type: String, required: false, description: 'Filtrar por categoria' })
  @ApiQuery({ name: 'ativo', type: Boolean, required: false, description: 'Filtrar por status ativo' })
  @ApiQuery({ name: 'popular', type: Boolean, required: false, description: 'Apenas tags populares' })
  @ApiQuery({ name: 'uso_minimo', type: Number, required: false, description: 'Uso mínimo da tag' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'limite', type: Number, required: false, example: 20 })
  @ApiQuery({ name: 'ordenacao', enum: ['nome', 'contador_uso', 'created_at'], required: false })
  @ApiQuery({ name: 'direcao', enum: ['ASC', 'DESC'], required: false })
  @ApiResponse({
    status: 200,
    description: 'Lista de tags',
    type: [TagResponseDto]
  })
  @UseGuards(OptionalAuthGuard) // Permite acesso público
  async findAll(
    @Query() filters: TagQueryFilters
  ): Promise<TagResponseDto[]> {
    try {
      // Processar filtros
      const processedFilters: TagFilterDto = {
        nome: filters.nome,
        categoria: filters.categoria,
        ativo: filters.ativo !== undefined ? Boolean(filters.ativo) : undefined,
        popular: filters.popular !== undefined ? Boolean(filters.popular) : undefined,
        uso_minimo: filters.uso_minimo ? parseInt(filters.uso_minimo.toString()) : undefined,
        page: filters.page ? parseInt(filters.page.toString()) : 1,
        limite: filters.limite ? parseInt(filters.limite.toString()) : 20
      };

      return await this.tagService.findAll(processedFilters);
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Erro ao buscar tags'
      );
    }
  }

  /**
   * Buscar tag por ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Buscar tag por ID' })
  @ApiParam({ name: 'id', type: String, description: 'ID da tag' })
  @ApiResponse({
    status: 200,
    description: 'Tag encontrada',
    type: TagResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Tag não encontrada'
  })
  @UseGuards(OptionalAuthGuard)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<TagResponseDto> {
    try {
      const tag = await this.tagService.findOne(id);
      
      if (!tag) {
        throw new NotFoundException('Tag não encontrada');
      }

      return tag;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Erro ao buscar tag'
      );
    }
  }

  /**
   * Buscar tags ativas (mais usado)
   */
  @Get('ativas/listar')
  @ApiOperation({ summary: 'Buscar apenas tags ativas' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Lista de tags ativas',
    type: [TagResponseDto]
  })
  @UseGuards(OptionalAuthGuard)
  async findAtivas(
    @Query('limit') limit?: number
  ): Promise<TagResponseDto[]> {
    try {
      return await this.tagService.findAtivas(limit ? parseInt(limit.toString()) : 50);
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Erro ao buscar tags ativas'
      );
    }
  }

  /**
   * Buscar tags populares
   */
  @Get('populares/listar')
  @ApiOperation({ summary: 'Buscar tags populares' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Lista de tags populares',
    type: [TagResponseDto]
  })
  @UseGuards(OptionalAuthGuard)
  async findPopulares(
    @Query('limit') limit?: number
  ): Promise<TagResponseDto[]> {
    try {
      return await this.tagService.findPopulares(limit ? parseInt(limit.toString()) : 20);
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Erro ao buscar tags populares'
      );
    }
  }

  /**
   * Buscar tags por categoria
   */
  @Get('categoria/:categoria')
  @ApiOperation({ summary: 'Buscar tags por categoria' })
  @ApiParam({ name: 'categoria', type: String, description: 'Nome da categoria' })
  @ApiResponse({
    status: 200,
    description: 'Lista de tags da categoria',
    type: [TagResponseDto]
  })
  @UseGuards(OptionalAuthGuard)
  async findByCategoria(
    @Param('categoria') categoria: string
  ): Promise<TagResponseDto[]> {
    try {
      return await this.tagService.findByCategoria(categoria);
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Erro ao buscar tags por categoria'
      );
    }
  }

  /**
   * Obter todas as categorias disponíveis
   */
  @Get('categorias/listar')
  @ApiOperation({ summary: 'Obter lista de categorias disponíveis' })
  @ApiResponse({
    status: 200,
    description: 'Lista de categorias'
  })
  @UseGuards(OptionalAuthGuard)
  async getCategorias(): Promise<string[]> {
    try {
      return await this.tagService.getCategorias();
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Erro ao buscar categorias'
      );
    }
  }

  /**
   * Gerar sugestões de tags baseadas em texto
   */
  @Post('sugestoes')
  @ApiOperation({ summary: 'Gerar sugestões de tags baseadas em texto' })
  @ApiResponse({
    status: 200,
    description: 'Lista de tags sugeridas',
    type: [TagResponseDto]
  })
  @UseGuards(OptionalAuthGuard)
  async gerarSugestoes(
    @Body(ValidationPipe) tagSuggestionsDto: TagSugestionsDto
  ): Promise<TagResponseDto[]> {
    try {
      return await this.tagService.gerarSugestoes(tagSuggestionsDto);
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Erro ao gerar sugestões de tags'
      );
    }
  }

  /**
   * Criar nova tag (apenas admin)
   */
  @Post()
  @ApiOperation({ summary: 'Criar nova tag (apenas administradores)' })
  @ApiResponse({
    status: 201,
    description: 'Tag criada com sucesso',
    type: TagResponseDto
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas administradores'
  })
  @UseGuards(JwtAuthGuard)
  async create(
    @Body(ValidationPipe) createTagDto: CreateTagDto,
    @GetUser() usuario: Usuario
  ): Promise<TagResponseDto> {
    try {
      if (!this.isAdmin(usuario)) {
        throw new ForbiddenException('Apenas administradores podem criar tags');
      }

      return await this.tagService.create(createTagDto);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Erro ao criar tag'
      );
    }
  }

  /**
   * Atualizar tag (apenas admin)
   */
  @Put(':id')
  @ApiOperation({ summary: 'Atualizar tag (apenas administradores)' })
  @ApiParam({ name: 'id', type: String, description: 'ID da tag' })
  @ApiResponse({
    status: 200,
    description: 'Tag atualizada com sucesso',
    type: TagResponseDto
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas administradores'
  })
  @ApiResponse({
    status: 404,
    description: 'Tag não encontrada'
  })
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateTagDto: UpdateTagDto,
    @GetUser() usuario: Usuario
  ): Promise<TagResponseDto> {
    try {
      if (!this.isAdmin(usuario)) {
        throw new ForbiddenException('Apenas administradores podem atualizar tags');
      }

      const tag = await this.tagService.update(id, updateTagDto);
      
      if (!tag) {
        throw new NotFoundException('Tag não encontrada');
      }

      return tag;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Erro ao atualizar tag'
      );
    }
  }

  /**
   * Remover tag (apenas admin) - soft delete
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Remover tag (apenas administradores)' })
  @ApiParam({ name: 'id', type: String, description: 'ID da tag' })
  @ApiResponse({
    status: 200,
    description: 'Tag removida com sucesso'
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas administradores'
  })
  @ApiResponse({
    status: 404,
    description: 'Tag não encontrada'
  })
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() usuario: Usuario
  ): Promise<{ message: string }> {
    try {
      if (!this.isAdmin(usuario)) {
        throw new ForbiddenException('Apenas administradores podem remover tags');
      }

      await this.tagService.remove(id);

      return { message: 'Tag removida com sucesso' };
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Erro ao remover tag'
      );
    }
  }

  /**
   * Obter estatísticas de tags (apenas admin)
   */
  @Get('admin/estatisticas')
  @ApiOperation({ summary: 'Obter estatísticas de tags (apenas administradores)' })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas de tags'
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas administradores'
  })
  @UseGuards(JwtAuthGuard)
  async getEstatisticas(
    @GetUser() usuario: Usuario
  ): Promise<any> {
    try {
      if (!this.isAdmin(usuario)) {
        throw new ForbiddenException('Apenas administradores podem acessar estatísticas');
      }

      return await this.tagService.getEstatisticas();
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Erro ao obter estatísticas'
      );
    }
  }

  /**
   * Limpar tags não utilizadas (apenas admin)
   */
  @Delete('admin/limpar-nao-utilizadas')
  @ApiOperation({ summary: 'Limpar tags não utilizadas (apenas administradores)' })
  @ApiResponse({
    status: 200,
    description: 'Tags não utilizadas removidas'
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas administradores'
  })
  @UseGuards(JwtAuthGuard)
  async limparTagsNaoUtilizadas(
    @GetUser() usuario: Usuario
  ): Promise<{ message: string; removidas: number }> {
    try {
      if (!this.isAdmin(usuario)) {
        throw new ForbiddenException('Apenas administradores podem limpar tags');
      }

      const removidas = await this.tagService.limparTagsNaoUtilizadas();
      
      return {
        message: 'Tags não utilizadas removidas com sucesso',
        removidas
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Erro ao limpar tags não utilizadas'
      );
    }
  }

  /**
   * Verificar se o usuário é administrador
   */
  private isAdmin(usuario: Usuario): boolean {
    // Verificar se o usuário tem role de administrador
    // Assumindo que existe uma role com código 'admin' ou 'administrador'
    return usuario.role && (usuario.role.codigo === 'admin' || usuario.role.codigo === 'administrador');
  }
}