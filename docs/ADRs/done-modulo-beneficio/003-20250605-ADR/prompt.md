# Prompt Detalhado para Refatoração do Módulo de Benefícios

## 1. Contexto do Sistema

### Visão Geral
Você está trabalhando em um sistema de gestão de benefícios sociais para uma prefeitura. O sistema gerencia 4 tipos principais de benefícios:

1. **Aluguel Social**: Para famílias em vulnerabilidade habitacional
2. **Cesta Básica**: Auxílio alimentar para famílias carentes
3. **Auxílio Funeral**: Suporte financeiro para despesas funerárias
4. **Auxílio Natalidade**: Apoio para gestantes em situação de vulnerabilidade

### Arquitetura Atual
```
src/
├── modules/
│   ├── beneficio/
│   │   ├── controllers/
│   │   │   └── dados-beneficio.controller.ts
│   │   ├── services/
│   │   │   ├── base/
│   │   │   │   └── abstract-dados-beneficio.service.ts
│   │   │   ├── dados-aluguel-social.service.ts
│   │   │   ├── dados-cesta-basica.service.ts
│   │   │   ├── dados-funeral.service.ts
│   │   │   ├── dados-natalidade.service.ts
│   │   │   ├── dados-beneficio-factory.service.ts
│   │   │   └── estrutura-entidade.service.ts
│   │   ├── dto/
└── shared/
│   └── exceptions/
│       └── error-catalog/
│           └── domains/
│               └── beneficio.errors.ts (JÁ EXISTE)
```

### Fluxo de Negócio
1. Cidadão faz uma **solicitação** de benefício
2. Sistema cria registro de **dados específicos** do benefício
3. Status da solicitação muda para **aguardando_documentos**
4. Cidadão envia documentos
5. Assistente social analisa e aprova/rejeita

### Problemas Identificados
- **Duplicação**: Validações repetidas em cada serviço
- **Complexidade**: Métodos não utilizados aumentam manutenção
- **Performance**: Sem cache, queries repetitivas ao banco
- **UX**: Mensagens de erro técnicas e não orientativas
- **Manutenibilidade**: Valores mágicos espalhados no código

## 2. Cadeia de Pensamento para Refatoração

### Por que eliminar métodos não utilizados?
```typescript
// PROBLEMA: Métodos como este existem mas NUNCA são chamados
async findByPeriodoConcessao(periodo: string, page: number, limit: number) {
  // 20 linhas de código morto
}

// RACIOCÍNIO:
// 1. Código não usado = débito técnico
// 2. Confunde novos desenvolvedores
// 3. Aumenta superfície de testes sem valor
// 4. YAGNI: You Aren't Gonna Need It

// SOLUÇÃO: Remover completamente
```

### Por que implementar cache?
```typescript
// PROBLEMA: Mesma query executada múltiplas vezes
// Cenário: Usuário visualiza detalhes do benefício 5x = 5 queries idênticas

// RACIOCÍNIO:
// 1. Volume baixo mas queries repetitivas
// 2. Dados mudam pouco após criação
// 3. Cache de 5 min é seguro e eficaz

// SOLUÇÃO:
const CACHE_STRATEGY = {
  TTL: 300, // 5 minutos
  KEYS: {
    byId: (id) => `beneficio:${entityName}:${id}`,
    bySolicitacao: (id) => `beneficio:${entityName}:sol:${id}`
  }
};
```

### Por que melhorar mensagens de erro?
```typescript
// PROBLEMA ATUAL:
throw new BadRequestException('Quantidade de cestas deve ser um número');

// RACIOCÍNIO:
// 1. Não explica o contexto
// 2. Não sugere correção
// 3. Tom técnico e frio

// SOLUÇÃO:
throw throwBeneficioValidationError(
  'A quantidade de cestas precisa ser um número entre 1 e 12. ' +
  'Por exemplo: para uma família de 6 pessoas, recomendamos 2 cestas.',
  { field: 'quantidade_cestas', value: dto.quantidade_cestas }
);
```

## 3. Implementação Detalhada

### Passo 1: Expandir o Catálogo de Erros Existente

**Arquivo**: `src/shared/exceptions/error-catalog/domains/beneficio.errors.ts`

```typescript
// ADICIONAR ao arquivo existente, mantendo a estrutura atual

// Novos tipos de erro específicos
export enum BeneficioDomain {
  // ... existentes ...
  VALIDATION_ERROR = 'BENEFICIO_VALIDATION_ERROR',
  BUSINESS_RULE_VIOLATION = 'BENEFICIO_BUSINESS_RULE_VIOLATION',
  WORKFLOW_ERROR = 'BENEFICIO_WORKFLOW_ERROR',
}

// Funções auxiliares para validação com mensagens amigáveis
export const throwBeneficioValidationError = (
  message: string,
  context?: BeneficioErrorContext
): never => {
  throw new DomainException(
    BeneficioDomain.VALIDATION_ERROR,
    message,
    HttpStatus.BAD_REQUEST,
    context
  );
};

export const throwBeneficioBusinessRuleError = (
  message: string,
  context?: BeneficioErrorContext
): never => {
  throw new DomainException(
    BeneficioDomain.BUSINESS_RULE_VIOLATION,
    message,
    HttpStatus.UNPROCESSABLE_ENTITY,
    context
  );
};

// Builder para múltiplos erros de validação
export class BeneficioValidationErrorBuilder {
  private errors: Array<{ field: string; message: string }> = [];
  
  add(field: string, message: string): this {
    this.errors.push({ field, message });
    return this;
  }
  
  addIf(condition: boolean, field: string, message: string): this {
    if (condition) {
      this.add(field, message);
    }
    return this;
  }
  
  hasErrors(): boolean {
    return this.errors.length > 0;
  }
  
  throw(): never {
    if (!this.hasErrors()) return;
    
    if (this.errors.length === 1) {
      throwBeneficioValidationError(this.errors[0].message, {
        field: this.errors[0].field
      });
    }
    
    const message = 'Por favor, corrija os seguintes problemas:\n' +
      this.errors.map(e => `• ${e.field}: ${e.message}`).join('\n');
    
    throwBeneficioValidationError(message, {
      fields: this.errors.map(e => e.field),
      details: this.errors
    });
  }
}

// Mensagens padronizadas orientadas ao usuário
export const BENEFICIO_USER_MESSAGES = {
  // Mensagens genéricas reutilizáveis
  GENERIC: {
    CAMPO_OBRIGATORIO: (campo: string) => 
      `${campo} é obrigatório. Por favor, preencha esta informação para continuar.`,
    
    TAMANHO_MINIMO: (campo: string, min: number) => 
      `${campo} deve ter pelo menos ${min} caracteres. ` +
      `Seja mais específico para podermos ajudar melhor.`,
    
    VALOR_MINIMO: (campo: string, min: number) => 
      `${campo} deve ser no mínimo ${min}. Verifique o valor informado.`,
    
    VALOR_MAXIMO: (campo: string, max: number) => 
      `${campo} não pode ser maior que ${max}. ` +
      `Se precisar de um valor maior, entre em contato com a assistência social.`,
    
    DATA_FUTURA: (campo: string) => 
      `${campo} não pode ser uma data futura. Verifique se a data está correta.`,
    
    DATA_PASSADA: (campo: string) => 
      `${campo} não pode ser uma data passada. Informe uma data atual ou futura.`,
    
    JA_EXISTE: 'Já existe um cadastro para esta solicitação. ' +
      'Para fazer alterações, use a opção de editar.',
    
    NAO_ENCONTRADO: 'Não encontramos os dados solicitados. ' +
      'Verifique o código informado ou entre em contato com o suporte.',
    
    OPERACAO_SUCESSO: 'Dados salvos com sucesso! ' +
      'Próximo passo: envie os documentos necessários.',
    
    STATUS_ATUALIZADO: 'Status atualizado com sucesso para "Aguardando Documentos".',
    
    STATUS_NAO_ATUALIZADO: 'Seus dados foram salvos! ' +
      'Nota: O status será atualizado automaticamente em alguns minutos.'
  },
  
  // Mensagens específicas por benefício
  ALUGUEL_SOCIAL: {
    MAX_ESPECIFICACOES: 
      'Você pode selecionar no máximo 2 especificações adicionais. ' +
      'Escolha as duas mais importantes para seu caso. ' +
      'Outras informações podem ser incluídas nas observações.',
    
    SITUACAO_MORADIA_CURTA: 
      'Por favor, descreva sua situação de moradia com mais detalhes (mínimo 10 caracteres). ' +
      'Exemplo: "Morando de favor com parentes, casa possui apenas 2 cômodos para 6 pessoas". ' +
      'Isso nos ajuda a entender melhor suas necessidades.',
    
    UNIDADE_REQUERIDA: (origem: string) =>
      `Como o atendimento foi via ${origem}, precisamos saber qual unidade fez o encaminhamento. ` +
      `Isso é importante para darmos continuidade ao seu processo.`,
    
    HINT_PRIORIDADE: 
      'Dica: Casos de violência doméstica, situação de rua e calamidade pública ' +
      'têm prioridade no atendimento.'
  },
  
  CESTA_BASICA: {
    QUANTIDADE_INVALIDA: 
      'A quantidade de cestas deve ser entre 1 e 12. ' +
      'Para uma família de até 3 pessoas, recomendamos 1 cesta. ' +
      'Adicione 1 cesta para cada 3 pessoas adicionais.',
    
    JUSTIFICATIVA_REQUIRED: 
      'Você está solicitando mais cestas que o recomendado para o tamanho da sua família. ' +
      'Por favor, explique brevemente o motivo (ex: "Família com 2 crianças pequenas e 1 idoso com dieta especial"). ' +
      'Isso nos ajuda a atender melhor sua necessidade.',
    
    UNIDADE_ENCAMINHAMENTO: 
      'Para encaminhamentos externos, precisamos identificar a unidade que fez o encaminhamento. ' +
      'Informe o nome completo da unidade (ex: "CRAS Centro", "UBS Vila Nova").',
    
    CALCULO_RECOMENDACAO: (pessoas: number) => {
      const recomendado = Math.ceil(pessoas / 3);
      return `Para ${pessoas} pessoas, recomendamos ${recomendado} cesta${recomendado > 1 ? 's' : ''}. ` +
        `Você pode solicitar até ${recomendado + 1} sem justificativa.`;
    }
  },
  
  FUNERAL: {
    PRAZO_EXCEDIDO: 
      'O prazo de 30 dias para solicitar o auxílio funeral já passou. ' +
      'Infelizmente não podemos processar esta solicitação. ' +
      'Procure o CRAS mais próximo para orientações sobre outras formas de apoio.',
    
    DATA_OBITO_FUTURA: 
      'A data do óbito não pode ser futura. ' +
      'Verifique se digitou a data corretamente (dia/mês/ano).',
    
    DATA_AUTORIZACAO_INVALIDA: 
      'A data de autorização deve ser igual ou posterior à data do óbito. ' +
      'Geralmente é a data de hoje ou a data em que você procurou a assistência social.',
    
    PARENTESCO_PRIORITARIO: 
      'Dica: Parentes de primeiro grau (cônjuge, filhos, pais) têm prioridade no atendimento.',
    
    DOCUMENTOS_NECESSARIOS: 
      'Documentos necessários: Certidão de óbito, RG e CPF do falecido e do requerente, ' +
      'comprovante de parentesco e comprovante de residência.'
  },
  
  NATALIDADE: {
    DATA_PARTO_INVALIDA: 
      'A data provável do parto deve estar entre hoje e as próximas 40 semanas. ' +
      'Confirme a data com seu médico e informe a DPP (Data Provável do Parto) do seu pré-natal.',
    
    QUANTIDADE_FILHOS_OBRIGATORIA: 
      'Como você indicou que já tem filhos, precisamos saber quantos para calcular ' +
      'corretamente o valor do seu benefício. Inclua todos os filhos menores de 18 anos.',
    
    CHAVE_PIX_FORMATO: 
      'A chave PIX deve ser seu CPF (apenas números ou no formato XXX.XXX.XXX-XX). ' +
      'Importante: o CPF deve ser o mesmo da beneficiária. ' +
      'Isso garante que o benefício seja pago diretamente para você.',
    
    PRE_NATAL_IMPORTANTE: 
      'Atenção: Realizar o pré-natal é fundamental para sua saúde e do bebê. ' +
      'Se ainda não iniciou, procure a UBS mais próxima com urgência.',
    
    DOCUMENTOS_NECESSARIOS: 
      'Documentos necessários: Cartão do pré-natal, comprovante de residência, ' +
      'RG e CPF, e relatório médico com a DPP.'
  }
};
```

### Passo 2: Criar Arquivo de Constantes

**Arquivo**: `src/shared/constants/beneficio.constants.ts`

```typescript
/**
 * Constantes centralizadas do módulo de benefícios
 * 
 * RACIOCÍNIO: Centralizar valores evita "números mágicos" espalhados
 * e facilita manutenção. Se precisar mudar um valor, muda em um só lugar.
 */
export const BENEFICIO_CONSTANTS = {
  // Configurações de Cache
  CACHE: {
    TTL_SECONDS: 300, // 5 minutos - tempo seguro para dados que mudam pouco
    KEY_PREFIX: 'beneficio:',
    
    // Funções para gerar chaves consistentes
    KEYS: {
      byId: (entity: string, id: string) => `beneficio:${entity}:${id}`,
      bySolicitacao: (entity: string, id: string) => `beneficio:${entity}:sol:${id}`,
      list: (entity: string) => `beneficio:${entity}:list`,
    }
  },
  
  // Validações de Tamanho
  VALIDATION: {
    MIN_DESCRICAO: 10,        // Mínimo para descrições detalhadas
    MAX_OBSERVACOES: 500,     // Máximo para campos de observação
    MIN_NOME: 3,              // Mínimo para nomes
    MAX_NOME: 255,            // Máximo para nomes
  },
  
  // Regras de Negócio - Aluguel Social
  ALUGUEL_SOCIAL: {
    MAX_ESPECIFICACOES: 2,    // Limite de especificações adicionais
    ORIGENS_REQUEREM_UNIDADE: ['CRAS', 'CREAS', 'UBS', 'HOSPITAL'],
  },
  
  // Regras de Negócio - Cesta Básica
  CESTA_BASICA: {
    MIN_CESTAS: 1,
    MAX_CESTAS: 12,
    PESSOAS_POR_CESTA: 3,     // 1 cesta para cada 3 pessoas
    TOLERANCIA_EXTRA: 1,      // Pode pedir +1 sem justificativa
  },
  
  // Regras de Negócio - Funeral
  FUNERAL: {
    PRAZO_SOLICITACAO_DIAS: 30,  // Prazo após óbito
    DIAS_URGENCIA: 3,             // Considera urgente se < 3 dias
    TIPOS_URNA_ESPECIAL: ['INFANTIL', 'ESPECIAL', 'OBESO'],
  },
  
  // Regras de Negócio - Natalidade
  NATALIDADE: {
    PRAZO_GESTACAO_SEMANAS: 40,   // Máximo de semanas
    PRAZO_GESTACAO_DIAS: 280,     // 40 semanas em dias
    MAX_FILHOS: 20,               // Limite razoável
  },
  
  // Mapeamento de Tipos (para Factory)
  TIPO_BENEFICIO_MAP: new Map([
    // Aluguel Social
    ['ALUGUEL_SOCIAL', 'ALUGUEL_SOCIAL'],
    ['AUXILIO_ALUGUEL', 'ALUGUEL_SOCIAL'],
    ['BENEFICIO_ALUGUEL', 'ALUGUEL_SOCIAL'],
    
    // Cesta Básica
    ['CESTA_BASICA', 'CESTA_BASICA'],
    ['AUXILIO_ALIMENTACAO', 'CESTA_BASICA'],
    ['BENEFICIO_ALIMENTACAO', 'CESTA_BASICA'],
    
    // Funeral
    ['FUNERAL', 'FUNERAL'],
    ['AUXILIO_FUNERAL', 'FUNERAL'],
    ['BENEFICIO_FUNERAL', 'FUNERAL'],
    
    // Natalidade
    ['NATALIDADE', 'NATALIDADE'],
    ['AUXILIO_NATALIDADE', 'NATALIDADE'],
    ['BENEFICIO_NATALIDADE', 'NATALIDADE'],
  ]),
} as const;

// Type helper para as chaves do mapa
export type TipoBeneficioMapeado = 'ALUGUEL_SOCIAL' | 'CESTA_BASICA' | 'FUNERAL' | 'NATALIDADE';
```

### Passo 3: Refatorar AbstractDadosBeneficioService

**Arquivo**: `src/modules/beneficio/services/base/abstract-dados-beneficio.service.ts`

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Logger } from '@nestjs/common';
import { 
  throwBeneficioNotFound, 
  throwBeneficioAlreadyExists,
  BeneficioValidationErrorBuilder,
  BENEFICIO_USER_MESSAGES 
} from '../../../../shared/exceptions/error-catalog/domains/beneficio.errors';
import { BENEFICIO_CONSTANTS } from '../../../../shared/constants/beneficio.constants';

/**
 * Classe abstrata base para serviços de dados de benefício
 * 
 * PRINCÍPIOS APLICADOS:
 * - DRY: Código comum em um só lugar
 * - SRP: Apenas responsabilidades de CRUD + cache
 * - OCP: Extensível via métodos abstratos
 * - DIP: Depende de abstrações (Repository, Cache)
 */
@Injectable()
export abstract class AbstractDadosBeneficioService<
  TEntity extends { id: string; solicitacao_id: string; removed_at?: Date },
  TCreateDto extends { solicitacao_id: string },
  TUpdateDto extends Record<string, any>
> {
  protected readonly logger: Logger;
  
  constructor(
    protected readonly repository: Repository<TEntity>,
    protected readonly entityName: string,
    @Inject(CACHE_MANAGER) protected readonly cacheManager: Cache,
  ) {
    this.logger = new Logger(`${entityName}Service`);
  }
  
  /**
   * Criar dados com validação e cache
   * 
   * FLUXO:
   * 1. Validar dados específicos (delegado para classe filha)
   * 2. Verificar se já existe
   * 3. Criar e salvar
   * 4. Invalidar cache
   */
  async create(createDto: TCreateDto): Promise<TEntity> {
    this.logger.debug(`Criando ${this.entityName}`, { solicitacaoId: createDto.solicitacao_id });
    
    // 1. Validações específicas do benefício
    await this.validateCreateData(createDto);
    
    // 2. Verificar duplicação
    const exists = await this.existsBySolicitacao(createDto.solicitacao_id);
    if (exists) {
      throwBeneficioAlreadyExists(
        BENEFICIO_USER_MESSAGES.GENERIC.JA_EXISTE,
        { 
          entity: this.entityName,
          solicitacaoId: createDto.solicitacao_id 
        }
      );
    }
    
    // 3. Criar e salvar
    const entity = this.repository.create(createDto as any);
    const saved = await this.repository.save(entity);
    
    // 4. Invalidar cache da solicitação (pode ter sido consultado antes)
    await this.invalidateSolicitacaoCache(createDto.solicitacao_id);
    
    this.logger.log(`${this.entityName} criado com sucesso`, { id: saved.id });
    return saved;
  }
  
  /**
   * Buscar por ID com cache
   * 
   * ESTRATÉGIA DE CACHE:
   * - TTL de 5 minutos (dados mudam pouco após criação)
   * - Cache-aside pattern (busca no cache, se não tem busca no BD)
   */
  async findOne(id: string): Promise<TEntity> {
    const cacheKey = BENEFICIO_CONSTANTS.CACHE.KEYS.byId(this.entityName, id);
    
    // Tentar cache primeiro
    const cached = await this.cacheManager.get<TEntity>(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit', { key: cacheKey });
      return cached;
    }
    
    // Buscar no banco
    const entity = await this.repository.findOne({
      where: { id, removed_at: null } as any,
      relations: ['solicitacao'],
    });
    
    if (!entity) {
      throwBeneficioNotFound(
        BENEFICIO_USER_MESSAGES.GENERIC.NAO_ENCONTRADO,
        { entity: this.entityName, id }
      );
    }
    
    // Salvar no cache
    await this.cacheManager.set(
      cacheKey, 
      entity, 
      BENEFICIO_CONSTANTS.CACHE.TTL_SECONDS
    );
    
    return entity;
  }
  
  /**
   * Buscar por solicitação com cache
   */
  async findBySolicitacao(solicitacaoId: string): Promise<TEntity> {
    const cacheKey = BENEFICIO_CONSTANTS.CACHE.KEYS.bySolicitacao(this.entityName, solicitacaoId);
    
    // Cache logic similar to findOne
    const cached = await this.cacheManager.get<TEntity>(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit', { key: cacheKey });
      return cached;
    }
    
    const entity = await this.repository.findOne({
      where: { solicitacao_id: solicitacaoId, removed_at: null } as any,
      relations: ['solicitacao'],
    });
    
    if (!entity) {
      throwBeneficioNotFound(
        BENEFICIO_USER_MESSAGES.GENERIC.NAO_ENCONTRADO,
        { entity: this.entityName, solicitacaoId }
      );
    }
    
    await this.cacheManager.set(
      cacheKey, 
      entity, 
      BENEFICIO_CONSTANTS.CACHE.TTL_SECONDS
    );
    
    return entity;
  }
  
  /**
   * Atualizar com validação e invalidação de cache
   */
  async update(id: string, updateDto: TUpdateDto): Promise<TEntity> {
    this.logger.debug(`Atualizando ${this.entityName}`, { id });
    
    // 1. Buscar entidade atual
    const currentEntity = await this.findOne(id);
    
    // 2. Validar mudanças
    await this.validateUpdateData(updateDto, currentEntity);
    
    // 3. Aplicar mudanças
    Object.assign(currentEntity, updateDto);
    const saved = await this.repository.save(currentEntity);
    
    // 4. Invalidar todos os caches relacionados
    await this.invalidateEntityCache(id, currentEntity.solicitacao_id);
    
    this.logger.log(`${this.entityName} atualizado com sucesso`, { id });
    return saved;
  }
  
  /**
   * Remover (soft delete) com invalidação de cache
   */
  async remove(id: string): Promise<void> {
    this.logger.debug(`Removendo ${this.entityName}`, { id });
    
    const entity = await this.findOne(id);
    
    // Soft delete
    entity.removed_at = new Date();
    await this.repository.save(entity);
    
    // Invalidar cache
    await this.invalidateEntityCache(id, entity.solicitacao_id);
    
    this.logger.log(`${this.entityName} removido com sucesso`, { id });
  }
  
  /**
   * Verificar existência (otimizado - sem trazer dados)
   */
  async existsBySolicitacao(solicitacaoId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { solicitacao_id: solicitacaoId, removed_at: null } as any,
    });
    return count > 0;
  }
  
  /**
   * Métodos de Cache
   */
  protected async invalidateEntityCache(id: string, solicitacaoId: string): Promise<void> {
    const keys = [
      BENEFICIO_CONSTANTS.CACHE.KEYS.byId(this.entityName, id),
      BENEFICIO_CONSTANTS.CACHE.KEYS.bySolicitacao(this.entityName, solicitacaoId),
    ];
    
    await Promise.all(keys.map(key => this.cacheManager.del(key)));
    this.logger.debug('Cache invalidado', { keys });
  }
  
  protected async invalidateSolicitacaoCache(solicitacaoId: string): Promise<void> {
    const key = BENEFICIO_CONSTANTS.CACHE.KEYS.bySolicitacao(this.entityName, solicitacaoId);
    await this.cacheManager.del(key);
  }
  
  /**
   * Métodos abstratos - devem ser implementados pelas classes filhas
   */
  protected abstract validateCreateData(createDto: TCreateDto): Promise<void>;
  protected abstract validateUpdateData(
    updateDto: TUpdateDto, 
    currentEntity: TEntity
  ): Promise<void>;
}
```

### Passo 4: Refatorar Serviços Específicos

#### Exemplo Completo: DadosAluguelSocialService

**Arquivo**: `src/modules/beneficio/services/dados-aluguel-social.service.ts`

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { DadosAluguelSocial } from '../../../entities/dados-aluguel-social.entity';
import { 
  CreateDadosAluguelSocialDto, 
  UpdateDadosAluguelSocialDto 
} from '../dto/create-dados-aluguel-social.dto';
import { AbstractDadosBeneficioService } from './base/abstract-dados-beneficio.service';
import { 
  BeneficioValidationErrorBuilder,
  BENEFICIO_USER_MESSAGES 
} from '../../../shared/exceptions/error-catalog/domains/beneficio.errors';
import { BENEFICIO_CONSTANTS } from '../../../shared/constants/beneficio.constants';

/**
 * Serviço para gerenciar dados de Aluguel Social
 * 
 * RESPONSABILIDADES:
 * - Validar regras específicas do Aluguel Social
 * - Delegar operações CRUD para classe base
 * 
 * NÃO RESPONSABILIDADES:
 * - Buscar por público prioritário (não usado)
 * - Estatísticas (não usado)
 * - Relatórios (não usado)
 */
@Injectable()
export class DadosAluguelSocialService extends AbstractDadosBeneficioService<
  DadosAluguelSocial,
  CreateDadosAluguelSocialDto,
  UpdateDadosAluguelSocialDto
> {
  constructor(
    @InjectRepository(DadosAluguelSocial)
    repository: Repository<DadosAluguelSocial>,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
  ) {
    super(repository, 'AluguelSocial', cacheManager);
  }
  
  /**
   * Validar criação - regras específicas do Aluguel Social
   * 
   * REGRAS:
   * 1. Público prioritário obrigatório
   * 2. Máximo 2 especificações
   * 3. Situação moradia >= 10 caracteres
   * 4. Se origem específica, requer unidade
   */
  protected async validateCreateData(dto: CreateDadosAluguelSocialDto): Promise<void> {
    const errorBuilder = new BeneficioValidationErrorBuilder();
    
    // 1. Público prioritário
    errorBuilder.addIf(
      !dto.publico_prioritario,
      'publico_prioritario',
      BENEFICIO_USER_MESSAGES.GENERIC.CAMPO_OBRIGATORIO('Público prioritário')
    );
    
    // 2. Especificações
    errorBuilder.addIf(
      dto.especificacoes && dto.especificacoes.length > BENEFICIO_CONSTANTS.ALUGUEL_SOCIAL.MAX_ESPECIFICACOES,
      'especificacoes',
      BENEFICIO_USER_MESSAGES.ALUGUEL_SOCIAL.MAX_ESPECIFICACOES
    );
    
    // 3. Situação moradia
    const situacaoLength = dto.situacao_moradia_atual?.trim().length || 0;
    errorBuilder.addIf(
      situacaoLength < BENEFICIO_CONSTANTS.VALIDATION.MIN_DESCRICAO,
      'situacao_moradia_atual',
      BENEFICIO_USER_MESSAGES.ALUGUEL_SOCIAL.SITUACAO_MORADIA_CURTA
    );
    
    // 4. Unidade se origem específica
    if (dto.origem_atendimento && 
        BENEFICIO_CONSTANTS.ALUGUEL_SOCIAL.ORIGENS_REQUEREM_UNIDADE.includes(dto.origem_atendimento)) {
      errorBuilder.addIf(
        !dto.unidade_solicitante,
        'unidade_solicitante',
        BENEFICIO_USER_MESSAGES.ALUGUEL_SOCIAL.UNIDADE_REQUERIDA(dto.origem_atendimento)
      );
    }
    
    // Lançar erro se houver problemas
    errorBuilder.throw();
  }
  
  /**
   * Validar atualização - apenas campos fornecidos
   * 
   * PRINCÍPIO: Validar apenas o que está sendo alterado
   */
  protected async validateUpdateData(
    dto: UpdateDadosAluguelSocialDto,
    currentEntity: DadosAluguelSocial
  ): Promise<void> {
    const errorBuilder = new BeneficioValidationErrorBuilder();
    
    // Validar especificações se fornecidas
    if (dto.especificacoes !== undefined) {
      errorBuilder.addIf(
        dto.especificacoes.length > BENEFICIO_CONSTANTS.ALUGUEL_SOCIAL.MAX_ESPECIFICACOES,
        'especificacoes',
        BENEFICIO_USER_MESSAGES.ALUGUEL_SOCIAL.MAX_ESPECIFICACOES
      );
    }
    
    // Validar situação moradia se fornecida
    if (dto.situacao_moradia_atual !== undefined) {
      const situacaoLength = dto.situacao_moradia_atual.trim().length;
      errorBuilder.addIf(
        situacaoLength < BENEFICIO_CONSTANTS.VALIDATION.MIN_DESCRICAO,
        'situacao_moradia_atual',
        BENEFICIO_USER_MESSAGES.ALUGUEL_SOCIAL.SITUACAO_MORADIA_CURTA
      );
    }
    
    errorBuilder.throw();
  }
  
  // REMOVIDOS: findByPublicoPrioritario, getEstatisticas, etc.
  // Seguindo YAGNI - não implementar até ser necessário
}
```

#### Exemplo: DadosCestaBasicaService (Validação com Lógica de Negócio)

```typescript
/**
 * Validar criação - Cesta Básica tem regra de quantidade recomendada
 */
protected async validateCreateData(dto: CreateDadosCestaBasicaDto): Promise<void> {
  const errorBuilder = new BeneficioValidationErrorBuilder();
  
  // Campos obrigatórios básicos
  errorBuilder.addIf(
    !dto.quantidade_cestas_solicitadas || dto.quantidade_cestas_solicitadas < BENEFICIO_CONSTANTS.CESTA_BASICA.MIN_CESTAS,
    'quantidade_cestas_solicitadas',
    BENEFICIO_USER_MESSAGES.CESTA_BASICA.QUANTIDADE_INVALIDA
  );
  
  errorBuilder.addIf(
    dto.quantidade_cestas_solicitadas > BENEFICIO_CONSTANTS.CESTA_BASICA.MAX_CESTAS,
    'quantidade_cestas_solicitadas',
    BENEFICIO_USER_MESSAGES.GENERIC.VALOR_MAXIMO('Quantidade de cestas', BENEFICIO_CONSTANTS.CESTA_BASICA.MAX_CESTAS)
  );
  
  // Lógica de negócio: verificar se precisa justificativa
  if (dto.numero_pessoas_familia && dto.quantidade_cestas_solicitadas) {
    const recomendado = Math.ceil(dto.numero_pessoas_familia / BENEFICIO_CONSTANTS.CESTA_BASICA.PESSOAS_POR_CESTA);
    const limite = recomendado + BENEFICIO_CONSTANTS.CESTA_BASICA.TOLERANCIA_EXTRA;
    
    if (dto.quantidade_cestas_solicitadas > limite) {
      errorBuilder.addIf(
        !dto.justificativa_quantidade || dto.justificativa_quantidade.trim().length < BENEFICIO_CONSTANTS.VALIDATION.MIN_DESCRICAO,
        'justificativa_quantidade',
        BENEFICIO_USER_MESSAGES.CESTA_BASICA.JUSTIFICATIVA_REQUIRED
      );
      
      // Adicionar dica sobre cálculo
      this.logger.debug(
        BENEFICIO_USER_MESSAGES.CESTA_BASICA.CALCULO_RECOMENDACAO(dto.numero_pessoas_familia)
      );
    }
  }
  
  // Validar unidade para encaminhamentos externos
  if (dto.origem_atendimento === OrigemAtendimentoEnum.ENCAMINHAMENTO_EXTERNO) {
    errorBuilder.addIf(
      !dto.unidade_solicitante,
      'unidade_solicitante',
      BENEFICIO_USER_MESSAGES.CESTA_BASICA.UNIDADE_ENCAMINHAMENTO
    );
  }
  
  errorBuilder.throw();
}
```

### Passo 5: Refatorar DadosBeneficioFactoryService

```typescript
import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { 
  throwBeneficioNotFound,
  throwBeneficioValidationError,
  throwBeneficioBusinessRuleError,
  BENEFICIO_USER_MESSAGES 
} from '../../../shared/exceptions/error-catalog/domains/beneficio.errors';
import { BENEFICIO_CONSTANTS, TipoBeneficioMapeado } from '../../../shared/constants/beneficio.constants';
import { StatusSolicitacao } from '../../../enums/status-solicitacao.enum';

/**
 * Factory Service - Padrão Factory Method
 * 
 * RESPONSABILIDADES:
 * - Resolver tipo de benefício correto
 * - Delegar para serviço específico
 * - Coordenar com workflow
 * 
 * MELHORIAS IMPLEMENTADAS:
 * - Mapeamento simplificado com Map
 * - Tratamento de erro amigável
 * - Não falha se workflow falhar (graceful degradation)
 */
@Injectable()
export class DadosBeneficioFactoryService {
  private readonly logger = new Logger(DadosBeneficioFactoryService.name);
  private readonly serviceMap = new Map<TipoBeneficioMapeado, any>();
  
  constructor(
    // ... injeções ...
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    // Configurar mapa de serviços
    this.serviceMap.set('ALUGUEL_SOCIAL', this.dadosAluguelSocialService);
    this.serviceMap.set('CESTA_BASICA', this.dadosCestaBasicaService);
    this.serviceMap.set('FUNERAL', this.dadosFuneralService);
    this.serviceMap.set('NATALIDADE', this.dadosNatalidadeService);
  }
  
  /**
   * Criar dados de benefício
   * 
   * FLUXO DETALHADO:
   * 1. Resolver tipo (código -> tipo mapeado)
   * 2. Validar tipo vs solicitação
   * 3. Verificar duplicação
   * 4. Criar dados via serviço específico
   * 5. Atualizar workflow (não crítico)
   */
  async create(
    codigoOrId: string,
    createDto: ICreateDadosBeneficioDto,
    usuarioId: string,
  ): Promise<IDadosBeneficio & { _warning?: string }> {
    this.logger.debug('Iniciando criação de dados de benefício', { 
      codigoOrId, 
      solicitacaoId: createDto.solicitacao_id 
    });
    
    // 1. Resolver tipo
    const tipoBeneficio = await this.resolveTipo(codigoOrId);
    
    // 2. Validar compatibilidade
    await this.validarTipoCompativel(createDto.solicitacao_id, tipoBeneficio);
    
    // 3. Verificar duplicação (todos os tipos)
    await this.verificarDuplicacao(createDto.solicitacao_id);
    
    // 4. Criar via serviço específico
    const service = this.getService(tipoBeneficio);
    const dadosBeneficio = await service.create(createDto);
    
    // 5. Atualizar workflow (graceful degradation)
    try {
      await this.workflowSolicitacaoService.atualizarStatus(
        createDto.solicitacao_id,
        StatusSolicitacao.AGUARDANDO_DOCUMENTOS,
        usuarioId,
        {
          observacao: BENEFICIO_USER_MESSAGES.GENERIC.STATUS_ATUALIZADO,
          dadosBeneficioId: dadosBeneficio.id,
          tipoBeneficio,
        }
      );
    } catch (error) {
      // Não falhar operação principal
      this.logger.warn('Falha ao atualizar workflow, dados salvos com sucesso', {
        error: error.message,
        solicitacaoId: createDto.solicitacao_id,
      });
      
      // Informar usuário de forma transparente
      (dadosBeneficio as any)._warning = BENEFICIO_USER_MESSAGES.GENERIC.STATUS_NAO_ATUALIZADO;
    }
    
    this.logger.log('Dados de benefício criados com sucesso', {
      id: dadosBeneficio.id,
      tipo: tipoBeneficio,
    });
    
    return dadosBeneficio;
  }
  
  /**
   * Resolver tipo de benefício
   * 
   * ESTRATÉGIA:
   * 1. Verificar se já é tipo válido
   * 2. Buscar no mapa de códigos
   * 3. Buscar no banco (último recurso)
   */
  private async resolveTipo(codigoOrId: string): Promise<TipoBeneficioMapeado> {
    // Normalizar entrada
    const normalized = codigoOrId.toUpperCase().trim();
    
    // 1. Já é tipo válido?
    if (this.serviceMap.has(normalized as TipoBeneficioMapeado)) {
      return normalized as TipoBeneficioMapeado;
    }
    
    // 2. Buscar no mapa
    const mapped = BENEFICIO_CONSTANTS.TIPO_BENEFICIO_MAP.get(normalized);
    if (mapped) {
      return mapped as TipoBeneficioMapeado;
    }
    
    // 3. Buscar no banco (com cache)
    const cacheKey = `tipo-beneficio:${normalized}`;
    const cached = await this.cacheManager.get<string>(cacheKey);
    if (cached) {
      return cached as TipoBeneficioMapeado;
    }
    
    // Query banco
    const tipoBeneficio = await this.tipoBeneficioRepository.findOne({
      where: [
        { codigo: normalized },
        { id: codigoOrId }, // UUID original
      ],
    });
    
    if (!tipoBeneficio) {
      throwBeneficioNotFound(
        `Tipo de benefício "${codigoOrId}" não encontrado. ` +
        `Tipos disponíveis: Aluguel Social, Cesta Básica, Auxílio Funeral, Auxílio Natalidade.`,
        { codigo: codigoOrId }
      );
    }
    
    // Mapear código do banco
    const tipoMapeado = BENEFICIO_CONSTANTS.TIPO_BENEFICIO_MAP.get(tipoBeneficio.codigo);
    if (!tipoMapeado) {
      throwBeneficioBusinessRuleError(
        `O benefício "${tipoBeneficio.nome}" existe mas ainda não está disponível para cadastro online. ` +
        `Por favor, procure o CRAS mais próximo.`,
        { tipoBeneficio: tipoBeneficio.nome }
      );
    }
    
    // Cachear resultado
    await this.cacheManager.set(cacheKey, tipoMapeado, 3600); // 1 hora
    
    return tipoMapeado as TipoBeneficioMapeado;
  }
  
  /**
   * Verificar duplicação em TODOS os tipos
   * 
   * OTIMIZAÇÃO: Usar Promise.all com queries COUNT
   */
  private async verificarDuplicacao(solicitacaoId: string): Promise<void> {
    const checks = Array.from(this.serviceMap.values()).map(
      service => service.existsBySolicitacao(solicitacaoId)
    );
    
    const results = await Promise.all(checks);
    
    if (results.some(exists => exists)) {
      throwBeneficioAlreadyExists(
        BENEFICIO_USER_MESSAGES.GENERIC.JA_EXISTE,
        { solicitacaoId }
      );
    }
  }
  
  // Demais métodos seguem padrão similar...
}
```

### Passo 6: Estrutura de Testes

```typescript
// Exemplo de teste para validações
describe('DadosAluguelSocialService', () => {
  describe('validateCreateData', () => {
    it('deve validar todos os campos obrigatórios', async () => {
      const dto = {
        solicitacao_id: 'uuid',
        // campos faltando
      };
      
      await expect(service.create(dto)).rejects.toThrow(
        'Por favor, corrija os seguintes problemas:'
      );
    });
    
    it('deve permitir no máximo 2 especificações', async () => {
      const dto = {
        // ...
        especificacoes: ['spec1', 'spec2', 'spec3'], // 3 itens
      };
      
      await expect(service.create(dto)).rejects.toThrow(
        BENEFICIO_USER_MESSAGES.ALUGUEL_SOCIAL.MAX_ESPECIFICACOES
      );
    });
  });
});
```

## 4. Checklist de Implementação

### Fase 1: Preparação
- [ ] Criar branch feature/refactor-beneficios
- [ ] Fazer backup do código atual
- [ ] Configurar testes automatizados

### Fase 2: Fundação
- [ ] Adicionar mensagens ao catálogo de erros existente
- [ ] Criar arquivo de constantes
- [ ] Configurar cache manager no módulo

### Fase 3: Refatoração Core
- [ ] Refatorar AbstractDadosBeneficioService
- [ ] Adicionar testes unitários para classe base
- [ ] Verificar que testes passam

### Fase 4: Serviços Específicos (um por vez)
- [ ] DadosAluguelSocialService
  - [ ] Remover métodos não usados
  - [ ] Implementar novas validações
  - [ ] Atualizar testes
- [ ] DadosCestaBasicaService
  - [ ] Remover métodos não usados
  - [ ] Implementar lógica de recomendação
  - [ ] Atualizar testes
- [ ] DadosFuneralService
  - [ ] Remover métodos não usados
  - [ ] Implementar validações de prazo
  - [ ] Atualizar testes
- [ ] DadosNatalidadeService
  - [ ] Simplificar validações
  - [ ] Melhorar mensagens
  - [ ] Atualizar testes

### Fase 5: Factory e Controller
- [ ] Refatorar DadosBeneficioFactoryService
- [ ] Simplificar controller
- [ ] Atualizar documentação Swagger

### Fase 6: Validação Final
- [ ] Executar todos os testes
- [ ] Testar manualmente cada tipo
- [ ] Verificar logs e mensagens
- [ ] Medir redução de código
- [ ] Code review

## 5. Métricas de Sucesso

### Quantitativas
- **Redução de código**: ~40% menos linhas
- **Cobertura de testes**: >90%
- **Performance**: Queries reduzidas em 60% (via cache)
- **Duplicação**: 0% (medido via SonarQube)

### Qualitativas
- **Mensagens**: 100% orientadas ao usuário
- **Manutenibilidade**: Nota A no SonarQube
- **Documentação**: Auto-explicativa via código limpo
- **Experiência**: Feedback positivo dos usuários

## 6. Considerações Finais

### Riscos e Mitigações
1. **Risco**: Quebrar funcionalidade existente
   - **Mitigação**: Testes abrangentes, deploy gradual

2. **Risco**: Cache inconsistente
   - **Mitigação**: TTL curto, invalidação agressiva

3. **Risco**: Resistência da equipe
   - **Mitigação**: Documentação clara, pair programming

### Próximos Passos (Pós-Refatoração)
1. Implementar webhooks para notificações
2. Adicionar métricas de uso
3. Criar dashboard administrativo
4. Implementar versionamento de API

### Lições Aprendidas
- Menos é mais (KISS)
- Mensagens importam (UX Writing)
- Cache resolve 80% dos problemas de performance
- Testes são investimento, não custo