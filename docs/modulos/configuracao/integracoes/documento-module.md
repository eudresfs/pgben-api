# Integração com DocumentoModule

## Visão Geral

O módulo de Configuração disponibiliza serviços que podem ser utilizados pelo módulo de Documento para gerenciar templates de documentos e configurações de armazenamento. Esta documentação demonstra como implementar essa integração.

## Serviços Disponibilizados

### 1. Serviço de Templates

O `TemplateService` permite buscar e renderizar templates para documentos oficiais, formulários e relatórios.

### 2. Configurações de Armazenamento

O `IntegracaoService` fornece acesso às configurações de serviços de armazenamento (S3, local, etc.).

## Implementação da Integração

### Passo 1: Importar o Módulo de Configuração

No arquivo `documento.module.ts`, importe o módulo de Configuração:

```typescript
import { Module } from '@nestjs/common';
import { ConfiguracaoModule } from '../configuracao/configuracao.module';
import { DocumentoService } from './services/documento.service';
import { ArmazenamentoService } from './services/armazenamento.service';
// Outros imports necessários...

@Module({
  imports: [
    ConfiguracaoModule,
    // Outros módulos necessários...
  ],
  controllers: [
    // Controllers do módulo de Documento...
  ],
  providers: [
    DocumentoService,
    ArmazenamentoService,
    // Outros providers...
  ],
  exports: [
    DocumentoService,
    ArmazenamentoService,
  ]
})
export class DocumentoModule {}
```

### Passo 2: Injetar os Serviços Necessários

#### Exemplo: Serviço de Documento

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TemplateService } from '../../configuracao/services/template.service';
import { DocumentoRepository } from '../repositories/documento.repository';
import { ArmazenamentoService } from './armazenamento.service';
import { DocumentoCreateDto } from '../dtos/documento-create.dto';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class DocumentoService {
  private readonly logger = new Logger(DocumentoService.name);

  constructor(
    private readonly documentoRepository: DocumentoRepository,
    private readonly templateService: TemplateService,
    private readonly armazenamentoService: ArmazenamentoService
  ) {}

  /**
   * Gera um documento a partir de um template
   * @param codigoTemplate Código do template a ser utilizado
   * @param dados Dados para renderização do template
   * @param metadados Metadados do documento
   */
  async gerarDocumento(
    codigoTemplate: string,
    dados: any,
    metadados: DocumentoCreateDto
  ): Promise<any> {
    try {
      // Buscar o template pelo código
      const template = await this.templateService.buscarPorCodigo(codigoTemplate);
      
      if (!template) {
        throw new NotFoundException(`Template não encontrado: ${codigoTemplate}`);
      }
      
      // Renderizar o template com os dados fornecidos
      const conteudoHtml = await this.templateService.renderizar(template, dados);
      
      // Gerar PDF a partir do HTML
      const pdfBuffer = await this.gerarPDF(conteudoHtml, template.nome);
      
      // Armazenar o documento
      const caminhoArquivo = await this.armazenamentoService.armazenarDocumento(
        pdfBuffer,
        `${metadados.tipo}/${metadados.referencia_id}/${Date.now()}.pdf`
      );
      
      // Salvar registro do documento no banco de dados
      const documento = await this.documentoRepository.criar({
        ...metadados,
        caminho: caminhoArquivo,
        tamanho: pdfBuffer.length,
        formato: 'application/pdf',
        template_id: template.id
      });
      
      return documento;
    } catch (error) {
      this.logger.error(`Erro ao gerar documento: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Gera um PDF a partir de conteúdo HTML
   * @param html Conteúdo HTML
   * @param titulo Título do documento
   */
  private async gerarPDF(html: string, titulo: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Implementação simplificada - em produção, usar uma biblioteca
        // mais robusta para conversão de HTML para PDF
        const doc = new PDFDocument();
        const chunks: Buffer[] = [];
        
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));
        
        doc.fontSize(16).text(titulo, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(html.replace(/<[^>]*>/g, ''));
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
```

#### Exemplo: Serviço de Armazenamento

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { IntegracaoService } from '../../configuracao/services/integracao.service';
import { IntegracaoTipoEnum } from '../../configuracao/enums/integracao-tipo.enum';
import * as AWS from 'aws-sdk';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ArmazenamentoService {
  private readonly logger = new Logger(ArmazenamentoService.name);

  constructor(
    private readonly integracaoService: IntegracaoService
  ) {}

  /**
   * Armazena um documento no serviço de armazenamento configurado
   * @param buffer Conteúdo do documento
   * @param caminho Caminho relativo para armazenamento
   */
  async armazenarDocumento(buffer: Buffer, caminho: string): Promise<string> {
    try {
      // Obter configuração de integração para armazenamento
      const integracao = await this.integracaoService.buscarPorCodigo('storage-principal');
      
      if (!integracao || integracao.tipo !== IntegracaoTipoEnum.STORAGE || !integracao.ativo) {
        this.logger.warn('Configuração de armazenamento não encontrada ou inativa. Usando armazenamento local.');
        return this.armazenarLocal(buffer, caminho);
      }
      
      // Verificar tipo de armazenamento
      if (integracao.configuracao.tipo === 'S3') {
        return this.armazenarS3(buffer, caminho, integracao.configuracao, integracao.credenciais);
      } else if (integracao.configuracao.tipo === 'LOCAL') {
        return this.armazenarLocal(buffer, caminho, integracao.configuracao.basePath);
      } else {
        this.logger.warn(`Tipo de armazenamento não suportado: ${integracao.configuracao.tipo}. Usando armazenamento local.`);
        return this.armazenarLocal(buffer, caminho);
      }
    } catch (error) {
      this.logger.error(`Erro ao armazenar documento: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Recupera um documento do serviço de armazenamento
   * @param caminho Caminho do documento
   */
  async recuperarDocumento(caminho: string): Promise<Buffer> {
    try {
      // Obter configuração de integração para armazenamento
      const integracao = await this.integracaoService.buscarPorCodigo('storage-principal');
      
      if (!integracao || integracao.tipo !== IntegracaoTipoEnum.STORAGE || !integracao.ativo) {
        this.logger.warn('Configuração de armazenamento não encontrada ou inativa. Usando armazenamento local.');
        return this.recuperarLocal(caminho);
      }
      
      // Verificar tipo de armazenamento
      if (integracao.configuracao.tipo === 'S3') {
        return this.recuperarS3(caminho, integracao.configuracao, integracao.credenciais);
      } else if (integracao.configuracao.tipo === 'LOCAL') {
        return this.recuperarLocal(caminho, integracao.configuracao.basePath);
      } else {
        this.logger.warn(`Tipo de armazenamento não suportado: ${integracao.configuracao.tipo}. Usando armazenamento local.`);
        return this.recuperarLocal(caminho);
      }
    } catch (error) {
      this.logger.error(`Erro ao recuperar documento: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Armazena um documento no Amazon S3
   */
  private async armazenarS3(buffer: Buffer, caminho: string, config: any, credenciais: any): Promise<string> {
    // Configurar cliente S3
    const s3 = new AWS.S3({
      region: config.region,
      accessKeyId: credenciais.accessKeyId,
      secretAccessKey: credenciais.secretAccessKey
    });
    
    // Fazer upload do arquivo
    await s3.upload({
      Bucket: config.bucket,
      Key: caminho,
      Body: buffer,
      ACL: config.acl || 'private',
      ContentType: this.determinarContentType(caminho)
    }).promise();
    
    // Retornar URL do arquivo
    return `${config.baseUrl || ''}${caminho}`;
  }

  /**
   * Recupera um documento do Amazon S3
   */
  private async recuperarS3(caminho: string, config: any, credenciais: any): Promise<Buffer> {
    // Configurar cliente S3
    const s3 = new AWS.S3({
      region: config.region,
      accessKeyId: credenciais.accessKeyId,
      secretAccessKey: credenciais.secretAccessKey
    });
    
    // Extrair o nome do arquivo da URL, se necessário
    const key = caminho.startsWith(config.baseUrl)
      ? caminho.substring(config.baseUrl.length)
      : caminho;
    
    // Fazer download do arquivo
    const response = await s3.getObject({
      Bucket: config.bucket,
      Key: key
    }).promise();
    
    return response.Body as Buffer;
  }

  /**
   * Armazena um documento localmente
   */
  private async armazenarLocal(buffer: Buffer, caminho: string, basePath: string = 'uploads'): Promise<string> {
    // Criar diretório se não existir
    const fullPath = path.join(basePath, path.dirname(caminho));
    await fs.promises.mkdir(fullPath, { recursive: true });
    
    // Salvar arquivo
    const filePath = path.join(basePath, caminho);
    await fs.promises.writeFile(filePath, buffer);
    
    return filePath;
  }

  /**
   * Recupera um documento armazenado localmente
   */
  private async recuperarLocal(caminho: string, basePath: string = 'uploads'): Promise<Buffer> {
    // Se o caminho já for absoluto, usar como está
    const filePath = path.isAbsolute(caminho) ? caminho : path.join(basePath, caminho);
    
    // Ler arquivo
    return fs.promises.readFile(filePath);
  }

  /**
   * Determina o Content-Type com base na extensão do arquivo
   */
  private determinarContentType(caminho: string): string {
    const ext = path.extname(caminho).toLowerCase();
    
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png'
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }
}
```

### Passo 3: Utilizar os Serviços no Controller

```typescript
import { Controller, Post, Get, Param, Body, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentoService } from '../services/documento.service';
import { ArmazenamentoService } from '../services/armazenamento.service';
import { DocumentoCreateDto } from '../dtos/documento-create.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Response } from 'express';

@ApiTags('Documentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documentos')
export class DocumentoController {
  constructor(
    private readonly documentoService: DocumentoService,
    private readonly armazenamentoService: ArmazenamentoService
  ) {}

  @Post('gerar')
  @ApiOperation({ summary: 'Gerar documento a partir de template' })
  async gerarDocumento(
    @Body() dto: {
      template: string;
      dados: any;
      metadados: DocumentoCreateDto;
    },
    @CurrentUser() usuario
  ) {
    const documento = await this.documentoService.gerarDocumento(
      dto.template,
      dto.dados,
      {
        ...dto.metadados,
        created_by: usuario.id
      }
    );
    
    return {
      id: documento.id,
      nome: documento.nome,
      tipo: documento.tipo,
      formato: documento.formato,
      tamanho: documento.tamanho,
      data_criacao: documento.created_at
    };
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Fazer download de um documento' })
  async downloadDocumento(
    @Param('id') id: string,
    @Res() res: Response
  ) {
    // Buscar documento no banco de dados
    const documento = await this.documentoService.buscarPorId(id);
    
    // Recuperar conteúdo do documento
    const buffer = await this.armazenamentoService.recuperarDocumento(documento.caminho);
    
    // Configurar headers para download
    res.setHeader('Content-Type', documento.formato);
    res.setHeader('Content-Disposition', `attachment; filename="${documento.nome}"`);
    res.setHeader('Content-Length', buffer.length);
    
    // Enviar arquivo
    res.end(buffer);
  }
}
```

## Exemplo de Uso

### Geração de Declaração de Benefício

```typescript
// Em um serviço que precisa gerar uma declaração
import { Injectable } from '@nestjs/common';
import { DocumentoService } from '../documento/services/documento.service';

@Injectable()
export class BeneficioService {
  constructor(
    private readonly documentoService: DocumentoService
  ) {}

  async gerarDeclaracao(beneficioId: string, usuarioId: string) {
    // Buscar dados do benefício
    const beneficio = await this.buscarBeneficio(beneficioId);
    const cidadao = await this.buscarCidadao(beneficio.cidadao_id);
    
    // Gerar declaração
    const documento = await this.documentoService.gerarDocumento(
      'declaracao-beneficio',
      {
        cidadao: {
          nome: cidadao.nome,
          cpf: cidadao.cpf,
          endereco: cidadao.endereco_completo
        },
        beneficio: {
          tipo: beneficio.tipo.nome,
          numero: beneficio.numero,
          data_concessao: this.formatarData(beneficio.data_concessao),
          valor: this.formatarValor(beneficio.valor)
        },
        data_atual: this.formatarData(new Date())
      },
      {
        nome: `Declaração de Benefício - ${cidadao.nome}.pdf`,
        tipo: 'DECLARACAO',
        referencia_id: beneficioId,
        descricao: `Declaração de concessão de benefício ${beneficio.tipo.nome} para ${cidadao.nome}`,
        created_by: usuarioId
      }
    );
    
    return documento;
  }

  private async buscarBeneficio(id: string) {
    // Implementação real buscaria do banco de dados
    return {
      id,
      cidadao_id: '123',
      tipo: { id: '1', nome: 'Auxílio Moradia' },
      numero: '2025.0001',
      data_concessao: new Date('2025-05-10'),
      valor: 500.0
    };
  }

  private async buscarCidadao(id: string) {
    // Implementação real buscaria do banco de dados
    return {
      id,
      nome: 'Maria Silva',
      cpf: '123.456.789-00',
      endereco_completo: 'Rua das Flores, 123 - Centro, Natal/RN'
    };
  }

  private formatarData(data: Date): string {
    return data.toLocaleDateString('pt-BR');
  }

  private formatarValor(valor: number): string {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
```

## Considerações de Implementação

1. **Segurança**: Implemente controle de acesso para documentos sensíveis.
2. **Versionamento**: Considere implementar versionamento de documentos.
3. **Assinatura Digital**: Para documentos oficiais, considere integrar com serviços de assinatura digital.
4. **Cache**: Implemente cache para documentos frequentemente acessados.
5. **Backup**: Garanta que haja uma estratégia de backup para os documentos armazenados.
