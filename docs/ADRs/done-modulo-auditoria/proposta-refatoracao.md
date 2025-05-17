### Proposta de Refatoração para o  

Podemos criar a seguinte estrutura:

1. **Interfaces/Enums comuns** - Mantidos em um arquivo compartilhado
2. **Classe base de exportação** - Contendo métodos utilitários comuns
3. **Classes específicas por formato** - Uma para cada tipo de exportação

### 1. Criação de Diretório e Estrutura

```
src/
└── auditoria/
    └── exportacao/
        ├── index.ts                         # Exporta todos os componentes
        ├── interfaces.ts                    # Interfaces e enums comuns
        ├── base-exportador.service.ts       # Classe base com métodos comuns
        ├── exportadores/                    # Pasta para implementações específicas
        │   ├── json-exportador.service.ts   # Exportador JSON
        │   ├── csv-exportador.service.ts    # Exportador CSV
        │   ├── excel-exportador.service.ts  # Exportador Excel (para futuro)
        │   └── pdf-exportador.service.ts    # Exportador PDF (para futuro)
        └── auditoria-exportacao.service.ts  # Serviço principal que coordena
```

### 2. Implementação de Arquivos

#### `interfaces.ts`

```typescript
export enum FormatoExportacao {
  /** Formato JSON (JavaScript Object Notation) */
  JSON = 'json',
  /** Formato CSV (Comma-Separated Values) */
  CSV = 'csv',
  // Formatos adiados para versões futuras
  // EXCEL = 'xlsx',
  // PDF = 'pdf',
}

export interface OpcoesExportacao {
  /**
   * Formato de exportação
   */
  formato: FormatoExportacao;

  /**
   * Caminho para salvar o arquivo (opcional)
   * Se não for fornecido, será usado o diretório padrão
   */
  caminho?: string;

  /**
   * Nome do arquivo (opcional)
   * Se não for fornecido, será gerado automaticamente
   */
  nomeArquivo?: string;

  /**
   * Indica se o arquivo deve ser comprimido
   */
  comprimido?: boolean;

  /**
   * Campos a serem incluídos na exportação
   * Se não for fornecido, todos os campos serão incluídos
   */
  campos?: string[];
}

export interface ResultadoExportacao {
  /** Caminho completo do arquivo gerado */
  caminhoArquivo: string;
  /** Quantidade de registros exportados */
  registrosExportados: number;
  /** Tamanho do arquivo em bytes */
  tamanhoArquivo: number;
  /** Data e hora da exportação */
  dataHora: Date;
  /** Formato da exportação */
  formato: FormatoExportacao;
}
```

#### `base-exportador.service.ts`

```typescript
import { Logger, ForbiddenException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as sanitizeFilename from 'sanitize-filename';
import { format } from 'date-fns';
import { FormatoExportacao } from './interfaces';

export abstract class BaseExportadorService {
  protected readonly logger = new Logger(this.constructor.name);
  protected readonly TIMEOUT_EXPORTACAO = 5 * 60 * 1000; // 5 minutos
  
  constructor(
    protected readonly diretorioExportacao: string,
    protected readonly TAMANHO_MAXIMO_ARQUIVO: number
  ) {}

  /**
   * Sanitiza os dados antes da exportação para evitar injeção de código
   */
  protected sanitizarDadosParaExportacao(dados: unknown[]): unknown[] {
    // Validação de entrada
    if (!Array.isArray(dados)) {
      this.logger.warn('Dados fornecidos não são um array. Retornando array vazio.');
      return [];
    }

    try {
      // Função auxiliar para sanitizar valores recursivamente
      const sanitizeValue = (val: unknown): unknown => {
        if (val === null || val === undefined) {
          return val;
        }
        
        if (Array.isArray(val)) {
          return val.map(sanitizeValue);
        }
        
        if (typeof val === 'object') {
          return Object.entries(val).reduce((acc, [k, v]) => {
            // Remover propriedades potencialmente perigosas
            if (!k.startsWith('__') && k !== 'constructor' && k !== 'prototype') {
              acc[k] = sanitizeValue(v);
            }
            return acc;
          }, {} as Record<string, unknown>);
        }
        
        if (typeof val === 'string') {
          // Remover caracteres de controle e caracteres potencialmente perigosos
          return val
            .replace(/[\x00-\x1F\x7F-\x9F\uFFFD]/g, '')
            .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remover caracteres de largura zero
        }
        
        return val;
      };

      return dados
        .map((item, index) => {
          try {
            if (!item || typeof item !== 'object') {
              return item;
            }
            
            // Converter para JSON e de volta para remover funções e referências circulares
            const safeItem = JSON.parse(JSON.stringify(item));
            return sanitizeValue(safeItem);
          } catch (error) {
            this.logger.warn(
              `Erro ao sanitizar item ${index}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
            );
            return null;
          }
        })
        .filter(item => item !== null);
    } catch (error) {
      this.logger.error(
        `Erro crítico ao sanitizar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
      return [];
    }
  }

  /**
   * Gera um nome de arquivo seguro para exportação
   */
  protected gerarNomeArquivo(formato: FormatoExportacao, nomeArquivo?: string, comprimido?: boolean): string {
    let nomeBase: string;
    
    if (nomeArquivo) {
      // Sanitizar o nome do arquivo para evitar path traversal
      nomeBase = sanitizeFilename(nomeArquivo, { replacement: '_' });
      
      // Remover a extensão se existir
      const ext = path.extname(nomeBase);
      if (ext) {
        nomeBase = nomeBase.slice(0, -ext.length);
      }
    } else {
      // Gerar nome baseado na data/hora
      const dataHora = format(new Date(), 'yyyyMMdd-HHmmss');
      nomeBase = `auditoria-${dataHora}`;
    }
    
    // Adicionar a extensão correta baseada no formato
    const extensao = formato;
    const nomeFinal = `${nomeBase}.${extensao}${comprimido ? '.gz' : ''}`;
    
    // Validar o nome do arquivo final
    if (!/^[\w\-. ]+$/.test(nomeFinal)) {
      throw new Error('Nome de arquivo inválido');
    }
    
    return nomeFinal;
  }

  /**
   * Valida se o caminho do arquivo é seguro para escrita
   */
  protected validarCaminhoArquivo(caminhoArquivo: string): string {
    try {
      // Normalizar o caminho para resolver ../ e ./
      const caminhoNormalizado = path.normalize(caminhoArquivo);
      
      // Resolver o caminho absoluto
      const caminhoAbsoluto = path.resolve(caminhoNormalizado);
      
      // Verificar se o caminho está dentro do diretório de exportação
      const diretorioExportacaoAbsoluto = path.resolve(this.diretorioExportacao);
      
      if (!caminhoAbsoluto.startsWith(diretorioExportacaoAbsoluto)) {
        throw new ForbiddenException('Caminho do arquivo não permitido');
      }
      
      // Verificar se o caminho contém tentativas de path traversal
      if (caminhoNormalizado.includes('..') || path.isAbsolute(caminhoNormalizado) && 
          !caminhoNormalizado.startsWith(diretorioExportacaoAbsoluto)) {
        throw new ForbiddenException('Caminho do arquivo inválido');
      }
      
      // Verificar se o diretório pai existe ou criá-lo
      const diretorioPai = path.dirname(caminhoAbsoluto);
      if (!fs.existsSync(diretorioPai)) {
        fs.mkdirSync(diretorioPai, { recursive: true, mode: 0o755 });
      }
      
      // Verificar permissões de escrita
      try {
        fs.accessSync(diretorioPai, fs.constants.W_OK);
      } catch {
        throw new ForbiddenException('Sem permissão para escrever no diretório de destino');
      }
      
      return caminhoAbsoluto;
      
    } catch (error) {
      this.logger.error(`Erro ao validar caminho do arquivo: ${error.message}`, error.stack);
      throw new ForbiddenException(`Caminho do arquivo inválido: ${error.message}`);
    }
  }

  /**
   * Estima o tamanho aproximado do arquivo de exportação
   */
  protected estimarTamanhoArquivo(dados: unknown[]): number {
    try {
      // Usa uma amostra para estimar o tamanho total
      const tamanhoAmostra = Math.min(100, dados.length);
      if (tamanhoAmostra === 0) return 0;
      
      const amostra = dados.slice(0, tamanhoAmostra);
      const tamanhoStringificado = JSON.stringify(amostra).length;
      
      // Estimar o tamanho total baseado na proporção
      return Math.ceil((tamanhoStringificado / tamanhoAmostra) * dados.length);
    } catch (error) {
      this.logger.warn(`Erro ao estimar tamanho do arquivo: ${error.message}`);
      return 0; // Se não for possível estimar, retorna 0
    }
  }
}
```

Posso continuar com as implementações dos outros arquivos individuais para cada formato de exportação. Essa abordagem modular teria várias vantagens:

1. **Manutenibilidade**: Código menor e mais focado é mais fácil de manter
2. **Testabilidade**: Testar classes menores é mais simples
3. **Extensibilidade**: Adicionar novos formatos de exportação (Excel, PDF) no futuro será mais fácil
4. **Responsabilidade única**: Cada classe tem uma única responsabilidade
