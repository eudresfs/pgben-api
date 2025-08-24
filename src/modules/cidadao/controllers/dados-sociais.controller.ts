import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { DadosSociaisService } from '../services/dados-sociais.service';
import { CreateDadosSociaisDto } from '../dto/create-dados-sociais.dto';
import { UpdateDadosSociaisDto } from '../dto/update-dados-sociais.dto';
import { DadosSociaisResponseDto } from '../dto/dados-sociais-response.dto';
import { plainToInstance } from 'class-transformer';

@ApiTags('Cidadão')
@Controller('cidadao')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DadosSociaisController {
  constructor(private readonly dadosSociaisService: DadosSociaisService) {}

  @Post(':id/dados-sociais')
  @HttpCode(HttpStatus.CREATED)
  @RequiresPermission({ permissionName: 'cidadao:dados-sociais:create' })
  @ApiOperation({ summary: 'Criar dados sociais para um cidadão' })
  @ApiParam({ name: 'id', description: 'ID do cidadão' })
  @ApiResponse({ status: 201, type: DadosSociaisResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 204, description: 'Cidadão não encontrado' })
  @ApiResponse({ status: 409, description: 'Dados sociais já existem' })
  async create(
    @Param('id', ParseUUIDPipe) cidadaoId: string,
    @Body() createDadosSociaisDto: CreateDadosSociaisDto,
  ): Promise<DadosSociaisResponseDto | null> {
    const dadosSociais = await this.dadosSociaisService.create(
      cidadaoId,
      createDadosSociaisDto,
    );

    if (!dadosSociais) {
      return null; // Retorna null para 204 No Content (cidadão não existe)
    }

    return plainToInstance(DadosSociaisResponseDto, dadosSociais, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id/dados-sociais')
  @RequiresPermission({ permissionName: 'cidadao:dados-sociais:read' })
  @ApiOperation({ summary: 'Buscar dados sociais de um cidadão' })
  @ApiParam({ name: 'id', description: 'ID do cidadão' })
  @ApiResponse({ status: 200, type: DadosSociaisResponseDto })
  @ApiResponse({ status: 204, description: 'Dados sociais não encontrados' })
  async findByCidadaoId(
    @Param('id', ParseUUIDPipe) cidadaoId: string,
  ): Promise<DadosSociaisResponseDto | null> {
    const dadosSociais =
      await this.dadosSociaisService.findByCidadaoId(cidadaoId);

    if (!dadosSociais) {
      return null; // Retorna null para 204 No Content
    }

    return plainToInstance(DadosSociaisResponseDto, dadosSociais, {
      excludeExtraneousValues: true,
    });
  }

  @Put(':id/dados-sociais')
  @RequiresPermission({ permissionName: 'cidadao:dados-sociais:update' })
  @ApiOperation({ summary: 'Atualizar dados sociais de um cidadão' })
  @ApiParam({ name: 'id', description: 'ID do cidadão' })
  @ApiResponse({ status: 200, type: DadosSociaisResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 204, description: 'Dados sociais não encontrados' })
  async update(
    @Param('id', ParseUUIDPipe) cidadaoId: string,
    @Body() updateDadosSociaisDto: UpdateDadosSociaisDto,
  ): Promise<DadosSociaisResponseDto | null> {
    const dadosSociais = await this.dadosSociaisService.update(
      cidadaoId,
      updateDadosSociaisDto,
    );

    if (!dadosSociais) {
      return null; // Retorna null para 204 No Content
    }

    return plainToInstance(DadosSociaisResponseDto, dadosSociais, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id/dados-sociais')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequiresPermission({ permissionName: 'cidadao:dados-sociais:delete' })
  @ApiOperation({ summary: 'Remover dados sociais de um cidadão' })
  @ApiParam({ name: 'id', description: 'ID do cidadão' })
  @ApiResponse({
    status: 204,
    description: 'Dados sociais removidos ou não existiam',
  })
  async remove(@Param('id', ParseUUIDPipe) cidadaoId: string): Promise<void> {
    await this.dadosSociaisService.remove(cidadaoId);
    // Sempre retorna 204, independente se encontrou ou não
  }
}
