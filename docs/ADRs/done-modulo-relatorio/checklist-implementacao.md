# Checklist de Implementação para o Módulo de Relatório

## 1. Consolidação dos Módulos de Relatório

- [ ] Criar novo módulo `relatorios-unificado`:
  ```typescript
  // src/modules/relatorios-unificado/relatorios-unificado.module.ts
  import { Module } from '@nestjs/common';
  import { TypeOrmModule } from '@nestjs/typeorm';
  import { RelatoriosController } from './controllers/relatorios.controller';
  import { RelatoriosService } from './services/relatorios.service';
  import { Solicitacao } from '../solicitacao/entities/solicitacao.entity';
  import { Unidade } from '../unidade/entities/unidade.entity';
  import { TipoBeneficio } from '../beneficio/entities/tipo-beneficio.entity';

  @Module({
    imports: [
      TypeOrmModule.forFeature([Solicitacao, Unidade, TipoBeneficio]),
    ],
    controllers: [RelatoriosController],
    providers: [RelatoriosService],
    exports: [RelatoriosService],
  })
  export class RelatoriosUnificadoModule {}
  ```

- [ ] Migrar funcionalidades do módulo `relatorio`
- [ ] Verificar e migrar funcionalidades do módulo `relatorios`
- [ ] Atualizar referências em outros módulos
- [ ] Remover módulos antigos após migração completa

## 2. Refatoração usando Padrões de Design

- [ ] Definir interfaces para estratégias de relatório:
  ```typescript
  // src/modules/relatorios-unificado/interfaces/relatorio-strategy.interface.ts
  export interface RelatorioStrategy {
    gerar(tipo: string, dados: any, opcoes: any): Promise<Buffer | string>;
    getMimeType(): string;
    getExtensao(): string;
  }
  ```

- [ ] Implementar estratégias para diferentes formatos:
  ```typescript
  // src/modules/relatorios-unificado/strategies/pdf.strategy.ts
  import { Injectable } from '@nestjs/common';
  import { RelatorioStrategy } from '../interfaces/relatorio-strategy.interface';
  import * as PDFDocument from 'pdfkit';

  @Injectable()
  export class PdfStrategy implements RelatorioStrategy {
    async gerar(tipo: string, dados: any, opcoes: any): Promise<Buffer> {
      // Implementação da geração de PDF
      // ...
      return buffer;
    }

    getMimeType(): string {
      return 'application/pdf';
    }

    getExtensao(): string {
      return 'pdf';
    }
  }
  ```

- [ ] Implementar serviço refatorado usando padrão Strategy:
  ```typescript
  // src/modules/relatorios-unificado/services/relatorios.service.ts
  import { Injectable } from '@nestjs/common';
  import { RelatorioStrategy } from '../interfaces/relatorio-strategy.interface';
  import { PdfStrategy } from '../strategies/pdf.strategy';
  import { ExcelStrategy } from '../strategies/excel.strategy';
  import { CsvStrategy } from '../strategies/csv.strategy';

  @Injectable()
  export class RelatoriosService {
    private strategies: Map<string, RelatorioStrategy> = new Map();
    
    constructor() {
      this.strategies.set('pdf', new PdfStrategy());
      this.strategies.set('excel', new ExcelStrategy());
      this.strategies.set('csv', new CsvStrategy());
    }
    
    async gerarRelatorio(tipo: string, formato: string, dados: any, opcoes: any) {
      const strategy = this.strategies.get(formato);
      if (!strategy) {
        throw new Error(`Formato não suportado: ${formato}`);
      }
      
      return strategy.gerar(tipo, dados, opcoes);
    }
  }
  ```

## 3. Otimização de Consultas

- [ ] Identificar consultas complexas e de alto custo
- [ ] Criar índices para campos frequentemente usados:
  ```sql
  -- Exemplo de criação de índices
  CREATE INDEX idx_solicitacao_data_criacao ON solicitacao(created_at);
  CREATE INDEX idx_solicitacao_status ON solicitacao(status);
  CREATE INDEX idx_solicitacao_tipo_beneficio ON solicitacao(tipo_beneficio_id);
  CREATE INDEX idx_solicitacao_unidade ON solicitacao(unidade_id);
  ```

- [ ] Implementar paginação para consultas grandes:
  ```typescript
  async buscarSolicitacoesPorPeriodo(dataInicio: Date, dataFim: Date, options: { page: number, limit: number }) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    return this.solicitacaoRepository.createQueryBuilder('solicitacao')
      .where('solicitacao.created_at BETWEEN :dataInicio AND :dataFim', { dataInicio, dataFim })
      .skip(skip)
      .take(limit)
      .getMany();
  }
  ```

- [ ] Refatorar consultas para selecionar apenas campos necessários:
  ```typescript
  return this.solicitacaoRepository.createQueryBuilder('solicitacao')
    .select([
      'solicitacao.id',
      'solicitacao.protocolo',
      'solicitacao.status',
      'solicitacao.created_at',
      'cidadao.nome',
      'cidadao.cpf',
      'tipoBeneficio.nome'
    ])
    .leftJoin('solicitacao.cidadao', 'cidadao')
    .leftJoin('solicitacao.tipoBeneficio', 'tipoBeneficio')
    .where('solicitacao.created_at BETWEEN :dataInicio AND :dataFim', { dataInicio, dataFim })
    .getMany();
  ```

## 4. Implementação de Limpeza de Arquivos Temporários

- [ ] Refatorar código para usar blocos try-finally:
  ```typescript
  async gerarRelatorioPdf(dados: any): Promise<string> {
    const tempFilePath = path.join(os.tmpdir(), `relatorio-${Date.now()}.pdf`);
    
    try {
      // Gerar o arquivo PDF
      // ...
      return tempFilePath;
    } catch (error) {
      // Tratar erro
      throw error;
    } finally {
      // Programar limpeza do arquivo após um tempo
      setTimeout(() => {
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        } catch (error) {
          console.error(`Erro ao remover arquivo temporário: ${error.message}`);
        }
      }, 3600000); // 1 hora
    }
  }
  ```

- [ ] Implementar serviço de limpeza periódica:
  ```typescript
  // src/modules/relatorios-unificado/services/temp-files.service.ts
  import { Injectable, OnModuleInit } from '@nestjs/common';
  import * as fs from 'fs';
  import * as path from 'path';
  import * as os from 'os';

  @Injectable()
  export class TempFilesService implements OnModuleInit {
    private readonly tempDir = path.join(os.tmpdir(), 'pgben-relatorios');
    
    onModuleInit() {
      // Criar diretório se não existir
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
      
      // Agendar limpeza periódica
      setInterval(() => this.limparArquivosAntigos(), 3600000); // 1 hora
    }
    
    getTempFilePath(prefix: string, extension: string): string {
      return path.join(this.tempDir, `${prefix}-${Date.now()}.${extension}`);
    }
    
    limparArquivosAntigos() {
      try {
        const files = fs.readdirSync(this.tempDir);
        const now = Date.now();
        
        for (const file of files) {
          const filePath = path.join(this.tempDir, file);
          const stats = fs.statSync(filePath);
          
          // Remover arquivos com mais de 24 horas
          if (now - stats.mtimeMs > 86400000) {
            fs.unlinkSync(filePath);
          }
        }
      } catch (error) {
        console.error(`Erro ao limpar arquivos temporários: ${error.message}`);
      }
    }
  }
  ```

## 5. Implementação de Cache

- [ ] Configurar módulo de cache:
  ```typescript
  // src/app.module.ts
  import { CacheModule } from '@nestjs/common';
  
  @Module({
    imports: [
      // Outros módulos...
      CacheModule.register({
        ttl: 3600, // 1 hora
        max: 100, // máximo de 100 itens no cache
      }),
    ],
  })
  export class AppModule {}
  ```

- [ ] Implementar cache em relatórios:
  ```typescript
  // src/modules/relatorios-unificado/services/relatorios.service.ts
  import { CACHE_MANAGER, Inject } from '@nestjs/common';
  import { Cache } from 'cache-manager';

  @Injectable()
  export class RelatoriosService {
    constructor(
      @Inject(CACHE_MANAGER) private cacheManager: Cache,
      // Outras dependências...
    ) {}
    
    async gerarRelatorioBeneficiosConcedidos(options: any) {
      // Gerar chave de cache baseada nos parâmetros
      const cacheKey = `relatorio_beneficios_${options.dataInicio}_${options.dataFim}_${options.unidadeId || 'all'}_${options.tipoBeneficioId || 'all'}_${options.formato}`;
      
      // Verificar se já existe no cache
      const cachedReport = await this.cacheManager.get(cacheKey);
      if (cachedReport) {
        return cachedReport;
      }
      
      // Gerar relatório
      const report = await this.gerarRelatorioImpl(options);
      
      // Armazenar no cache
      await this.cacheManager.set(cacheKey, report, { ttl: 3600 });
      
      return report;
    }
  }
  ```

## 6. Implementação de Processamento Assíncrono

- [ ] Configurar sistema de filas:
  ```typescript
  // src/modules/relatorios-unificado/relatorios-unificado.module.ts
  import { BullModule } from '@nestjs/bull';

  @Module({
    imports: [
      // Outros imports...
      BullModule.registerQueue({
        name: 'relatorios',
      }),
    ],
    // ...
  })
  export class RelatoriosUnificadoModule {}
  ```

- [ ] Implementar processador de filas:
  ```typescript
  // src/modules/relatorios-unificado/processors/relatorio.processor.ts
  import { Process, Processor } from '@nestjs/bull';
  import { Job } from 'bull';

  @Processor('relatorios')
  export class RelatorioProcessor {
    constructor(private readonly relatoriosService: RelatoriosService) {}
    
    @Process('gerar-relatorio')
    async handleGerarRelatorio(job: Job) {
      const { tipo, formato, dados, opcoes, userId } = job.data;
      
      try {
        const resultado = await this.relatoriosService.gerarRelatorioImpl(tipo, formato, dados, opcoes);
        
        // Notificar usuário
        await this.notificacaoService.enviarNotificacao({
          destinatario_id: userId,
          titulo: 'Relatório Pronto',
          conteudo: `Seu relatório ${tipo} está pronto para download.`,
          dados: {
            relatorioId: job.id,
            tipo,
            formato
          }
        });
        
        return resultado;
      } catch (error) {
        // Registrar erro
        console.error(`Erro ao gerar relatório: ${error.message}`);
        throw error;
      }
    }
  }
  ```

- [ ] Adicionar endpoints para verificar status:
  ```typescript
  // src/modules/relatorios-unificado/controllers/relatorios.controller.ts
  @Get('status/:jobId')
  @ApiOperation({ summary: 'Verificar status do relatório' })
  async verificarStatus(@Param('jobId') jobId: string) {
    const job = await this.relatoriosQueue.getJob(jobId);
    
    if (!job) {
      throw new NotFoundException('Relatório não encontrado');
    }
    
    const state = await job.getState();
    const progress = job._progress;
    const result = job.returnvalue;
    
    return {
      id: job.id,
      state,
      progress,
      result: state === 'completed' ? result : null
    };
  }
  ```

## 7. Melhoria de Segurança

- [ ] Implementar decoradores de autorização:
  ```typescript
  // src/modules/relatorios-unificado/controllers/relatorios.controller.ts
  @Get('beneficios-concedidos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GESTOR')
  @ApiOperation({ summary: 'Gerar relatório de benefícios concedidos' })
  async gerarRelatorioBeneficiosConcedidos(
    @Query() query: RelatorioBeneficiosDto,
    @Request() req
  ) {
    // Implementação...
  }
  ```

- [ ] Melhorar validação de parâmetros:
  ```typescript
  // src/modules/relatorios-unificado/dto/relatorio-beneficios.dto.ts
  import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';

  export class RelatorioBeneficiosDto {
    @IsDateString()
    dataInicio: string;
    
    @IsDateString()
    dataFim: string;
    
    @IsOptional()
    @IsUUID(4)
    unidadeId?: string;
    
    @IsOptional()
    @IsUUID(4)
    tipoBeneficioId?: string;
    
    @IsEnum(['pdf', 'excel', 'csv'])
    formato: 'pdf' | 'excel' | 'csv';
  }
  ```

- [ ] Adicionar logs para auditoria:
  ```typescript
  // src/modules/relatorios-unificado/services/relatorios.service.ts
  async gerarRelatorioBeneficiosConcedidos(options: any, user: any) {
    // Registrar acesso
    await this.auditoriaService.registrarAcesso({
      usuario_id: user.id,
      entidade_afetada: 'Relatorio',
      operacao: 'ACESSO',
      descricao: `Geração de relatório de benefícios concedidos (${options.formato})`,
      dados: {
        dataInicio: options.dataInicio,
        dataFim: options.dataFim,
        unidadeId: options.unidadeId,
        tipoBeneficioId: options.tipoBeneficioId,
        formato: options.formato
      }
    });
    
    // Implementação...
  }
  ```

## 8. Documentação Swagger

- [ ] Adicionar decoradores Swagger:
  ```typescript
  // src/modules/relatorios-unificado/controllers/relatorios.controller.ts
  @ApiTags('Relatórios')
  @Controller('relatorios')
  export class RelatoriosController {
    @Get('beneficios-concedidos')
    @ApiOperation({ summary: 'Gerar relatório de benefícios concedidos' })
    @ApiQuery({ name: 'dataInicio', required: true, description: 'Data inicial (YYYY-MM-DD)' })
    @ApiQuery({ name: 'dataFim', required: true, description: 'Data final (YYYY-MM-DD)' })
    @ApiQuery({ name: 'unidadeId', required: false, description: 'ID da unidade' })
    @ApiQuery({ name: 'tipoBeneficioId', required: false, description: 'ID do tipo de benefício' })
    @ApiQuery({ name: 'formato', required: true, enum: ['pdf', 'excel', 'csv'], description: 'Formato do relatório' })
    @ApiResponse({ status: 200, description: 'Relatório gerado com sucesso' })
    @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    async gerarRelatorioBeneficiosConcedidos(
      @Query() query: RelatorioBeneficiosDto,
      @Request() req
    ) {
      // Implementação...
    }
  }
  ```
