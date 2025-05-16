# Registro de Decisão de Arquitetura (ADR)

## ADR 001: Modelo de Relacionamento para Papéis de Cidadão

### Data: 16/05/2025

### Status: Proposto

### Contexto

No Sistema de Gestão de Benefícios Eventuais da SEMTAS, os cidadãos podem assumir diferentes papéis (beneficiário, solicitante, representante legal). Atualmente, o modelo de dados utiliza um campo de tipo na entidade Cidadão para identificar esses papéis, o que causa problemas quando um mesmo cidadão precisa exercer múltiplos papéis no sistema:

- Cidadãos são identificados pelo CPF, que deve ser único
- Um mesmo cidadão pode exercer diferentes papéis em diferentes contextos (ex: ser beneficiário em uma solicitação e representante legal em outra)
- O sistema atual impede o cadastro de um cidadão com CPF já existente mesmo quando o objetivo é atribuir um papel diferente
- Existem regras de negócio específicas baseadas nos papéis (ex: apenas representantes legais podem solicitar benefícios para menores)
- Para papéis específicos, como o solicitante, existem dados adicionais necessários (ex: grau de parentesco)

### Decisão

**Substituir o campo de tipo na entidade Cidadão por um modelo de relacionamentos utilizando uma entidade intermediária que associa o cidadão aos seus papéis.**

Especificamente:

1. Remover o campo `tipo` da entidade Cidadão
2. Criar uma nova entidade `CidadaoPapel` que estabelece uma relação N:M entre cidadãos e os papéis que podem assumir
3. Modificar a entidade Solicitação para referenciar o papel específico de um cidadão no contexto daquela solicitação

### Modelo Proposto

```typescript
// Entidade Cidadao (sem campo tipo)
@Entity()
export class Cidadao {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column({ unique: true })
  cpf: string;
  
  @Column()
  nome: string;
  
  // Outros dados comuns...
  
  @OneToMany(() => CidadaoPapel, papel => papel.cidadao)
  papeis: CidadaoPapel[];
}

// Entidade CidadaoPapel
@Entity()
export class CidadaoPapel {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @ManyToOne(() => Cidadao, cidadao => cidadao.papeis)
  cidadao: Cidadao;
  
  @Column({
    type: 'enum',
    enum: ['beneficiario', 'solicitante', 'representante_legal'],
  })
  tipo: string;
  
  @Column({ nullable: true })
  grauParentesco?: string; // Campo adicional para solicitantes/representantes
  
  // Outros campos específicos para cada papel, se necessário
}

// Entidade Solicitacao
@Entity()
export class Solicitacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @ManyToOne(() => Cidadao)
  beneficiario: Cidadao;
  
  @ManyToOne(() => CidadaoPapel)
  solicitante: CidadaoPapel; // Referência ao papel específico
  
  // Outros campos...
}
```

### Consequências

#### Positivas:

1. **Unicidade preservada**: Cada cidadão é cadastrado apenas uma vez no sistema, respeitando a unicidade do CPF.
2. **Flexibilidade de papéis**: Um cidadão pode exercer múltiplos papéis simultaneamente ou em contextos diferentes.
3. **Dados específicos por papel**: A entidade intermediária permite armazenar informações específicas para cada papel (como grau de parentesco).
4. **Integridade referencial**: As solicitações referenciam explicitamente o papel do cidadão naquele contexto.
5. **Regras de negócio simplificadas**: Facilita a implementação de regras como "apenas representantes legais podem solicitar benefícios para menores".
6. **Queries otimizadas**: Permite consultas mais específicas, como "listar todos os cidadãos que são representantes legais".

#### Negativas:

1. **Complexidade adicional**: O modelo tem mais entidades e relacionamentos, aumentando a complexidade.
2. **Migração necessária**: Será necessário migrar os dados existentes para o novo modelo.
3. **Adaptação de APIs**: Endpoints existentes precisarão ser modificados para acomodar o novo modelo.
4. **Impacto no frontend**: Fluxos de cadastro e seleção de cidadãos precisarão ser adaptados.

### Alternativas Consideradas

1. **Campo de tipo como array**: Usar um campo JSON/array para armazenar múltiplos tipos por cidadão. Rejeitado por dificultar queries e validações.
2. **Flags booleanas**: Adicionar campos booleanos para cada tipo (é_beneficiario, é_solicitante). Rejeitado por dificultar a adição de novos tipos e não permitir dados específicos por tipo.
3. **Entidades separadas**: Criar entidades específicas para cada tipo (Beneficiario, Solicitante) relacionadas a Cidadao. Rejeitado por aumentar a duplicação de código e dificultar manutenção.

### Plano de Implementação

1. **Criação da Estrutura**:
   - Criar a entidade `CidadaoPapel`
   - Modificar a entidade `Cidadao` removendo o campo tipo
   - Atualizar a entidade `Solicitacao` para referenciar `CidadaoPapel`

2. **Migração de Dados**:
   - Desenvolver script de migração para converter cidadãos existentes:
     ```typescript
     // Pseudocódigo para migração
     for (const cidadao of cidadaosExistentes) {
       // Criar registro em CidadaoPapel para o tipo atual
       await cidadaoPapelRepository.save({
         cidadao: { id: cidadao.id },
         tipo: cidadao.tipo,
         // Outros campos específicos se necessário
       });
     }
     ```

3. **Atualização de Serviços**:
   - Modificar `CidadaoService` para gerenciar papéis
   - Implementar método para adicionar papel a um cidadão existente
   - Atualizar validações e regras de negócio para usar o novo modelo

4. **Adaptação de APIs**:
   - Atualizar DTOs para refletir o novo modelo
   - Modificar endpoints para cadastro e consulta de cidadãos
   - Criar endpoints específicos para gerenciar papéis

5. **Testes**:
   - Atualizar testes unitários e de integração
   - Adicionar testes específicos para os novos cenários

### Critérios de Aceitação

- Um cidadão pode ser cadastrado uma única vez (CPF único)
- Um cidadão pode ter múltiplos papéis atribuídos
- É possível adicionar um novo papel a um cidadão existente
- Dados específicos por papel podem ser armazenados
- A regra "apenas representantes legais podem solicitar benefícios para menores" é validada corretamente
- As consultas por papel específico funcionam corretamente
- O histórico de papéis de um cidadão é facilmente acessível

---

### Referências

- [Documentação da Plataforma de Gestão de Benefícios Eventuais](../../../Product%20Requirements%20Document%20(PRD).md)
- [Lei Municipal 7.205/2021](link_para_lei)
- [Decreto Municipal 12.346/2021](link_para_decreto)
- [TypeORM Relations Documentation](https://typeorm.io/#/relations)