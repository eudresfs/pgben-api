# Configuração do Office Converter

Este documento descreve como configurar o sistema de conversão de documentos Office para PDF usando LibreOffice headless.

## Visão Geral

O `OfficeConverterService` permite converter documentos Office (Word, Excel, PowerPoint) para PDF, que são então usados para gerar thumbnails. O serviço utiliza o LibreOffice em modo headless para realizar as conversões.

## Instalação do LibreOffice

### Windows

1. Baixe o LibreOffice do site oficial: https://www.libreoffice.org/download/download/
2. Execute o instalador e siga as instruções
3. O caminho padrão de instalação é: `C:\Program Files\LibreOffice\program\soffice.exe`

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install libreoffice
```

### Linux (CentOS/RHEL)

```bash
sudo yum install libreoffice
# ou para versões mais recentes
sudo dnf install libreoffice
```

### macOS

1. Baixe o LibreOffice do site oficial
2. Arraste para a pasta Applications
3. O caminho padrão será: `/Applications/LibreOffice.app/Contents/MacOS/soffice`

### Docker

Para ambientes containerizados, adicione ao seu Dockerfile:

```dockerfile
# Para Ubuntu/Debian base
RUN apt-get update && apt-get install -y \
    libreoffice \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Para Alpine base
RUN apk add --no-cache libreoffice
```

## Configuração

### Variáveis de Ambiente

Configure as seguintes variáveis de ambiente no seu arquivo `.env`:

```env
# Habilitar/desabilitar conversão de documentos Office
OFFICE_CONVERTER_ENABLED=true

# Caminho personalizado para o LibreOffice (opcional)
# Se não especificado, usa o caminho padrão do sistema operacional
LIBREOFFICE_PATH="C:\Program Files\LibreOffice\program\soffice.exe"

# Timeout para conversão em milissegundos (padrão: 30000 = 30 segundos)
OFFICE_CONVERTER_TIMEOUT=30000

# Diretório temporário para arquivos de conversão (padrão: sistema)
OFFICE_CONVERTER_TEMP_DIR="/tmp"

# Número máximo de tentativas em caso de falha (padrão: 2)
OFFICE_CONVERTER_MAX_RETRIES=2

# Delay entre tentativas em milissegundos (padrão: 1000 = 1 segundo)
OFFICE_CONVERTER_RETRY_DELAY=1000
```

### Caminhos Padrão por Sistema Operacional

- **Windows**: `C:\Program Files\LibreOffice\program\soffice.exe`
- **macOS**: `/Applications/LibreOffice.app/Contents/MacOS/soffice`
- **Linux**: `/usr/bin/libreoffice`

## Formatos Suportados

O serviço suporta os seguintes formatos de documento:

### Microsoft Office
- **Word**: `.docx`, `.doc`
- **Excel**: `.xlsx`, `.xls`
- **PowerPoint**: `.pptx`, `.ppt`

### OpenDocument
- **Text**: `.odt`
- **Spreadsheet**: `.ods`
- **Presentation**: `.odp`

### Outros
- **Rich Text Format**: `.rtf`

## Verificação da Instalação

### Teste Manual

Para verificar se o LibreOffice está instalado corretamente:

```bash
# Windows (PowerShell)
& "C:\Program Files\LibreOffice\program\soffice.exe" --version

# Linux/macOS
libreoffice --version
```

### Teste de Conversão

Para testar a conversão headless:

```bash
# Converter um documento para PDF
soffice --headless --convert-to pdf --outdir /tmp /path/to/document.docx
```

### Health Check da API

O serviço expõe informações de status através do método `getStats()`:

```typescript
const stats = officeConverterService.getStats();
console.log(stats);
// {
//   enabled: true,
//   libreOfficeAvailable: true,
//   libreOfficePath: "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
//   timeout: 30000,
//   maxRetries: 2
// }
```

## Troubleshooting

### Problemas Comuns

#### 1. LibreOffice não encontrado

**Erro**: `LibreOffice não está disponível ou conversão desabilitada`

**Soluções**:
- Verifique se o LibreOffice está instalado
- Configure a variável `LIBREOFFICE_PATH` com o caminho correto
- Verifique as permissões de execução

#### 2. Timeout na conversão

**Erro**: `Timeout na conversão`

**Soluções**:
- Aumente o valor de `OFFICE_CONVERTER_TIMEOUT`
- Verifique se o documento não está corrompido
- Monitore o uso de recursos do sistema

#### 3. Arquivo PDF não gerado

**Erro**: `Arquivo PDF não foi gerado`

**Soluções**:
- Verifique permissões de escrita no diretório temporário
- Confirme que o documento de entrada é válido
- Verifique logs do LibreOffice

#### 4. Problemas de permissão

**Linux/macOS**:
```bash
# Dar permissão de execução
chmod +x /usr/bin/libreoffice

# Verificar se o usuário tem acesso
ls -la /usr/bin/libreoffice
```

### Logs e Debugging

O serviço registra logs detalhados para debugging:

```typescript
// Logs de debug incluem:
// - Início e fim da conversão
// - Comandos executados
// - Tamanhos de arquivo
// - Tempos de processamento
// - Erros e warnings
```

### Monitoramento

Para monitorar o desempenho:

1. **Métricas de conversão**: Tempo, tamanho dos arquivos, taxa de sucesso
2. **Uso de recursos**: CPU, memória, espaço em disco temporário
3. **Health checks**: Disponibilidade do LibreOffice

## Considerações de Performance

### Otimizações

1. **Cache**: PDFs convertidos podem ser cacheados para evitar reconversões
2. **Processamento assíncrono**: Use filas para conversões em lote
3. **Limpeza**: Arquivos temporários são automaticamente removidos
4. **Retry logic**: Tentativas automáticas em caso de falha temporária

### Limites Recomendados

- **Tamanho máximo de arquivo**: 50MB
- **Timeout**: 30-120 segundos dependendo do tamanho
- **Tentativas**: 2-3 máximo
- **Concorrência**: Limite baseado nos recursos disponíveis

## Segurança

### Considerações

1. **Sanitização**: Caminhos de arquivo são sanitizados para prevenir injection
2. **Isolamento**: Conversões executam em diretórios temporários isolados
3. **Timeout**: Previne conversões que ficam travadas
4. **Limpeza**: Arquivos temporários são sempre removidos

### Recomendações

- Execute em ambiente containerizado quando possível
- Limite recursos (CPU, memória) para o processo LibreOffice
- Monitore uso de espaço em disco temporário
- Implemente rate limiting para conversões

## Exemplo de Uso

```typescript
import { OfficeConverterService } from './office-converter.service';

// Injetar o serviço
constructor(private readonly officeConverter: OfficeConverterService) {}

// Converter documento
async convertDocument(buffer: Buffer, mimeType: string) {
  const result = await this.officeConverter.convertToPdf(buffer, mimeType);
  
  if (result.success) {
    console.log(`Conversão bem-sucedida: ${result.convertedSize} bytes`);
    return result.pdfBuffer;
  } else {
    console.error(`Erro na conversão: ${result.error}`);
    throw new Error(result.error);
  }
}

// Verificar disponibilidade
async checkAvailability() {
  const isAvailable = await this.officeConverter.checkLibreOfficeAvailability();
  console.log(`LibreOffice disponível: ${isAvailable}`);
  return isAvailable;
}
```

## Roadmap

### Melhorias Futuras

1. **Pool de processos**: Manter instâncias do LibreOffice em pool
2. **Conversão direta para imagem**: Bypass do PDF para alguns casos
3. **Suporte a mais formatos**: Adicionar outros formatos de documento
4. **Métricas avançadas**: Integração com sistemas de monitoramento
5. **Cache inteligente**: Cache baseado em hash do conteúdo

### Alternativas

- **ONLYOFFICE**: Para ambientes que requerem melhor compatibilidade
- **Pandoc**: Para conversões de texto simples
- **Serviços cloud**: Google Docs API, Microsoft Graph API