# Parâmetros do Sistema

## Visão Geral

O sistema de parâmetros do PGBen permite armazenar e recuperar configurações dinâmicas com tipagem forte. Todos os parâmetros são armazenados como strings no banco de dados, mas são convertidos automaticamente para o tipo apropriado quando recuperados.

## Tipos de Parâmetros Suportados

O sistema suporta os seguintes tipos de parâmetros:

| Tipo | Descrição | Exemplo de Valor | Uso Típico |
|------|-----------|------------------|------------|
| `STRING` | Texto simples | `"PGBen - Sistema de Gestão"` | Nomes, descrições, URLs |
| `NUMBER` | Valor numérico | `"10485760"` (convertido para `10485760`) | Limites, quantidades, valores monetários |
| `BOOLEAN` | Valor booleano | `"true"` (convertido para `true`) | Flags de ativação/desativação |
| `DATE` | Data e hora | `"2025-05-18T20:10:30.123Z"` | Datas de referência, prazos fixos |
| `JSON` | Objeto ou array JSON | `"[\"jpg\",\"png\",\"pdf\"]"` (convertido para array) | Configurações complexas, listas |

## Parâmetros Pré-configurados

O sistema vem com os seguintes parâmetros pré-configurados:

### Parâmetros do Sistema

| Chave | Tipo | Valor Padrão | Descrição |
|-------|------|--------------|-----------|
| `sistema.nome` | `STRING` | `"PGBen - Plataforma de Gestão de Benefícios Eventuais"` | Nome do sistema exibido na interface |
| `sistema.versao` | `STRING` | `"1.0.0"` | Versão atual do sistema |
| `sistema.contato.email` | `STRING` | `"suporte@pgben.gov.br"` | Email de contato para suporte |

### Parâmetros de Upload

| Chave | Tipo | Valor Padrão | Descrição |
|-------|------|--------------|-----------|
| `upload.tamanho_maximo` | `NUMBER` | `10485760` | Tamanho máximo de arquivos para upload (em bytes) |
| `upload.arquivos_maximo` | `NUMBER` | `20` | Número máximo de arquivos por cidadão |
| `upload.tipos_permitidos` | `JSON` | `["jpg","jpeg","png","pdf","doc","docx"]` | Tipos de arquivo permitidos para upload |
| `upload.max_por_requisicao` | `NUMBER` | `5` | Número máximo de arquivos por requisição de upload |

### Parâmetros de Prazos

| Chave | Tipo | Valor Padrão | Descrição |
|-------|------|--------------|-----------|
| `prazo.analise_solicitacao` | `NUMBER` | `15` | Prazo para análise de solicitação de benefício (em dias) |
| `prazo.agendamento_entrevista` | `NUMBER` | `7` | Prazo para agendamento de entrevista (em dias) |
| `prazo.entrada_recurso` | `NUMBER` | `10` | Prazo para entrada de recurso (em dias) |
| `prazo.validade_documentos` | `NUMBER` | `90` | Prazo de validade de documentos (em dias) |

## Utilizando o Serviço de Parâmetros

Para utilizar o serviço de parâmetros em seu código:

```typescript
import { Injectable } from '@nestjs/common';
import { ParametroService } from '../configuracao/services/parametro.service';

@Injectable()
export class SeuService {
  constructor(
    private readonly parametroService: ParametroService
  ) {}

  async exemplo() {
    // Obter string (com valor padrão caso não exista)
    const nomeSistema = await this.parametroService.obterString(
      'sistema.nome', 
      'PGBen'
    );

    // Obter número
    const tamanhoMaximo = await this.parametroService.obterNumero(
      'upload.tamanho_maximo', 
      5242880
    );

    // Obter booleano
    const recursoAtivo = await this.parametroService.obterBoolean(
      'recurso.ativo', 
      false
    );

    // Obter data
    const dataReferencia = await this.parametroService.obterData(
      'sistema.data_referencia', 
      new Date()
    );

    // Obter JSON (array ou objeto)
    const tiposPermitidos = await this.parametroService.obterJSON<string[]>(
      'upload.tipos_permitidos', 
      ['pdf']
    );

    // Método genérico (especificando o tipo)
    const valor = await this.parametroService.obterValor<number>(
      'algum.parametro', 
      10, 
      'NUMBER'
    );
  }
}
```

## Gerenciando Parâmetros Programaticamente

Além de usar a interface administrativa, você pode gerenciar parâmetros programaticamente:

```typescript
// Criar novo parâmetro
await this.parametroService.criar({
  chave: 'novo.parametro',
  valor: '42',
  tipo: ParametroTipoEnum.NUMBER,
  descricao: 'Um novo parâmetro numérico',
  categoria: 'sistema'
});

// Atualizar parâmetro existente
await this.parametroService.atualizar('upload.tamanho_maximo', {
  valor: '20971520', // 20MB em bytes
  descricao: 'Tamanho máximo atualizado para 20MB'
});

// Remover parâmetro (use com cautela)
await this.parametroService.remover('parametro.obsoleto');

// Limpar cache de parâmetros (útil após atualizações em massa)
this.parametroService.limparCache();
```

## Sistema de Cache

O serviço de parâmetros utiliza um sistema de cache em memória para melhorar o desempenho. O cache é automaticamente invalidado quando um parâmetro é atualizado ou removido através do serviço.

Se você modificar parâmetros diretamente no banco de dados ou através de outro mecanismo, será necessário chamar o método `limparCache()` para garantir que as alterações sejam refletidas.

## Boas Práticas

1. **Sempre forneça valores padrão**: Isso garante que sua funcionalidade continue operando mesmo se o parâmetro não existir no banco de dados.

2. **Use categorias consistentes**: Agrupe parâmetros relacionados sob a mesma categoria para facilitar a gestão.

3. **Documente novos parâmetros**: Se você criar novos parâmetros, atualize a documentação e informe a equipe.

4. **Prefixos de módulo**: Use prefixos de módulo para evitar conflitos (ex: `seumodulo.parametro`).

5. **Evite parâmetros temporários**: O sistema de parâmetros é para configurações persistentes, não para dados transitórios.

## Exemplos Práticos

### Configuração de Limites de Upload no DocumentoModule

```typescript
import { Injectable } from '@nestjs/common';
import { ParametroService } from '../configuracao/services/parametro.service';

@Injectable()
export class UploadService {
  constructor(
    private readonly parametroService: ParametroService
  ) {}

  async validarArquivo(arquivo: Express.Multer.File): Promise<boolean> {
    // Obter tamanho máximo permitido
    const tamanhoMaximo = await this.parametroService.obterNumero(
      'upload.tamanho_maximo', 
      10485760
    );
    
    // Obter tipos permitidos
    const tiposPermitidos = await this.parametroService.obterJSON<string[]>(
      'upload.tipos_permitidos', 
      ['jpg', 'pdf']
    );
    
    // Extrair extensão do arquivo
    const extensao = arquivo.originalname.split('.').pop().toLowerCase();
    
    // Validar tamanho e tipo
    return (
      arquivo.size <= tamanhoMaximo && 
      tiposPermitidos.includes(extensao)
    );
  }
}
```
