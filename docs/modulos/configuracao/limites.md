# Limites e Prazos

## Visão Geral

O sistema de limites e prazos do PGBen permite configurar restrições operacionais e prazos para diversos processos do sistema. Esses limites são utilizados para garantir o bom funcionamento da plataforma e o cumprimento de prazos legais e administrativos.

## Tipos de Limites

### Limites de Upload

Os limites de upload controlam o tamanho e quantidade de arquivos que podem ser enviados ao sistema:

| Parâmetro | Descrição | Valor Padrão |
|-----------|-----------|--------------|
| `tamanho_maximo` | Tamanho máximo de cada arquivo em bytes | 10485760 (10MB) |
| `arquivos_maximo` | Número máximo de arquivos por cidadão | 20 |
| `tipos_permitidos` | Extensões de arquivo permitidas | ["jpg", "jpeg", "png", "pdf", "doc", "docx"] |
| `max_por_requisicao` | Número máximo de arquivos por requisição | 5 |

### Prazos Operacionais

Os prazos operacionais definem períodos para conclusão de etapas do processo:

| Tipo | Descrição | Valor Padrão (dias) |
|------|-----------|---------------------|
| `ANALISE_SOLICITACAO` | Prazo para análise de solicitação | 15 |
| `AGENDAMENTO_ENTREVISTA` | Prazo para agendamento de entrevista | 7 |
| `ENTRADA_RECURSO` | Prazo para entrada de recurso | 10 |
| `VALIDADE_DOCUMENTOS` | Prazo de validade de documentos | 90 |
| `COMPLEMENTACAO_DOCUMENTOS` | Prazo para complementação de documentos | 10 |
| `REALIZACAO_ENTREVISTA` | Prazo para realização de entrevista agendada | 7 |
| `APROVACAO_COORDENADOR` | Prazo para aprovação do coordenador | 3 |
| `EMISSAO_PAGAMENTO` | Prazo para emissão de pagamento | 5 |

## Utilizando o Serviço de Limites

Para utilizar o serviço de limites em seu código:

```typescript
import { Injectable } from '@nestjs/common';
import { LimitesService } from '../configuracao/services/limites.service';

@Injectable()
export class DocumentoService {
  constructor(
    private readonly limitesService: LimitesService
  ) {}

  async validarArquivo(arquivo: Express.Multer.File): Promise<boolean> {
    // Obter limites de upload
    const limites = await this.limitesService.buscarLimitesUpload();
    
    // Extrair extensão do arquivo
    const extensao = arquivo.originalname.split('.').pop().toLowerCase();
    
    // Validar tamanho
    if (arquivo.size > limites.tamanho_maximo) {
      throw new Error(`O arquivo excede o tamanho máximo permitido de ${this.formatarBytes(limites.tamanho_maximo)}`);
    }
    
    // Validar tipo
    if (!limites.tipos_permitidos.includes(extensao)) {
      throw new Error(`O tipo de arquivo .${extensao} não é permitido. Tipos permitidos: ${limites.tipos_permitidos.join(', ')}`);
    }
    
    return true;
  }

  async verificarLimiteArquivosPorCidadao(cidadaoId: string): Promise<boolean> {
    // Obter limites de upload
    const limites = await this.limitesService.buscarLimitesUpload();
    
    // Contar arquivos existentes
    const quantidadeAtual = await this.documentoRepository.countByCidadaoId(cidadaoId);
    
    // Verificar se excede o limite
    if (quantidadeAtual >= limites.arquivos_maximo) {
      throw new Error(`O cidadão já atingiu o limite máximo de ${limites.arquivos_maximo} arquivos`);
    }
    
    return true;
  }

  async validarQuantidadeArquivosRequisicao(arquivos: Express.Multer.File[]): Promise<boolean> {
    // Obter limites de upload
    const limites = await this.limitesService.buscarLimitesUpload();
    
    // Verificar quantidade
    if (arquivos.length > limites.max_por_requisicao) {
      throw new Error(`É permitido enviar no máximo ${limites.max_por_requisicao} arquivos por requisição`);
    }
    
    return true;
  }
  
  private formatarBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }
}
```

## Utilizando o Serviço de Prazos

Para utilizar o serviço de prazos em seu código:

```typescript
import { Injectable } from '@nestjs/common';
import { LimitesService } from '../configuracao/services/limites.service';
import { PrazoTipoEnum } from '../configuracao/enums/prazo-tipo.enum';

@Injectable()
export class SolicitacaoService {
  constructor(
    private readonly limitesService: LimitesService
  ) {}

  async calcularDataLimite(tipo: PrazoTipoEnum, dataReferencia: Date = new Date()): Promise<Date> {
    // Obter prazo em dias para o tipo especificado
    const prazo = await this.limitesService.buscarPrazo(tipo);
    
    // Calcular data limite (considerando apenas dias úteis)
    const dataLimite = await this.calcularDiasUteis(dataReferencia, prazo.dias);
    
    return dataLimite;
  }

  async verificarPrazoExpirado(dataLimite: Date): Promise<boolean> {
    const hoje = new Date();
    return dataLimite < hoje;
  }

  async verificarEntradaRecurso(dataSolicitacao: Date): Promise<boolean> {
    // Obter prazo para entrada de recurso
    const prazo = await this.limitesService.buscarPrazo(PrazoTipoEnum.ENTRADA_RECURSO);
    
    // Calcular data limite para recurso
    const dataLimiteRecurso = await this.calcularDiasUteis(dataSolicitacao, prazo.dias);
    
    // Verificar se ainda está no prazo
    const hoje = new Date();
    return hoje <= dataLimiteRecurso;
  }
  
  private async calcularDiasUteis(dataInicial: Date, dias: number): Promise<Date> {
    // Implementação simplificada - em produção, considerar feriados
    let dataAtual = new Date(dataInicial);
    let diasAdicionados = 0;
    
    while (diasAdicionados < dias) {
      dataAtual.setDate(dataAtual.getDate() + 1);
      
      // Pular finais de semana (0 = Domingo, 6 = Sábado)
      const diaSemana = dataAtual.getDay();
      if (diaSemana !== 0 && diaSemana !== 6) {
        diasAdicionados++;
      }
    }
    
    return dataAtual;
  }
}
```

## Atualizando Limites e Prazos

Para atualizar limites e prazos programaticamente:

```typescript
// Atualizar limites de upload
await this.limitesService.atualizarLimitesUpload({
  tamanho_maximo: 20971520, // 20MB
  arquivos_maximo: 30,
  tipos_permitidos: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx'],
  max_por_requisicao: 10
});

// Atualizar prazo específico
await this.limitesService.atualizarPrazo(PrazoTipoEnum.ANALISE_SOLICITACAO, {
  dias: 10
});
```

## Formatação de Limites

O serviço de limites fornece métodos para formatação amigável:

```typescript
// Obter limites com formatação amigável
const limites = await this.limitesService.buscarLimitesUpload();

console.log(limites.tamanho_maximo_formatado); // "10 MB"
console.log(limites.tipos_permitidos_formatado); // "JPG, JPEG, PNG, PDF, DOC, DOCX"
```

## Cálculo de Datas Considerando Prazos

O sistema de prazos pode ser utilizado para calcular datas importantes:

```typescript
@Injectable()
export class AgendamentoService {
  constructor(
    private readonly limitesService: LimitesService,
    private readonly feriadoService: FeriadoService
  ) {}

  async calcularDataLimiteAgendamento(dataSolicitacao: Date): Promise<Date> {
    // Obter prazo para agendamento
    const prazo = await this.limitesService.buscarPrazo(PrazoTipoEnum.AGENDAMENTO_ENTREVISTA);
    
    // Calcular data limite considerando dias úteis e feriados
    return this.calcularDataConsiderandoFeriados(dataSolicitacao, prazo.dias);
  }
  
  async sugerirDatasDisponiveis(dataInicial: Date, quantidade: number = 3): Promise<Date[]> {
    const datasDisponiveis: Date[] = [];
    let dataAtual = new Date(dataInicial);
    
    while (datasDisponiveis.length < quantidade) {
      // Avançar para o próximo dia
      dataAtual.setDate(dataAtual.getDate() + 1);
      
      // Verificar se é dia útil e não é feriado
      const diaSemana = dataAtual.getDay();
      const ehFeriado = await this.feriadoService.verificarFeriado(dataAtual);
      
      if (diaSemana !== 0 && diaSemana !== 6 && !ehFeriado) {
        datasDisponiveis.push(new Date(dataAtual));
      }
    }
    
    return datasDisponiveis;
  }
  
  private async calcularDataConsiderandoFeriados(dataInicial: Date, dias: number): Promise<Date> {
    let dataAtual = new Date(dataInicial);
    let diasAdicionados = 0;
    
    while (diasAdicionados < dias) {
      dataAtual.setDate(dataAtual.getDate() + 1);
      
      // Verificar se é dia útil e não é feriado
      const diaSemana = dataAtual.getDay();
      const ehFeriado = await this.feriadoService.verificarFeriado(dataAtual);
      
      if (diaSemana !== 0 && diaSemana !== 6 && !ehFeriado) {
        diasAdicionados++;
      }
    }
    
    return dataAtual;
  }
}
```

## Boas Práticas

1. **Sempre valide antes de processar**: Verifique limites antes de processar uploads ou operações.
2. **Forneça mensagens claras**: Ao rejeitar uma operação por limite, explique claramente o motivo.
3. **Considere o contexto**: Alguns limites podem variar conforme o contexto (ex: tipo de benefício).
4. **Documente alterações**: Ao alterar limites, documente as razões e impactos esperados.
5. **Monitore uso**: Acompanhe o uso para identificar se os limites estão adequados.

## Exemplos Práticos

### Validação de Upload no Controller

```typescript
@Controller('documentos')
export class DocumentoController {
  constructor(
    private readonly documentoService: DocumentoService,
    private readonly limitesService: LimitesService
  ) {}

  @Post('upload')
  @UseInterceptors(FilesInterceptor('arquivos'))
  async uploadArquivos(
    @UploadedFiles() arquivos: Express.Multer.File[],
    @Body('cidadao_id') cidadaoId: string
  ) {
    try {
      // Obter limites de upload
      const limites = await this.limitesService.buscarLimitesUpload();
      
      // Validar quantidade de arquivos na requisição
      if (arquivos.length > limites.max_por_requisicao) {
        throw new BadRequestException(
          `É permitido enviar no máximo ${limites.max_por_requisicao} arquivos por requisição`
        );
      }
      
      // Verificar limite por cidadão
      const quantidadeAtual = await this.documentoService.contarArquivosPorCidadao(cidadaoId);
      const quantidadeTotal = quantidadeAtual + arquivos.length;
      
      if (quantidadeTotal > limites.arquivos_maximo) {
        throw new BadRequestException(
          `O limite máximo de ${limites.arquivos_maximo} arquivos por cidadão seria excedido. ` +
          `Atualmente: ${quantidadeAtual}, Tentando adicionar: ${arquivos.length}`
        );
      }
      
      // Validar cada arquivo
      for (const arquivo of arquivos) {
        // Validar tamanho
        if (arquivo.size > limites.tamanho_maximo) {
          throw new BadRequestException(
            `O arquivo "${arquivo.originalname}" excede o tamanho máximo permitido de ${this.formatarBytes(limites.tamanho_maximo)}`
          );
        }
        
        // Validar tipo
        const extensao = arquivo.originalname.split('.').pop().toLowerCase();
        if (!limites.tipos_permitidos.includes(extensao)) {
          throw new BadRequestException(
            `O tipo de arquivo "${extensao}" não é permitido. Tipos permitidos: ${limites.tipos_permitidos.join(', ')}`
          );
        }
      }
      
      // Processar o upload
      const resultados = await this.documentoService.salvarArquivos(arquivos, cidadaoId);
      
      return {
        sucesso: true,
        mensagem: `${arquivos.length} arquivo(s) enviado(s) com sucesso`,
        arquivos: resultados
      };
    } catch (error) {
      throw error instanceof HttpException 
        ? error 
        : new InternalServerErrorException(`Erro ao processar upload: ${error.message}`);
    }
  }
  
  private formatarBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }
}
```
