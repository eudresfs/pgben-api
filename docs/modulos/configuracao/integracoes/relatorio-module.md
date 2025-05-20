# Integração com RelatorioModule

## Visão Geral

O módulo de Configuração disponibiliza serviços que podem ser utilizados pelo módulo de Relatório para gerenciar templates de relatórios e configurações de formatação. Esta documentação demonstra como implementar essa integração.

## Serviços Disponibilizados

### 1. Serviço de Templates

O `TemplateService` permite buscar e renderizar templates para relatórios diversos.

### 2. Serviço de Parâmetros

O `ParametroService` fornece acesso a configurações de formatação e comportamento dos relatórios.

## Implementação da Integração

### Passo 1: Importar o Módulo de Configuração

No arquivo `relatorio.module.ts`, importe o módulo de Configuração:

```typescript
import { Module } from '@nestjs/common';
import { ConfiguracaoModule } from '../configuracao/configuracao.module';
import { RelatorioService } from './services/relatorio.service';
import { GeradorRelatorioService } from './services/gerador-relatorio.service';
// Outros imports necessários...

@Module({
  imports: [
    ConfiguracaoModule,
    // Outros módulos necessários...
  ],
  controllers: [
    // Controllers do módulo de Relatório...
  ],
  providers: [
    RelatorioService,
    GeradorRelatorioService,
    // Outros providers...
  ],
  exports: [
    RelatorioService,
  ]
})
export class RelatorioModule {}
```

### Passo 2: Injetar os Serviços Necessários

#### Exemplo: Serviço de Gerador de Relatório

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TemplateService } from '../../configuracao/services/template.service';
import { ParametroService } from '../../configuracao/services/parametro.service';
import { RelatorioRepository } from '../repositories/relatorio.repository';
import { ParametroChavesEnum } from '../../configuracao/enums/parametro-chaves.enum';
import * as PdfPrinter from 'pdfmake';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import * as ExcelJS from 'exceljs';

@Injectable()
export class GeradorRelatorioService {
  private readonly logger = new Logger(GeradorRelatorioService.name);
  private fontsDir: string;
  private logoPath: string;

  constructor(
    private readonly relatorioRepository: RelatorioRepository,
    private readonly templateService: TemplateService,
    private readonly parametroService: ParametroService
  ) {
    this.carregarConfiguracoes();
  }

  /**
   * Carrega as configurações para geração de relatórios
   */
  private async carregarConfiguracoes(): Promise<void> {
    try {
      // Diretório de fontes para PDF
      const paramFonts = await this.parametroService.buscarPorChave(
        ParametroChavesEnum.DIRETORIO_FONTES_RELATORIO
      );
      
      this.fontsDir = paramFonts?.valor || 'assets/fonts';
      
      // Caminho do logo para relatórios
      const paramLogo = await this.parametroService.buscarPorChave(
        ParametroChavesEnum.CAMINHO_LOGO_RELATORIO
      );
      
      this.logoPath = paramLogo?.valor || 'assets/images/logo.png';
      
      this.logger.log(`Configurações carregadas: fontes=${this.fontsDir}, logo=${this.logoPath}`);
    } catch (error) {
      this.logger.error(`Erro ao carregar configurações: ${error.message}`, error.stack);
      // Usar valores padrão em caso de erro
      this.fontsDir = 'assets/fonts';
      this.logoPath = 'assets/images/logo.png';
    }
  }

  /**
   * Gera um relatório em PDF a partir de um template
   * @param codigoTemplate Código do template a ser utilizado
   * @param dados Dados para renderização do template
   * @param metadados Metadados do relatório
   */
  async gerarRelatorioPDF(
    codigoTemplate: string,
    dados: any,
    metadados: any
  ): Promise<Buffer> {
    try {
      // Buscar o template pelo código
      const template = await this.templateService.buscarPorCodigo(codigoTemplate);
      
      if (!template) {
        throw new NotFoundException(`Template não encontrado: ${codigoTemplate}`);
      }
      
      // Renderizar o template com os dados fornecidos
      const conteudoHtml = await this.templateService.renderizar(template, dados);
      
      // Gerar PDF a partir do HTML renderizado
      const pdfBuffer = await this.gerarPDF(conteudoHtml, metadados.titulo || template.nome);
      
      // Registrar relatório gerado
      await this.relatorioRepository.registrarGeracao({
        titulo: metadados.titulo || template.nome,
        tipo: 'PDF',
        template_id: template.id,
        tamanho: pdfBuffer.length,
        parametros: JSON.stringify(dados),
        usuario_id: metadados.usuario_id,
        data: new Date()
      });
      
      return pdfBuffer;
    } catch (error) {
      this.logger.error(`Erro ao gerar relatório PDF: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Gera um relatório em Excel a partir de dados estruturados
   * @param titulo Título do relatório
   * @param colunas Definição das colunas
   * @param dados Dados para o relatório
   * @param metadados Metadados do relatório
   */
  async gerarRelatorioExcel(
    titulo: string,
    colunas: Array<{campo: string, titulo: string, largura?: number}>,
    dados: any[],
    metadados: any
  ): Promise<Buffer> {
    try {
      // Criar workbook e planilha
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(titulo);
      
      // Definir cabeçalhos
      const headers = colunas.map(col => col.titulo);
      worksheet.addRow(headers);
      
      // Estilizar cabeçalhos
      worksheet.getRow(1).font = { bold: true };
      
      // Adicionar dados
      dados.forEach(item => {
        const row = colunas.map(col => item[col.campo] || '');
        worksheet.addRow(row);
      });
      
      // Ajustar largura das colunas
      colunas.forEach((col, index) => {
        if (col.largura) {
          worksheet.getColumn(index + 1).width = col.largura;
        } else {
          worksheet.getColumn(index + 1).width = 15;
        }
      });
      
      // Gerar buffer
      const buffer = await workbook.xlsx.writeBuffer();
      
      // Registrar relatório gerado
      await this.relatorioRepository.registrarGeracao({
        titulo: titulo,
        tipo: 'EXCEL',
        tamanho: buffer.length,
        parametros: JSON.stringify({colunas, filtros: metadados.filtros}),
        usuario_id: metadados.usuario_id,
        data: new Date()
      });
      
      return buffer;
    } catch (error) {
      this.logger.error(`Erro ao gerar relatório Excel: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Gera um PDF a partir de conteúdo HTML
   * @param html Conteúdo HTML
   * @param titulo Título do documento
   */
  private async gerarPDF(html: string, titulo: string): Promise<Buffer> {
    try {
      // Carregar fontes
      const fonts = {
        Roboto: {
          normal: `${this.fontsDir}/Roboto-Regular.ttf`,
          bold: `${this.fontsDir}/Roboto-Medium.ttf`,
          italics: `${this.fontsDir}/Roboto-Italic.ttf`,
          bolditalics: `${this.fontsDir}/Roboto-MediumItalic.ttf`
        }
      };
      
      // Configurar printer
      const printer = new PdfPrinter(fonts);
      
      // Preparar logo
      const logoBase64 = await this.carregarImagemBase64(this.logoPath);
      
      // Obter data atual formatada
      const dataAtual = new Date().toLocaleDateString('pt-BR');
      
      // Definir documento
      const docDefinition = {
        info: {
          title: titulo,
          author: 'Sistema PGBen',
          subject: titulo,
          keywords: 'pgben, relatório'
        },
        header: {
          columns: [
            { image: logoBase64, width: 100, margin: [10, 10, 0, 0] },
            { text: titulo, alignment: 'right', margin: [0, 20, 10, 0], fontSize: 14, bold: true }
          ]
        },
        footer: function(currentPage, pageCount) {
          return {
            columns: [
              { text: `Data: ${dataAtual}`, alignment: 'left', margin: [10, 0, 0, 0], fontSize: 8 },
              { text: `Página ${currentPage.toString()} de ${pageCount}`, alignment: 'right', margin: [0, 0, 10, 0], fontSize: 8 }
            ],
            margin: [10, 0]
          };
        },
        content: [
          { text: html.replace(/<[^>]*>/g, ''), margin: [0, 20, 0, 0] }
        ],
        defaultStyle: {
          font: 'Roboto',
          fontSize: 11
        }
      };
      
      // Gerar PDF
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      
      // Coletar chunks em um buffer
      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        
        pdfDoc.on('data', (chunk) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', (err) => reject(err));
        
        pdfDoc.end();
      });
    } catch (error) {
      this.logger.error(`Erro ao gerar PDF: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Carrega uma imagem como Base64
   * @param path Caminho da imagem
   */
  private async carregarImagemBase64(path: string): Promise<string> {
    try {
      // Verificar se o arquivo existe
      if (!fs.existsSync(path)) {
        this.logger.warn(`Imagem não encontrada: ${path}`);
        return ''; // Retornar string vazia se a imagem não existir
      }
      
      // Ler arquivo e converter para Base64
      const imageBuffer = await fs.promises.readFile(path);
      const base64Image = imageBuffer.toString('base64');
      
      // Obter tipo de imagem a partir da extensão
      const extensao = path.split('.').pop().toLowerCase();
      let mimeType = 'image/png'; // Padrão
      
      if (extensao === 'jpg' || extensao === 'jpeg') {
        mimeType = 'image/jpeg';
      } else if (extensao === 'gif') {
        mimeType = 'image/gif';
      }
      
      return `data:${mimeType};base64,${base64Image}`;
    } catch (error) {
      this.logger.error(`Erro ao carregar imagem: ${error.message}`, error.stack);
      return ''; // Retornar string vazia em caso de erro
    }
  }
}
```

### Passo 3: Utilizar os Serviços no Controller

```typescript
import { Controller, Post, Get, Param, Body, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RelatorioService } from '../services/relatorio.service';
import { GeradorRelatorioService } from '../services/gerador-relatorio.service';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Relatórios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('relatorios')
export class RelatorioController {
  constructor(
    private readonly relatorioService: RelatorioService,
    private readonly geradorService: GeradorRelatorioService
  ) {}

  @Post('pdf/:template')
  @ApiOperation({ summary: 'Gerar relatório em PDF' })
  async gerarRelatorioPDF(
    @Param('template') codigoTemplate: string,
    @Body() dto: any,
    @Res() res: Response,
    @CurrentUser() usuario
  ) {
    // Extrair dados e metadados
    const { dados, metadados = {} } = dto;
    
    // Adicionar usuário aos metadados
    metadados.usuario_id = usuario.id;
    
    // Gerar relatório
    const buffer = await this.geradorService.gerarRelatorioPDF(
      codigoTemplate,
      dados,
      metadados
    );
    
    // Configurar headers para download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${metadados.titulo || codigoTemplate}.pdf"`);
    res.setHeader('Content-Length', buffer.length);
    
    // Enviar arquivo
    res.end(buffer);
  }

  @Post('excel')
  @ApiOperation({ summary: 'Gerar relatório em Excel' })
  async gerarRelatorioExcel(
    @Body() dto: {
      titulo: string;
      colunas: Array<{campo: string, titulo: string, largura?: number}>;
      dados: any[];
      metadados?: any;
    },
    @Res() res: Response,
    @CurrentUser() usuario
  ) {
    // Extrair dados
    const { titulo, colunas, dados, metadados = {} } = dto;
    
    // Adicionar usuário aos metadados
    metadados.usuario_id = usuario.id;
    
    // Gerar relatório
    const buffer = await this.geradorService.gerarRelatorioExcel(
      titulo,
      colunas,
      dados,
      metadados
    );
    
    // Configurar headers para download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${titulo}.xlsx"`);
    res.setHeader('Content-Length', buffer.length);
    
    // Enviar arquivo
    res.end(buffer);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Listar templates de relatório disponíveis' })
  async listarTemplates() {
    const templates = await this.relatorioService.listarTemplates();
    
    return templates;
  }

  @Get('historico')
  @ApiOperation({ summary: 'Listar histórico de relatórios gerados' })
  async listarHistorico(
    @CurrentUser() usuario
  ) {
    const historico = await this.relatorioService.listarHistoricoUsuario(usuario.id);
    
    return historico;
  }
}
```

## Exemplo de Uso

### Geração de Relatório de Benefícios

```typescript
// Em um serviço que precisa gerar relatório de benefícios
import { Injectable } from '@nestjs/common';
import { BeneficioRepository } from '../beneficio/repositories/beneficio.repository';
import { GeradorRelatorioService } from '../relatorio/services/gerador-relatorio.service';

@Injectable()
export class RelatoriosBeneficioService {
  constructor(
    private readonly beneficioRepository: BeneficioRepository,
    private readonly geradorService: GeradorRelatorioService
  ) {}

  async gerarRelatorioBeneficios(filtros: any, formato: 'pdf' | 'excel', usuarioId: string) {
    // Buscar dados de benefícios com os filtros
    const beneficios = await this.beneficioRepository.buscarComFiltros(filtros);
    
    // Gerar título dinâmico
    const titulo = this.gerarTitulo(filtros);
    
    if (formato === 'pdf') {
      // Preparar dados para o template
      const dadosTemplate = {
        titulo,
        filtros: this.formatarFiltros(filtros),
        beneficios,
        totalRegistros: beneficios.length,
        dataGeracao: new Date().toLocaleDateString('pt-BR')
      };
      
      // Gerar PDF
      return await this.geradorService.gerarRelatorioPDF(
        'relatorio-beneficios',
        dadosTemplate,
        {
          titulo,
          usuario_id: usuarioId,
          filtros
        }
      );
    } else {
      // Definir colunas para Excel
      const colunas = [
        { campo: 'numero', titulo: 'Número', largura: 15 },
        { campo: 'tipo', titulo: 'Tipo', largura: 20 },
        { campo: 'cidadao.nome', titulo: 'Beneficiário', largura: 30 },
        { campo: 'cidadao.cpf', titulo: 'CPF', largura: 15 },
        { campo: 'dataConcessao', titulo: 'Data Concessão', largura: 15 },
        { campo: 'valor', titulo: 'Valor (R$)', largura: 15 },
        { campo: 'status', titulo: 'Status', largura: 15 }
      ];
      
      // Formatar dados para o Excel
      const dadosFormatados = beneficios.map(b => ({
        numero: b.numero,
        tipo: b.tipo.nome,
        'cidadao.nome': b.cidadao.nome,
        'cidadao.cpf': b.cidadao.cpf,
        dataConcessao: new Date(b.data_concessao).toLocaleDateString('pt-BR'),
        valor: b.valor.toFixed(2),
        status: b.status
      }));
      
      // Gerar Excel
      return await this.geradorService.gerarRelatorioExcel(
        titulo,
        colunas,
        dadosFormatados,
        {
          usuario_id: usuarioId,
          filtros
        }
      );
    }
  }

  private gerarTitulo(filtros: any): string {
    // Gerar título baseado nos filtros
    let titulo = 'Relatório de Benefícios';
    
    if (filtros.tipo) {
      titulo += ` - ${filtros.tipo}`;
    }
    
    if (filtros.status) {
      titulo += ` - ${filtros.status}`;
    }
    
    if (filtros.dataInicio && filtros.dataFim) {
      titulo += ` (${new Date(filtros.dataInicio).toLocaleDateString('pt-BR')} a ${new Date(filtros.dataFim).toLocaleDateString('pt-BR')})`;
    }
    
    return titulo;
  }

  private formatarFiltros(filtros: any): string {
    // Formatar filtros para exibição no relatório
    const filtrosFormatados = [];
    
    if (filtros.tipo) {
      filtrosFormatados.push(`Tipo: ${filtros.tipo}`);
    }
    
    if (filtros.status) {
      filtrosFormatados.push(`Status: ${filtros.status}`);
    }
    
    if (filtros.dataInicio) {
      filtrosFormatados.push(`Data Início: ${new Date(filtros.dataInicio).toLocaleDateString('pt-BR')}`);
    }
    
    if (filtros.dataFim) {
      filtrosFormatados.push(`Data Fim: ${new Date(filtros.dataFim).toLocaleDateString('pt-BR')}`);
    }
    
    return filtrosFormatados.join(' | ');
  }
}
```

## Considerações de Implementação

1. **Performance**: Para relatórios grandes, considere geração assíncrona e notificação quando prontos.
2. **Segurança**: Implemente controle de acesso para garantir que usuários só vejam relatórios autorizados.
3. **Templates Personalizados**: Permita que administradores criem e editem templates de relatório.
4. **Caching**: Implemente cache para relatórios frequentemente acessados com os mesmos parâmetros.
5. **Exportação Múltipla**: Ofereça diversos formatos de exportação (PDF, Excel, CSV) para o mesmo relatório.

## Parâmetros de Configuração

| Chave | Tipo | Descrição | Valor Padrão |
|-------|------|-----------|--------------|
| `DIRETORIO_FONTES_RELATORIO` | Texto | Diretório de fontes para geração de PDF | `assets/fonts` |
| `CAMINHO_LOGO_RELATORIO` | Texto | Caminho para o logo a ser usado nos relatórios | `assets/images/logo.png` |
| `LIMITE_REGISTROS_RELATORIO` | Número | Número máximo de registros em um relatório | `10000` |
| `FORMATO_DATA_RELATORIO` | Texto | Formato de data para exibição em relatórios | `DD/MM/YYYY` |
| `FORMATO_MOEDA_RELATORIO` | Texto | Formato de valores monetários em relatórios | `BRL` |

## Templates Disponíveis

| Código | Descrição | Formato |
|--------|-----------|---------|
| `relatorio-beneficios` | Relatório de Benefícios Concedidos | PDF |
| `relatorio-cidadaos` | Relatório de Cidadãos Cadastrados | PDF |
| `relatorio-pagamentos` | Relatório de Pagamentos Realizados | PDF |
| `relatorio-atendimentos` | Relatório de Atendimentos | PDF |
| `relatorio-auditoria` | Relatório de Auditoria | PDF |

## Melhores Práticas

1. **Tamanho de Página**: Defina tamanhos de página adequados para o tipo de relatório.
2. **Formatação Consistente**: Mantenha formatação consistente em todos os relatórios.
3. **Exporte Metadados**: Inclua metadados úteis nos arquivos exportados.
4. **Validação de Dados**: Valide os dados e parâmetros antes de gerar relatórios.
5. **Tratamento de Valores Nulos**: Defina uma representação padrão para valores nulos ou vazios.
