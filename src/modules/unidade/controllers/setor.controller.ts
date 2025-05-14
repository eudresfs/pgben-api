import { Controller, Get, Post, Body, Put, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SetorService } from '../services/setor.service';
import { CreateSetorDto } from '../dto/create-setor.dto';
import { UpdateSetorDto } from '../dto/update-setor.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../auth/enums/role.enum';

/**
 * Controlador de setores
 * 
 * Responsável por gerenciar as rotas relacionadas a setores dentro das unidades
 */
@ApiTags('Setores')
@Controller('setor')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SetorController {
  constructor(private readonly setorService: SetorService) { }

  /**
   * Cria um novo setor
   */
  @Post()
  @Roles(Role.ADMIN, Role.GESTOR_SEMTAS)
  @ApiOperation({ summary: 'Criar novo setor' })
  @ApiResponse({ status: 201, description: 'Setor criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Unidade não encontrada' })
  async create(@Body() createSetorDto: CreateSetorDto) {
    return this.setorService.create(createSetorDto);
  }

  /**
   * Atualiza um setor existente
   */
  @Put(':id')
  @Roles(Role.ADMIN, Role.GESTOR_SEMTAS)
  @ApiOperation({ summary: 'Atualizar setor existente' })
  @ApiResponse({ status: 200, description: 'Setor atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Setor não encontrado' })
  async update(@Param('id') id: string, @Body() updateSetorDto: UpdateSetorDto) {
    return this.setorService.update(id, updateSetorDto);
  }

  /**
   * Obtém detalhes de um setor específico
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um setor' })
  @ApiResponse({ status: 200, description: 'Setor encontrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Setor não encontrado' })
  async findOne(@Param('id') id: string) {
    return this.setorService.findById(id);
  }
}