# Guia de Uso do Serviço MinIO

## Visão Geral

O `MinioService` é um componente central do PGBen responsável pelo armazenamento seguro de documentos. Este serviço oferece funcionalidades para upload, download e gerenciamento de arquivos com suporte a criptografia para documentos sensíveis, garantindo a conformidade com a LGPD.

## Funcionalidades Principais

- Upload de documentos com geração de nomes únicos
- Criptografia automática para documentos sensíveis
- Download de documentos com descriptografia automática
- Geração de URLs temporárias para acesso aos documentos
- Listagem e exclusão de documentos
- Verificação de integridade via hash

## Configuração

O serviço utiliza as seguintes variáveis de ambiente:

| Variável | Descrição | Valor Padrão |
|----------|-----------|--------------|
| `MINIO_ENDPOINT` | Endereço do servidor MinIO | `localhost` |
| `MINIO_PORT` | Porta do servidor MinIO | `9000` |
| `MINIO_USE_SSL` | Utilizar conexão segura | `false` |
| `MINIO_ACCESS_KEY` | Chave de acesso | `minioadmin` |
| `MINIO_SECRET_KEY` | Chave secreta | `minioadmin` |
| `MINIO_BUCKET` | Nome do bucket para documentos | `documents` |

## Exemplos de Uso

### Upload de Documento

```typescript
import { MinioService } from 'src/shared/services/minio.service';

@Controller('documentos')
export class DocumentoController {
  constructor(private minioService: MinioService) {}

  @Post('upload')
  async uploadDocumento(
    @Body() dto: UploadDocumentoDto,
    @UploadedFile() arquivo: Express.Multer.File,
  ) {
    const resultado = await this.minioService.uploadArquivo(
      arquivo.buffer,
      arquivo.originalname,
      dto.solicitacaoId,
      dto.tipoDocumento,
    );
    
    return {
      nomeArquivo: resultado.nomeArquivo,
      tamanho: resultado.tamanho,
      criptografado: resultado.criptografado,
    };
  }
}
```

### Download de Documento

```typescript
@Controller('documentos')
export class DocumentoController {
  constructor(private minioService: MinioService) {}

  @Get(':nomeArquivo')
  async downloadDocumento(
    @Param('nomeArquivo') nomeArquivo: string,
    @Res() res: Response,
  ) {
    const { arquivo, metadados } = await this.minioService.downloadArquivo(nomeArquivo);
    
    res.setHeader('Content-Type', metadados['Content-Type']);
    res.setHeader('Content-Disposition', `attachment; filename="${metadados['X-Amz-Meta-Original-Name']}"`);
    res.send(arquivo);
  }
}
```

### Geração de URL Temporária

```typescript
@Controller('documentos')
export class DocumentoController {
  constructor(private minioService: MinioService) {}

  @Get('url/:nomeArquivo')
  async getUrlTemporaria(
    @Param('nomeArquivo') nomeArquivo: string,
  ) {
    const url = await this.minioService.gerarUrlTemporaria(nomeArquivo, 3600); // 1 hora
    return { url };
  }
}
```

### Listar Documentos por Solicitação

```typescript
@Controller('documentos')
export class DocumentoController {
  constructor(private minioService: MinioService) {}

  @Get('solicitacao/:solicitacaoId')
  async listarDocumentos(
    @Param('solicitacaoId') solicitacaoId: string,
  ) {
    const documentos = await this.minioService.listarArquivos(solicitacaoId);
    return { documentos };
  }
}
```

## Segurança e Criptografia

O serviço identifica automaticamente documentos sensíveis e aplica criptografia AES-256-GCM. Os seguintes tipos de documentos são considerados sensíveis:

- CPF
- RG
- COMPROVANTE_RENDA
- COMPROVANTE_RESIDENCIA
- LAUDO_MEDICO
- CERTIDAO_NASCIMENTO
- CERTIDAO_CASAMENTO
- CARTAO_NIS
- CARTAO_BOLSA_FAMILIA
- DECLARACAO_VULNERABILIDADE

### Processo de Criptografia

1. O documento original é recebido pelo serviço
2. Um hash SHA-256 é calculado para verificação de integridade
3. Para documentos sensíveis, o conteúdo é criptografado usando AES-256-GCM
4. O IV (Initialization Vector) e a tag de autenticação são armazenados como metadados
5. O documento criptografado é enviado para o MinIO

### Processo de Descriptografia

1. O documento criptografado é recuperado do MinIO
2. Os metadados de criptografia (IV e tag de autenticação) são extraídos
3. O documento é descriptografado usando a chave mestra
4. A integridade é verificada usando a tag de autenticação
5. O documento original é retornado

## Boas Práticas

1. **Sempre use tipos de documento padronizados** para garantir que a criptografia seja aplicada corretamente
2. **Verifique o hash** ao receber documentos para garantir a integridade
3. **Não armazene URLs temporárias** em logs ou bancos de dados por longos períodos
4. **Defina políticas de retenção** para documentos sensíveis
5. **Monitore o uso do serviço** para detectar padrões anormais de acesso

## Tratamento de Erros

O serviço lança exceções específicas para diferentes tipos de erros:

- `DocumentoNaoEncontradoError`: Quando o documento solicitado não existe
- `ErroDescriptografiaError`: Quando há falha na descriptografia
- `ErroIntegridadeError`: Quando o hash do documento não confere
- `MinioConnectionError`: Quando há problemas de conexão com o MinIO

## Limitações

- O tamanho máximo de arquivo suportado é definido pelo MinIO (geralmente 5TB)
- A criptografia adiciona uma pequena sobrecarga ao tamanho do arquivo
- URLs temporárias não funcionam para documentos que requerem descriptografia

## Integração com Outros Módulos

O `MinioService` é frequentemente usado em conjunto com:

- `DocumentoModule`: Para gerenciamento de documentos no sistema
- `SolicitacaoModule`: Para associar documentos a solicitações
- `AuditoriaModule`: Para registrar operações em documentos sensíveis

## Referências

- [Documentação oficial do MinIO](https://docs.min.io/)
- [Guia de Segurança para Chaves de Criptografia](./seguranca-chaves.md)
- [Padrões de Segurança LGPD](./lgpd-compliance.md)
