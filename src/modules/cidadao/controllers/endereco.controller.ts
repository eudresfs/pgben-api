import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  Logger,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EnderecoService } from '../services/endereco.service';
import { EnderecoDto } from '../dto/endereco.dto';
import { Endereco } from '../../../entities/endereco.entity';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/auth/guards/permission.guard';
import { RequiresPermission } from '@/auth/decorators/requires-permission.decorator';
import { TipoEscopo } from '@/entities/user-permission.entity';

@ApiTags('Endereços')
@Controller('enderecos')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT')
export class EnderecoController {
  constructor(private readonly enderecoService: EnderecoService) {}

  @Get('cidadao/:cidadaoId')
  @ApiOperation({ summary: 'Listar endereços de um cidadão' })
  @ApiResponse({ status: 200, description: 'Lista de endereços', type: [Endereco] })
  @RequiresPermission(
    {
      permissionName: 'cidadao.endereco.listar',
      scopeType: TipoEscopo.UNIDADE
    }
  )
  async findByCidadaoId(@Param('cidadaoId') cidadaoId: string): Promise<Endereco[]> {
    return this.enderecoService.findByCidadaoId(cidadaoId);
  }

  @Get('cidadao/:cidadaoId/atual')
  @ApiOperation({ summary: 'Buscar endereço atual de um cidadão' })
  @ApiResponse({ status: 200, description: 'Endereço atual', type: Endereco })
  @RequiresPermission(
    {
      permissionName: 'cidadao.endereco.visualizar',
      scopeType: TipoEscopo.UNIDADE
    }
  )
  async findEnderecoAtual(@Param('cidadaoId') cidadaoId: string): Promise<Endereco | null> {
    return this.enderecoService.findEnderecoAtual(cidadaoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar endereço por ID' })
  @ApiResponse({ status: 200, description: 'Endereço encontrado', type: Endereco })
  @ApiResponse({ status: 404, description: 'Endereço não encontrado' })
  @RequiresPermission(
    {
      permissionName: 'cidadao.endereco.visualizar',
      scopeType: TipoEscopo.UNIDADE
    }
  )
  async findById(@Param('id') id: string): Promise<Endereco> {
    return this.enderecoService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo endereço' })
  @ApiResponse({ status: 201, description: 'Endereço criado', type: Endereco })
  @RequiresPermission(
    {
      permissionName: 'cidadao.endereco.criar',
      scopeType: TipoEscopo.UNIDADE
    }
  )
  async create(@Body() enderecoDto: EnderecoDto): Promise<Endereco> {
    return this.enderecoService.create(enderecoDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar endereço existente' })
  @ApiResponse({ status: 200, description: 'Endereço atualizado', type: Endereco })
  @ApiResponse({ status: 404, description: 'Endereço não encontrado' })
  @RequiresPermission(
    {
      permissionName: 'cidadao.endereco.editar',
      scopeType: TipoEscopo.UNIDADE
    }
  )
  async update(
    @Param('id') id: string,
    @Body() enderecoDto: EnderecoDto,
  ): Promise<Endereco> {
    return this.enderecoService.update(id, enderecoDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover endereço' })
  @ApiResponse({ status: 200, description: 'Endereço removido' })
  @ApiResponse({ status: 404, description: 'Endereço não encontrado' })
  @RequiresPermission(
    {
      permissionName: 'cidadao.endereco.excluir',
      scopeType: TipoEscopo.UNIDADE
    }
  )
  async remove(@Param('id') id: string): Promise<void> {
    return this.enderecoService.remove(id);
  }
}
