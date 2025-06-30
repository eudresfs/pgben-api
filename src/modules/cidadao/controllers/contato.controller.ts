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
import { ContatoService } from '../services/contato.service';
import { ContatoDto } from '../dto/contato.dto';
import { Contato } from '../../../entities/contato.entity';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/auth/guards/permission.guard';
import { RequiresPermission } from '@/auth/decorators/requires-permission.decorator';
import { TipoEscopo } from '@/entities/user-permission.entity';

@ApiTags('Contatos')
@Controller('contatos')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT')
export class ContatoController {
  constructor(private readonly contatoService: ContatoService) {}

  @Get('cidadao/:cidadaoId')
  @ApiOperation({ summary: 'Listar contatos de um cidadão' })
  @ApiResponse({ status: 200, description: 'Lista de contatos', type: [Contato] })
  @RequiresPermission(
    {
      permissionName: 'cidadao.contato.listar',
      scopeType: TipoEscopo.UNIDADE
    }
  )
  async findByCidadaoId(@Param('cidadaoId') cidadaoId: string): Promise<Contato[]> {
    return this.contatoService.findByCidadaoId(cidadaoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar contato por ID' })
  @ApiResponse({ status: 200, description: 'Contato encontrado', type: Contato })
  @ApiResponse({ status: 404, description: 'Contato não encontrado' })
  @RequiresPermission(
    {
      permissionName: 'cidadao.contato.visualizar',
      scopeType: TipoEscopo.UNIDADE
    }
  )
  async findById(@Param('id') id: string): Promise<Contato> {
    return this.contatoService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo contato' })
  @ApiResponse({ status: 201, description: 'Contato criado', type: Contato })
  @RequiresPermission(
    {
      permissionName: 'cidadao.contato.criar',
      scopeType: TipoEscopo.UNIDADE
    }
  )
  async create(@Body() contatoDto: ContatoDto): Promise<Contato> {
    return this.contatoService.create(contatoDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar contato existente' })
  @ApiResponse({ status: 200, description: 'Contato atualizado', type: Contato })
  @ApiResponse({ status: 404, description: 'Contato não encontrado' })
  @RequiresPermission(
    {
      permissionName: 'cidadao.contato.editar',
      scopeType: TipoEscopo.UNIDADE
    }
  )
  async update(
    @Param('id') id: string,
    @Body() contatoDto: ContatoDto,
  ): Promise<Contato> {
    return this.contatoService.update(id, contatoDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover contato' })
  @ApiResponse({ status: 200, description: 'Contato removido' })
  @ApiResponse({ status: 404, description: 'Contato não encontrado' })
  @RequiresPermission(
    {
      permissionName: 'cidadao.contato.excluir',
      scopeType: TipoEscopo.UNIDADE
    }
  )
  async remove(@Param('id') id: string): Promise<void> {
    return this.contatoService.remove(id);
  }
}
