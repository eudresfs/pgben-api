# Checklist de Implementação para o Módulo de Auditoria

## 1. Otimização da Estrutura de Logs

- [ ] Implementar particionamento de tabelas por data:
  ```sql
  -- Criar função para gerenciar partições
  CREATE OR REPLACE FUNCTION criar_particao_log_auditoria()
  RETURNS TRIGGER AS $$
  DECLARE
    particao_data TEXT;
    particao_inicio DATE;
    particao_fim DATE;
  BEGIN
    particao_data := to_char(NEW.created_at, 'YYYY_MM');
    particao_inicio := date_trunc('month', NEW.created_at);
    particao_fim := particao_inicio + INTERVAL '1 month';
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = 'log_auditoria_' || particao_data
    ) THEN
      EXECUTE 'CREATE TABLE log_auditoria_' || particao_data || 
              ' PARTITION OF log_auditoria FOR VALUES FROM (''' || 
              particao_inicio || ''') TO (''' || particao_fim || ''')';
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  ```

- [ ] Modificar a entidade LogAuditoria para suportar particionamento:
  ```typescript
  // src/modules/auditoria/entities/log-auditoria.entity.ts
  @Entity('log_auditoria', { 
    orderBy: { created_at: 'DESC' },
    // Adicionar comentário para o DBA sobre particionamento
    comment: 'Tabela particionada por mês (YYYY_MM)'
  })
  export class LogAuditoria {
    // Propriedades existentes...
  }
  ```

- [ ] Criar índices otimizados:
  ```typescript
  @Index('idx_log_auditoria_created_at', ['created_at'])
  @Index('idx_log_auditoria_tipo_operacao', ['tipo_operacao'])
  @Index('idx_log_auditoria_entidade_usuario', ['entidade_afetada', 'usuario_id'])
  export class LogAuditoria {
    // Propriedades existentes...
  }
  ```

## 2. Implementação de Compressão de Logs

- [ ] Adicionar campo para armazenar dados comprimidos:
  ```typescript
  @Column({ 
    type: 'bytea', 
    nullable: true,
    comment: 'Dados comprimidos usando zlib'
  })
  dados_comprimidos: Buffer;
  ```

- [ ] Implementar serviço de compressão:
  ```typescript
  // src/modules/auditoria/services/compressao.service.ts
  import { Injectable } from '@nestjs/common';
  import * as zlib from 'zlib';
  import { promisify } from 'util';

  @Injectable()
  export class CompressaoService {
    private deflate = promisify(zlib.deflate);
    private inflate = promisify(zlib.inflate);
    
    async comprimirDados(dados: any): Promise<Buffer> {
      const dadosString = JSON.stringify(dados);
      return this.deflate(dadosString);
    }
    
    async descomprimirDados(dadosComprimidos: Buffer): Promise<any> {
      const dadosDescomprimidos = await this.inflate(dadosComprimidos);
      return JSON.parse(dadosDescomprimidos.toString());
    }
  }
  ```

- [ ] Modificar o serviço de auditoria para usar compressão:
  ```typescript
  // src/modules/auditoria/services/auditoria.service.ts
  @Injectable()
  export class AuditoriaService {
    constructor(
      private readonly compressaoService: CompressaoService,
      // Outras dependências...
    ) {}
    
    async registrarOperacao(dados: RegistrarOperacaoDto): Promise<LogAuditoria> {
      // Comprimir dados detalhados se forem grandes
      let dadosComprimidos = null;
      if (dados.dados_detalhados && JSON.stringify(dados.dados_detalhados).length > 1000) {
        dadosComprimidos = await this.compressaoService.comprimirDados(dados.dados_detalhados);
        dados.dados_detalhados = null; // Limpar dados não comprimidos
      }
      
      const log = this.logAuditoriaRepository.create({
        ...dados,
        dados_comprimidos: dadosComprimidos
      });
      
      return this.logAuditoriaRepository.save(log);
    }
  }
  ```

## 3. Implementação de Políticas de Retenção

- [ ] Criar serviço de limpeza de logs:
  ```typescript
  // src/modules/auditoria/services/retencao.service.ts
  import { Injectable, Logger } from '@nestjs/common';
  import { Cron, CronExpression } from '@nestjs/schedule';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { LogAuditoria } from '../entities/log-auditoria.entity';
  import { ConfigService } from '@nestjs/config';

  @Injectable()
  export class RetencaoService {
    private readonly logger = new Logger(RetencaoService.name);
    
    constructor(
      @InjectRepository(LogAuditoria)
      private readonly logAuditoriaRepository: Repository<LogAuditoria>,
      private readonly configService: ConfigService
    ) {}
    
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async limparLogsAntigos() {
      try {
        const periodoRetencao = this.configService.get<number>('AUDITORIA_PERIODO_RETENCAO_DIAS', 365);
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - periodoRetencao);
        
        // Registrar operação de limpeza antes de executar
        this.logger.log(`Iniciando limpeza de logs anteriores a ${dataLimite.toISOString()}`);
        
        // Executar limpeza
        const resultado = await this.logAuditoriaRepository
          .createQueryBuilder()
          .delete()
          .where('created_at < :dataLimite', { dataLimite })
          .execute();
        
        this.logger.log(`Limpeza concluída. ${resultado.affected} registros removidos.`);
      } catch (error) {
        this.logger.error(`Erro ao limpar logs antigos: ${error.message}`, error.stack);
      }
    }
  }
  ```

- [ ] Adicionar configuração para período de retenção:
  ```typescript
  // src/config/configuration.ts
  export default () => ({
    // Outras configurações...
    auditoria: {
      periodoRetencaoDias: parseInt(process.env.AUDITORIA_PERIODO_RETENCAO_DIAS, 10) || 365,
      tiposOperacaoSensitivos: (process.env.AUDITORIA_TIPOS_OPERACAO_SENSITIVOS || 'DELETE,UPDATE').split(','),
    }
  });
  ```

- [ ] Implementar exportação de logs antigos antes da exclusão:
  ```typescript
  async exportarLogsAntesExclusao(dataLimite: Date): Promise<string> {
    const nomeArquivo = `auditoria_export_${format(dataLimite, 'yyyy-MM-dd')}.json.gz`;
    const caminho = path.join(this.configService.get('EXPORT_PATH', './exports'), nomeArquivo);
    
    // Buscar logs em lotes para evitar sobrecarga de memória
    let pagina = 0;
    const tamanhoPagina = 1000;
    let totalExportado = 0;
    
    // Criar stream de escrita comprimido
    const outputStream = fs.createWriteStream(caminho);
    const gzip = zlib.createGzip();
    const writeStream = gzip.pipe(outputStream);
    
    writeStream.write('[');
    
    let primeiroLote = true;
    
    while (true) {
      const logs = await this.logAuditoriaRepository.find({
        where: { created_at: LessThan(dataLimite) },
        skip: pagina * tamanhoPagina,
        take: tamanhoPagina,
        order: { created_at: 'ASC' }
      });
      
      if (logs.length === 0) {
        break;
      }
      
      for (const log of logs) {
        // Descomprimir dados se necessário
        if (log.dados_comprimidos) {
          log.dados_detalhados = await this.compressaoService.descomprimirDados(log.dados_comprimidos);
          delete log.dados_comprimidos;
        }
        
        if (!primeiroLote || logs.indexOf(log) > 0) {
          writeStream.write(',');
        }
        
        writeStream.write(JSON.stringify(log));
        primeiroLote = false;
      }
      
      totalExportado += logs.length;
      pagina++;
    }
    
    writeStream.write(']');
    writeStream.end();
    
    return new Promise((resolve, reject) => {
      outputStream.on('finish', () => {
        this.logger.log(`Exportação concluída: ${totalExportado} registros exportados para ${caminho}`);
        resolve(caminho);
      });
      
      outputStream.on('error', (error) => {
        this.logger.error(`Erro na exportação: ${error.message}`);
        reject(error);
      });
    });
  }
  ```

## 4. Implementação de Proteção Contra Adulteração

- [ ] Adicionar campo para hash de integridade:
  ```typescript
  @Column({ 
    type: 'varchar', 
    length: 64, 
    comment: 'Hash SHA-256 para verificação de integridade'
  })
  hash_integridade: string;
  ```

- [ ] Implementar serviço de integridade:
  ```typescript
  // src/modules/auditoria/services/integridade.service.ts
  import { Injectable } from '@nestjs/common';
  import * as crypto from 'crypto';

  @Injectable()
  export class IntegridadeService {
    private readonly chaveSecreta: string;
    
    constructor(private readonly configService: ConfigService) {
      this.chaveSecreta = this.configService.get<string>('AUDITORIA_CHAVE_HMAC', 'chave-secreta-padrao');
    }
    
    gerarHashIntegridade(log: Partial<LogAuditoria>): string {
      // Criar cópia dos dados sem o próprio hash
      const dadosParaHash = { ...log };
      delete dadosParaHash.hash_integridade;
      
      // Ordenar as chaves para garantir consistência
      const dadosOrdenados = this.ordenarChavesObjeto(dadosParaHash);
      
      // Gerar HMAC usando a chave secreta
      return crypto
        .createHmac('sha256', this.chaveSecreta)
        .update(JSON.stringify(dadosOrdenados))
        .digest('hex');
    }
    
    verificarIntegridade(log: LogAuditoria): boolean {
      const hashArmazenado = log.hash_integridade;
      const hashCalculado = this.gerarHashIntegridade(log);
      
      return hashArmazenado === hashCalculado;
    }
    
    private ordenarChavesObjeto(obj: any): any {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }
      
      if (Array.isArray(obj)) {
        return obj.map(item => this.ordenarChavesObjeto(item));
      }
      
      return Object.keys(obj)
        .sort()
        .reduce((resultado, chave) => {
          resultado[chave] = this.ordenarChavesObjeto(obj[chave]);
          return resultado;
        }, {});
    }
  }
  ```

- [ ] Modificar o serviço de auditoria para usar verificação de integridade:
  ```typescript
  async registrarOperacao(dados: RegistrarOperacaoDto): Promise<LogAuditoria> {
    // Código existente...
    
    // Gerar hash de integridade antes de salvar
    log.hash_integridade = this.integridadeService.gerarHashIntegridade(log);
    
    return this.logAuditoriaRepository.save(log);
  }

  async verificarIntegridadeLogs(): Promise<{ total: number; integros: number; adulterados: number }> {
    const resultado = { total: 0, integros: 0, adulterados: 0 };
    
    // Verificar em lotes para evitar sobrecarga de memória
    let pagina = 0;
    const tamanhoPagina = 1000;
    
    while (true) {
      const logs = await this.logAuditoriaRepository.find({
        skip: pagina * tamanhoPagina,
        take: tamanhoPagina
      });
      
      if (logs.length === 0) {
        break;
      }
      
      resultado.total += logs.length;
      
      for (const log of logs) {
        if (this.integridadeService.verificarIntegridade(log)) {
          resultado.integros++;
        } else {
          resultado.adulterados++;
          this.logger.warn(`Log adulterado detectado: ID ${log.id}`);
        }
      }
      
      pagina++;
    }
    
    return resultado;
  }
  ```

## 5. Implementação de Consultas Otimizadas

- [ ] Criar DTOs para filtros de consulta:
  ```typescript
  // src/modules/auditoria/dto/filtro-auditoria.dto.ts
  import { IsOptional, IsDateString, IsEnum, IsUUID, IsString } from 'class-validator';
  import { TipoOperacao } from '../entities/log-auditoria.entity';

  export class FiltroAuditoriaDto {
    @IsOptional()
    @IsDateString()
    dataInicio?: string;
    
    @IsOptional()
    @IsDateString()
    dataFim?: string;
    
    @IsOptional()
    @IsEnum(TipoOperacao, { each: true })
    tiposOperacao?: TipoOperacao[];
    
    @IsOptional()
    @IsString()
    entidadeAfetada?: string;
    
    @IsOptional()
    @IsUUID(4)
    usuarioId?: string;
    
    @IsOptional()
    @IsString()
    ipOrigem?: string;
    
    @IsOptional()
    @IsString()
    termo?: string;
  }
  ```

- [ ] Implementar método de consulta otimizado:
  ```typescript
  async consultarLogs(
    filtros: FiltroAuditoriaDto,
    paginacao: { pagina: number; itensPorPagina: number }
  ): Promise<{ dados: LogAuditoria[]; total: number; paginas: number }> {
    const queryBuilder = this.logAuditoriaRepository.createQueryBuilder('log');
    
    // Aplicar filtros
    if (filtros.dataInicio) {
      queryBuilder.andWhere('log.created_at >= :dataInicio', { 
        dataInicio: new Date(filtros.dataInicio) 
      });
    }
    
    if (filtros.dataFim) {
      queryBuilder.andWhere('log.created_at <= :dataFim', { 
        dataFim: new Date(filtros.dataFim) 
      });
    }
    
    if (filtros.tiposOperacao && filtros.tiposOperacao.length > 0) {
      queryBuilder.andWhere('log.tipo_operacao IN (:...tiposOperacao)', { 
        tiposOperacao: filtros.tiposOperacao 
      });
    }
    
    if (filtros.entidadeAfetada) {
      queryBuilder.andWhere('log.entidade_afetada = :entidadeAfetada', { 
        entidadeAfetada: filtros.entidadeAfetada 
      });
    }
    
    if (filtros.usuarioId) {
      queryBuilder.andWhere('log.usuario_id = :usuarioId', { 
        usuarioId: filtros.usuarioId 
      });
    }
    
    if (filtros.ipOrigem) {
      queryBuilder.andWhere('log.ip_origem = :ipOrigem', { 
        ipOrigem: filtros.ipOrigem 
      });
    }
    
    if (filtros.termo) {
      queryBuilder.andWhere(
        '(log.descricao ILIKE :termo OR log.entidade_afetada ILIKE :termo OR log.id_entidade ILIKE :termo)',
        { termo: `%${filtros.termo}%` }
      );
    }
    
    // Contar total antes de aplicar paginação
    const total = await queryBuilder.getCount();
    
    // Aplicar paginação
    queryBuilder
      .orderBy('log.created_at', 'DESC')
      .skip((paginacao.pagina - 1) * paginacao.itensPorPagina)
      .take(paginacao.itensPorPagina);
    
    // Incluir relações
    queryBuilder.leftJoinAndSelect('log.usuario', 'usuario');
    
    // Executar consulta
    const dados = await queryBuilder.getMany();
    
    // Descomprimir dados se necessário
    for (const log of dados) {
      if (log.dados_comprimidos) {
        try {
          log.dados_detalhados = await this.compressaoService.descomprimirDados(log.dados_comprimidos);
        } catch (error) {
          this.logger.error(`Erro ao descomprimir dados: ${error.message}`, error.stack);
          log.dados_detalhados = { erro: 'Falha ao descomprimir dados' };
        }
      }
    }
    
    return {
      dados,
      total,
      paginas: Math.ceil(total / paginacao.itensPorPagina)
    };
  }
  ```

- [ ] Implementar endpoint para consulta:
  ```typescript
  // src/modules/auditoria/controllers/auditoria.controller.ts
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'Consultar logs de auditoria' })
  @ApiQuery({ name: 'pagina', required: false, type: Number })
  @ApiQuery({ name: 'itensPorPagina', required: false, type: Number })
  @ApiQuery({ name: 'dataInicio', required: false, type: String })
  @ApiQuery({ name: 'dataFim', required: false, type: String })
  @ApiQuery({ name: 'tiposOperacao', required: false, type: [String] })
  @ApiQuery({ name: 'entidadeAfetada', required: false, type: String })
  @ApiQuery({ name: 'usuarioId', required: false, type: String })
  @ApiQuery({ name: 'ipOrigem', required: false, type: String })
  @ApiQuery({ name: 'termo', required: false, type: String })
  async consultarLogs(
    @Query('pagina', new DefaultValuePipe(1), ParseIntPipe) pagina: number,
    @Query('itensPorPagina', new DefaultValuePipe(20), ParseIntPipe) itensPorPagina: number,
    @Query() filtros: FiltroAuditoriaDto
  ) {
    return this.auditoriaService.consultarLogs(
      filtros,
      { pagina, itensPorPagina }
    );
  }
  ```

## 6. Implementação de Exportação de Logs

- [ ] Criar serviço de exportação:
  ```typescript
  // src/modules/auditoria/services/exportacao.service.ts
  import { Injectable, Logger } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { LogAuditoria } from '../entities/log-auditoria.entity';
  import { FiltroAuditoriaDto } from '../dto/filtro-auditoria.dto';
  import * as fs from 'fs';
  import * as path from 'path';
  import * as ExcelJS from 'exceljs';
  import * as PDFDocument from 'pdfkit';
  import { format } from 'date-fns';
  import { ptBR } from 'date-fns/locale';

  @Injectable()
  export class ExportacaoService {
    private readonly logger = new Logger(ExportacaoService.name);
    
    constructor(
      @InjectRepository(LogAuditoria)
      private readonly logAuditoriaRepository: Repository<LogAuditoria>,
      private readonly compressaoService: CompressaoService,
      private readonly configService: ConfigService
    ) {}
    
    async exportarLogs(
      filtros: FiltroAuditoriaDto,
      formato: 'excel' | 'pdf' | 'json'
    ): Promise<{ arquivo: string; caminho: string }> {
      // Buscar logs com os filtros aplicados
      const queryBuilder = this.logAuditoriaRepository.createQueryBuilder('log');
      
      // Aplicar filtros (mesmo código da consulta)
      // ...
      
      // Incluir relações
      queryBuilder
        .leftJoinAndSelect('log.usuario', 'usuario')
        .orderBy('log.created_at', 'DESC');
      
      const logs = await queryBuilder.getMany();
      
      // Descomprimir dados se necessário
      for (const log of logs) {
        if (log.dados_comprimidos) {
          try {
            log.dados_detalhados = await this.compressaoService.descomprimirDados(log.dados_comprimidos);
          } catch (error) {
            this.logger.error(`Erro ao descomprimir dados: ${error.message}`, error.stack);
            log.dados_detalhados = { erro: 'Falha ao descomprimir dados' };
          }
        }
      }
      
      // Exportar no formato solicitado
      switch (formato) {
        case 'excel':
          return this.exportarExcel(logs);
        case 'pdf':
          return this.exportarPDF(logs);
        case 'json':
          return this.exportarJSON(logs);
        default:
          throw new Error(`Formato de exportação não suportado: ${formato}`);
      }
    }
    
    // Implementações dos métodos de exportação
    // ...
  }
  ```

- [ ] Implementar endpoint para exportação:
  ```typescript
  @Post('exportar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'Exportar logs de auditoria' })
  @ApiBody({ type: ExportacaoDto })
  @ApiResponse({ status: 200, description: 'Arquivo gerado com sucesso' })
  async exportarLogs(
    @Body() dados: ExportacaoDto,
    @Res() res: Response
  ) {
    const resultado = await this.exportacaoService.exportarLogs(
      dados.filtros,
      dados.formato
    );
    
    // Configurar cabeçalhos para download
    res.setHeader('Content-Disposition', `attachment; filename=${resultado.arquivo}`);
    
    // Definir tipo de conteúdo baseado no formato
    switch (dados.formato) {
      case 'excel':
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        break;
      case 'pdf':
        res.setHeader('Content-Type', 'application/pdf');
        break;
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        break;
    }
    
    // Enviar arquivo
    const fileStream = fs.createReadStream(resultado.caminho);
    fileStream.pipe(res);
  }
  ```

## 7. Implementação de Dashboards e Relatórios

- [ ] Criar serviço de estatísticas:
  ```typescript
  // src/modules/auditoria/services/estatisticas.service.ts
  import { Injectable } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { LogAuditoria } from '../entities/log-auditoria.entity';

  @Injectable()
  export class EstatisticasService {
    constructor(
      @InjectRepository(LogAuditoria)
      private readonly logAuditoriaRepository: Repository<LogAuditoria>
    ) {}
    
    async obterEstatisticasPorPeriodo(dataInicio: Date, dataFim: Date) {
      // Total de operações por tipo
      const operacoesPorTipo = await this.logAuditoriaRepository
        .createQueryBuilder('log')
        .select('log.tipo_operacao', 'tipo')
        .addSelect('COUNT(*)', 'total')
        .where('log.created_at BETWEEN :dataInicio AND :dataFim', { dataInicio, dataFim })
        .groupBy('log.tipo_operacao')
        .getRawMany();
      
      // Total de operações por entidade
      const operacoesPorEntidade = await this.logAuditoriaRepository
        .createQueryBuilder('log')
        .select('log.entidade_afetada', 'entidade')
        .addSelect('COUNT(*)', 'total')
        .where('log.created_at BETWEEN :dataInicio AND :dataFim', { dataInicio, dataFim })
        .groupBy('log.entidade_afetada')
        .orderBy('total', 'DESC')
        .limit(10)
        .getRawMany();
      
      // Total de operações por usuário
      const operacoesPorUsuario = await this.logAuditoriaRepository
        .createQueryBuilder('log')
        .select('usuario.nome', 'usuario')
        .addSelect('COUNT(*)', 'total')
        .leftJoin('log.usuario', 'usuario')
        .where('log.created_at BETWEEN :dataInicio AND :dataFim', { dataInicio, dataFim })
        .groupBy('usuario.nome')
        .orderBy('total', 'DESC')
        .limit(10)
        .getRawMany();
      
      // Operações por hora do dia
      const operacoesPorHora = await this.logAuditoriaRepository
        .createQueryBuilder('log')
        .select('EXTRACT(HOUR FROM log.created_at)', 'hora')
        .addSelect('COUNT(*)', 'total')
        .where('log.created_at BETWEEN :dataInicio AND :dataFim', { dataInicio, dataFim })
        .groupBy('hora')
        .orderBy('hora', 'ASC')
        .getRawMany();
      
      return {
        operacoesPorTipo,
        operacoesPorEntidade,
        operacoesPorUsuario,
        operacoesPorHora
      };
    }
  }
  ```

- [ ] Implementar endpoint para estatísticas:
  ```typescript
  @Get('estatisticas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'Obter estatísticas de auditoria' })
  @ApiQuery({ name: 'dataInicio', required: true, type: String })
  @ApiQuery({ name: 'dataFim', required: true, type: String })
  async obterEstatisticas(
    @Query('dataInicio') dataInicio: string,
    @Query('dataFim') dataFim: string
  ) {
    return this.estatisticasService.obterEstatisticasPorPeriodo(
      new Date(dataInicio),
      new Date(dataFim)
    );
  }
  ```