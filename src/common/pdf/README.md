# Módulo Comum de PDF

## Propósito

O Módulo Comum de PDF é uma solução centralizada e reutilizável para geração de documentos PDF no sistema PGBEN. Este módulo foi desenvolvido para padronizar a criação de relatórios, comprovantes e documentos oficiais, garantindo consistência visual, qualidade técnica e facilidade de manutenção.

### Objetivos Principais

- **Padronização**: Estabelecer um padrão único para geração de PDFs em todo o sistema
- **Reutilização**: Fornecer componentes reutilizáveis para diferentes tipos de documentos
- **Flexibilidade**: Permitir customização de layouts, estilos e configurações
- **Qualidade**: Garantir documentos profissionais com alta qualidade visual
- **Manutenibilidade**: Centralizar a lógica de geração de PDF para facilitar atualizações

## Funcionamento

### Arquitetura Técnica

O módulo é estruturado em camadas bem definidas:

```
src/common/pdf/
├── constants/          # Constantes e configurações padrão
├── enums/             # Enumerações para tipos e configurações
├── interfaces/        # Definições de tipos TypeScript
├── services/          # Serviços principais de geração
├── templates/         # Templates pré-definidos
└── __tests__/         # Testes unitários
```

### Componentes Principais

#### 1. Interfaces e Tipos

- **IPdfDados**: Define a estrutura completa dos dados do documento
- **IPdfConteudo**: Especifica diferentes tipos de conteúdo (texto, tabela, imagem)
- **IPdfConfiguracao**: Configurações de página, margens e layout
- **IPdfMetadados**: Metadados do documento (título, autor, data)
- **IPdfAssinatura**: Estrutura para assinaturas digitais e físicas

#### 2. Enumerações

- **PdfTipoConteudo**: TEXTO, TABELA, IMAGEM, LISTA, QUEBRA_PAGINA
- **PdfTipoAssinatura**: TECNICO, RESPONSAVEL, FISCAL, DIGITAL
- **PdfOrientacao**: PORTRAIT, LANDSCAPE
- **PdfTamanhoPapel**: A4, A3, LETTER, LEGAL

#### 3. Serviços

- **PdfCommonService**: Serviço principal para geração de PDFs
- **PdfUtilsService**: Utilitários para validação, formatação e processamento
- **PdfConfigService**: Gerenciamento de configurações e templates

### Fluxo de Geração

1. **Preparação dos Dados**: Estruturação dos dados conforme interfaces
2. **Validação**: Verificação de integridade e completude dos dados
3. **Processamento**: Conversão dos dados para formato pdfmake
4. **Geração**: Criação do documento PDF usando pdfmake
5. **Pós-processamento**: Aplicação de assinaturas e metadados

### Tecnologias Utilizadas

- **pdfmake**: Biblioteca principal para geração de PDFs
- **TypeScript**: Tipagem forte e desenvolvimento robusto
- **NestJS**: Framework para injeção de dependências e modularização
- **Jest**: Framework de testes unitários

## Integração

### Instalação e Configuração

#### 1. Importação do Módulo

```typescript
import { PdfModule } from '@common/pdf';

@Module({
  imports: [PdfModule],
  // ... outras configurações
})
export class SeuModule {}
```

#### 2. Injeção dos Serviços

```typescript
import { PdfCommonService } from '@common/pdf';

@Injectable()
export class SeuService {
  constructor(
    private readonly pdfService: PdfCommonService
  ) {}
}
```

### Uso Básico

#### Geração de Documento Simples

```typescript
import {
  IPdfDados,
  IPdfConfiguracao,
  PdfTipoConteudo,
  PdfOrientacao,
  PdfTamanhoPapel
} from '@common/pdf';

// Preparar dados do documento
const dados: IPdfDados = {
  titulo: 'Relatório Mensal',
  conteudo: [
    {
      tipo: PdfTipoConteudo.TEXTO,
      dados: 'Este é o conteúdo do relatório...',
      estilo: 'texto-padrao'
    }
  ],
  assinaturas: [
    {
      tipo: PdfTipoAssinatura.TECNICO,
      nome: 'João Silva',
      cargo: 'Técnico Responsável',
      data: new Date()
    }
  ],
  metadados: {
    titulo: 'Relatório Mensal',
    autor: 'Sistema PGBEN',
    dataCriacao: new Date()
  }
};

// Configurar layout
const configuracao: IPdfConfiguracao = {
  orientacao: PdfOrientacao.PORTRAIT,
  tamanho: PdfTamanhoPapel.A4,
  margens: [20, 15, 20, 15], // [top, right, bottom, left]
  incluirCabecalho: true,
  incluirRodape: true
};

// Gerar PDF
const resultado = await this.pdfService.gerarPdf(dados, configuracao);
```

#### Geração com Tabelas

```typescript
const dadosComTabela: IPdfDados = {
  titulo: 'Relatório com Dados Tabulares',
  conteudo: [
    {
      tipo: PdfTipoConteudo.TEXTO,
      dados: 'Dados do período:',
      estilo: 'titulo-secao'
    },
    {
      tipo: PdfTipoConteudo.TABELA,
      dados: {
        headers: ['Item', 'Quantidade', 'Valor'],
        rows: [
          ['Produto A', '10', 'R$ 100,00'],
          ['Produto B', '5', 'R$ 50,00']
        ]
      },
      estilo: 'tabela-padrao'
    }
  ],
  // ... resto da configuração
};
```

### Customização Avançada

#### Templates Personalizados

```typescript
import { PdfConfigService } from '@common/pdf';

// Criar template customizado
const templateCustomizado = {
  nome: 'relatorio-especial',
  configuracao: {
    orientacao: PdfOrientacao.LANDSCAPE,
    tamanho: PdfTamanhoPapel.A3,
    margens: [30, 20, 30, 20]
  },
  estilos: {
    'titulo-principal': {
      fontSize: 18,
      bold: true,
      color: '#2c3e50'
    },
    'texto-destaque': {
      fontSize: 12,
      italics: true,
      color: '#e74c3c'
    }
  }
};

// Registrar template
this.pdfConfigService.registrarTemplate(templateCustomizado);

// Usar template
const pdf = await this.pdfService.gerarPdfComTemplate(
  dados,
  'relatorio-especial'
);
```

#### Validação de Dados

```typescript
import { PdfUtilsService } from '@common/pdf';

// Validar dados antes da geração
const validacao = await this.pdfUtilsService.validarDadosPdf(dados);

if (!validacao.isValid) {
  throw new Error(`Dados inválidos: ${validacao.errors.join(', ')}`);
}
```

### Utilitários Disponíveis

#### Formatação de Dados

```typescript
// Formatação de moeda
const valorFormatado = this.pdfUtilsService.formatarMoeda(1234.56);
// Resultado: "R$ 1.234,56"

// Formatação de data
const dataFormatada = this.pdfUtilsService.formatarData(new Date());
// Resultado: "15/01/2024"

// Sanitização de texto
const textoLimpo = this.pdfUtilsService.sanitizarTexto(
  '<p>Texto com HTML</p>',
  { allowHtml: false }
);
// Resultado: "Texto com HTML"
```

#### Geração de Nomes de Arquivo

```typescript
// Nome único para arquivo
const nomeArquivo = this.pdfUtilsService.gerarNomeArquivo('relatorio');
// Resultado: "relatorio-2024-01-15T10-30-45-123Z-abc123.pdf"
```

### Tratamento de Erros

```typescript
try {
  const pdf = await this.pdfService.gerarPdf(dados, configuracao);
  return pdf;
} catch (error) {
  if (error instanceof PdfValidationError) {
    // Erro de validação dos dados
    throw new BadRequestException(error.message);
  } else if (error instanceof PdfGenerationError) {
    // Erro na geração do PDF
    throw new InternalServerErrorException('Erro ao gerar PDF');
  }
  throw error;
}
```

### Configurações de Ambiente

```typescript
// .env
PDF_DEFAULT_FONT=Helvetica
PDF_DEFAULT_FONT_SIZE=12
PDF_MAX_FILE_SIZE=10485760  # 10MB
PDF_TEMP_DIR=./temp/pdf
```

### Exemplos de Uso por Contexto

#### Comprovantes de Pagamento

```typescript
const comprovante = await this.pdfService.gerarComprovante({
  numeroComprovante: '2024001',
  dadosPagamento: {
    valor: 150.00,
    data: new Date(),
    beneficiario: 'João Silva'
  },
  observacoes: ['Pagamento referente ao mês de janeiro']
});
```

#### Relatórios Técnicos

```typescript
const relatorio = await this.pdfService.gerarRelatorioTecnico({
  titulo: 'Análise de Conformidade',
  secoes: [
    {
      titulo: 'Introdução',
      conteudo: 'Análise realizada conforme normas...'
    },
    {
      titulo: 'Resultados',
      tabelas: [dadosAnalise],
      graficos: [graficoResultados]
    }
  ],
  assinaturaTecnica: dadosAssinatura
});
```

### Melhores Práticas

1. **Validação**: Sempre valide os dados antes da geração
2. **Templates**: Use templates para documentos recorrentes
3. **Estilos**: Mantenha estilos consistentes em todo o sistema
4. **Performance**: Para grandes volumes, considere geração assíncrona
5. **Segurança**: Sanitize dados de entrada para evitar injeção
6. **Logs**: Implemente logs para rastreamento de geração

### Troubleshooting

#### Problemas Comuns

- **Erro de memória**: Reduza o tamanho das imagens ou processe em lotes
- **Fontes não encontradas**: Verifique se as fontes estão disponíveis
- **Layout quebrado**: Valide as dimensões e margens
- **Caracteres especiais**: Use codificação UTF-8 adequada

### Suporte e Contribuição

Para dúvidas, problemas ou sugestões de melhoria:

1. Consulte a documentação técnica em `/docs`
2. Verifique os testes unitários para exemplos de uso
3. Abra issues no repositório do projeto
4. Contribua com melhorias via pull requests

---

**Versão**: 1.0.0  
**Última atualização**: Janeiro 2024  
**Compatibilidade**: NestJS 9+, Node.js 18+