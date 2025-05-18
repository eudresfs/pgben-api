# Documentação Técnica do Módulo de Integradores do PGBen

## Visão Geral

O módulo de integradores do PGBen permite que sistemas externos acessem a API de forma segura e controlada. Esta documentação técnica detalha a implementação, arquitetura e decisões técnicas tomadas durante o desenvolvimento.

## Modelo de Dados

### Entidades Principais

#### Integrador

Representa um sistema ou parceiro externo que consome a API do PGBen.

| Campo            | Tipo      | Descrição                                       |
|------------------|-----------|--------------------------------------------------|
| id               | UUID      | Identificador único                             |
| nome             | String    | Nome do integrador (único)                      |
| descricao        | String    | Descrição do integrador                         |
| responsavel      | String    | Nome do responsável pelo integrador             |
| emailContato     | String    | Email para contato                              |
| telefoneContato  | String    | Telefone para contato                           |
| ativo            | Boolean   | Status de ativação do integrador                |
| permissoesEscopo | String[]  | Lista de escopos que o integrador pode utilizar |
| ipPermitidos     | String[]  | Lista de IPs permitidos para acesso             |
| ultimoAcesso     | Date      | Data e hora do último acesso                    |
| dataCriacao      | Date      | Data e hora de criação do registro              |
| dataAtualizacao  | Date      | Data e hora da última atualização               |

#### IntegradorToken

Representa um token de acesso para um integrador específico.

| Campo           | Tipo      | Descrição                                     |
|-----------------|-----------|----------------------------------------------|
| id              | UUID      | Identificador único                          |
| integradorId    | UUID      | ID do integrador (FK)                        |
| nome            | String    | Nome do token                                |
| descricao       | String    | Descrição do token                           |
| tokenHash       | String    | Hash do token (nunca o token em texto puro)  |
| escopos         | String[]  | Lista de escopos de permissão                |
| dataExpiracao   | Date      | Data de expiração (null = sem expiração)     |
| revogado        | Boolean   | Indica se o token foi revogado               |
| dataRevogacao   | Date      | Data da revogação (se aplicável)             |
| motivoRevogacao | String    | Motivo da revogação (se aplicável)           |
| ultimoUso       | Date      | Data e hora do último uso                    |
| dataCriacao     | Date      | Data e hora de criação                       |

#### TokenRevogado

Armazena informações sobre tokens revogados para consulta rápida.

| Campo           | Tipo      | Descrição                                     |
|-----------------|-----------|----------------------------------------------|
| id              | UUID      | Identificador único                          |
| tokenHash       | String    | Hash do token revogado                       |
| integradorId    | String    | ID do integrador                             |
| motivoRevogacao | String    | Motivo da revogação                          |
| dataExpiracao   | Date      | Data de expiração original                   |
| dataCriacao     | Date      | Data e hora da revogação                     |
| dataLimpeza     | Date      | Data em que o registro pode ser removido     |

## Arquitetura

### Componentes Principais

1. **IntegradorService**: Gerencia o ciclo de vida dos integradores, com operações CRUD e regras de negócio específicas.

2. **IntegradorTokenService**: Responsável por criar, validar e revogar tokens de acesso, com suporte a tokens de longa duração e sem expiração.

3. **IntegradorAuthService**: Implementa a lógica de autenticação e autorização, incluindo validação de tokens, verificação de permissões e restrições de IP.

4. **IntegradorAuthGuard**: Guard NestJS que protege endpoints específicos, verificando a validade do token e os escopos necessários.

5. **Decoradores Personalizados**:
   - `@Escopos()`: Define os escopos necessários para acessar um endpoint.
   - `@GetIntegrador()`: Extrai o objeto integrador da requisição para uso nos controllers.

### Fluxo de Autenticação

1. Um sistema externo envia uma requisição à API com o token no cabeçalho `Authorization: Bearer {token}`.
2. O `IntegradorAuthGuard` intercepta a requisição e extrai o token.
3. O `IntegradorAuthService` valida o token usando o `IntegradorTokenService`.
4. O serviço verifica a assinatura do token, se não está expirado ou revogado, e se o integrador está ativo.
5. O guard verifica se o token possui os escopos necessários para acessar o endpoint.
6. Se a validação for bem-sucedida, a requisição continua para o controller, caso contrário, retorna um erro apropriado.

### Sistema de Escopos

O sistema de permissões é baseado em escopos no formato `acao:recurso`, como:

- `read:cidadaos`: Permite ler dados de cidadãos
- `write:solicitacoes`: Permite criar/editar solicitações
- `delete:documentos`: Permite excluir documentos

Os escopos são validados em cada requisição, garantindo que o integrador tenha apenas as permissões necessárias.

### Segurança

1. **Armazenamento Seguro**: Apenas o hash do token é armazenado, nunca o token original.
2. **Restrições de IP**: Capacidade de limitar acesso a IPs específicos por integrador.
3. **Revogação Imediata**: Sistema para revogar tokens compromissados instantaneamente.
4. **Logs e Auditoria**: Registro detalhado de todas as tentativas de acesso.
5. **Tokens Assimétricos**: Utilização de algoritmo RS256 para assinatura de tokens.

## Implementação

### Serviços Principais

#### IntegradorService

Fornece operações CRUD para gerenciamento de integradores:
- Criação, atualização e exclusão de integradores
- Listagem de integradores cadastrados
- Ativação/desativação de integradores
- Registro de acessos

#### IntegradorTokenService

Gerencia tokens de acesso:
- Geração de tokens JWT com ou sem expiração
- Validação de tokens
- Verificação de escopos
- Revogação de tokens
- Limpeza periódica de tokens revogados expirados

#### IntegradorAuthService

Implementa a lógica de autenticação:
- Extração e validação de tokens
- Verificação de restrições de IP
- Validação de permissões baseadas em escopos
- Registro de tentativas de acesso

### Endpoints da API

#### Gerenciamento de Integradores

| Método | Rota                          | Descrição                          | Permissão Necessária |
|--------|-------------------------------|-----------------------------------|----------------------|
| GET    | /integradores                 | Lista todos os integradores       | ADMIN                |
| GET    | /integradores/:id             | Obtém um integrador específico    | ADMIN                |
| POST   | /integradores                 | Cria um novo integrador           | ADMIN                |
| PATCH  | /integradores/:id             | Atualiza um integrador            | ADMIN                |
| DELETE | /integradores/:id             | Remove um integrador              | ADMIN                |
| PATCH  | /integradores/:id/status      | Ativa/desativa um integrador      | ADMIN                |

#### Gerenciamento de Tokens

| Método | Rota                                    | Descrição                         | Permissão Necessária |
|--------|-----------------------------------------|----------------------------------|----------------------|
| GET    | /integradores/:id/tokens                | Lista tokens de um integrador    | ADMIN                |
| POST   | /integradores/:id/tokens                | Cria um novo token               | ADMIN                |
| PATCH  | /integradores/:id/tokens/:tokenId/revogar | Revoga um token                | ADMIN                |

## Considerações Técnicas

### Desempenho

O módulo foi projetado considerando o desempenho:
- Índices apropriados em todas as tabelas
- Sistema de cache para validação de tokens revogados
- Otimização de consultas para baixa latência

### Escalabilidade

A arquitetura suporta crescimento:
- Separação clara de responsabilidades entre serviços
- Limpeza periódica de tokens revogados
- Estrutura extensível para adição de novas funcionalidades

### Manutenibilidade

O código foi implementado seguindo boas práticas:
- Alta cobertura de testes automatizados
- Documentação detalhada de APIs e contratos
- Separação clara de responsabilidades
- Nomenclatura consistente

## Testes

O módulo inclui testes abrangentes:

1. **Testes Unitários**:
   - `integrador.service.spec.ts`
   - `integrador-token.service.spec.ts`
   - `integrador-auth.service.spec.ts`

2. **Testes de Integração**:
   - Validação de fluxos completos de autenticação e autorização
   - Validação de restrições e escopos

## Decisões Arquiteturais

### Tokens JWT de Longa Duração

Optamos por usar tokens JWT de longa duração para facilitar a integração com sistemas externos. Esta abordagem elimina a necessidade de refresh tokens e reduz a complexidade para os integradores.

Para mitigar riscos de segurança:
- Implementamos um sistema de revogação imediata
- Permitimos restrições de IP
- Mantemos registro detalhado de uso
- Utilizamos escopos granulares para limitar o acesso

### Separação do Sistema de Autenticação

Mantivemos o sistema de integradores separado do sistema de autenticação de usuários humanos, pois têm requisitos e ciclos de vida distintos. Isso permite:
- Configurações específicas para cada tipo de acesso
- Melhor auditoria e controle
- Simplificação da gestão de acessos externos

### Armazenamento Apenas de Hashes

Nunca armazenamos o token original no banco de dados, apenas seu hash. Isso:
- Aumenta a segurança em caso de exposição do banco de dados
- Previne vazamento de credenciais
- Segue as melhores práticas de segurança

## Futuras Melhorias

1. **Cache Distribuído**: Implementar um sistema de cache distribuído (Redis) para a lista de tokens revogados, melhorando o desempenho em ambientes com múltiplas instâncias.

2. **Métricas de Uso**: Adicionar métricas detalhadas de uso por integrador para melhor monitoramento e detecção de anomalias.

3. **Rate Limiting**: Implementar limitação de taxa de requisições por integrador para prevenir abusos.

4. **Versões de API**: Suporte a versionamento de API para evoluir a interface sem quebrar integrações existentes.
