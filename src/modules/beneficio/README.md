# Módulo de Benefício - PGBen

## Visão Geral

O módulo de Benefício é responsável exclusivamente pela configuração e definição dos tipos de benefícios disponíveis no sistema PGBen. Este módulo foi refatorado para seguir os princípios SOLID, DRY, YAGNI e KISS, garantindo uma arquitetura limpa e de fácil manutenção.

## Responsabilidades do Módulo

O módulo de Benefício é responsável por:

- Gerenciar a configuração dos tipos de benefícios
- Definir os campos dinâmicos para cada tipo de benefício
- Gerenciar as versões dos schemas de benefícios
- Fornecer endpoints para consulta de tipos de benefícios e suas configurações

Este módulo **não é mais responsável** por:
- Gerenciar solicitações de benefícios (migrado para o módulo de Solicitação)
- Gerenciar workflow de solicitações (migrado para o módulo de Solicitação)
- Gerenciar processos judiciais (migrado para o módulo de Solicitação)
- Gerenciar determinações judiciais (migrado para o módulo de Solicitação)

## Arquitetura

A arquitetura do módulo segue o padrão de Clean Architecture, com a seguinte estrutura:

```
beneficio/
├── controllers/          # Controladores da API
├── database/             # Migrations específicas do módulo
│   └── migrations/       # Migrations para gerenciar schemas e campos dinâmicos
├── dto/                  # Objetos de transferência de dados
├── entities/             # Entidades de domínio
├── repositories/         # Repositórios para acesso a dados
└── services/             # Serviços com lógica de negócio
```

## Relações com Outros Módulos

### Módulo de Solicitação

- O módulo de Benefício **é consumido pelo** módulo de Solicitação
- O módulo de Benefício **não conhece** detalhes internos do módulo de Solicitação
- A relação é unidirecional: Solicitação -> Benefício

## Endpoints Principais

### Tipos de Benefício

- `GET /v1/beneficio/tipos` - Listar todos os tipos de benefício
- `GET /v1/beneficio/tipos/:id` - Obter detalhes de um tipo de benefício
- `POST /v1/beneficio/tipos` - Criar um novo tipo de benefício
- `PUT /v1/beneficio/tipos/:id` - Atualizar um tipo de benefício
- `DELETE /v1/beneficio/tipos/:id` - Excluir um tipo de benefício

### Campos Dinâmicos

- `GET /v1/beneficio/tipos/:id/campos` - Listar campos dinâmicos de um tipo de benefício
- `POST /v1/beneficio/tipos/:id/campos` - Adicionar campo dinâmico a um tipo de benefício
- `PUT /v1/beneficio/tipos/:id/campos/:campoId` - Atualizar campo dinâmico
- `DELETE /v1/beneficio/tipos/:id/campos/:campoId` - Remover campo dinâmico

## Princípios Arquiteturais Aplicados

### SOLID

- **Single Responsibility Principle**: Cada classe tem uma única responsabilidade
- **Open/Closed Principle**: O código é aberto para extensão, fechado para modificação
- **Liskov Substitution Principle**: As classes derivadas podem substituir suas classes base
- **Interface Segregation Principle**: Interfaces específicas são melhores que uma interface geral
- **Dependency Inversion Principle**: Dependa de abstrações, não de implementações concretas

### DRY (Don't Repeat Yourself)

- Lógica comum de validação e acesso a dados centralizada nos serviços
- Reutilização de código através de métodos auxiliares

### YAGNI (You Aren't Gonna Need It)

- Implementação apenas de funcionalidades necessárias
- Sem código especulativo ou "por precaução"

### KISS (Keep It Simple, Stupid)

- Código simples e direto
- Soluções elegantes e fáceis de entender

## Evitando Referências Circulares

Para evitar referências circulares entre módulos:

1. O módulo de Benefício não conhece nem referencia o módulo de Solicitação
2. O módulo de Solicitação conhece e referencia o módulo de Benefício
3. As relações são sempre unidirecionais
4. As foreign keys são gerenciadas pelo módulo que as referencia (Solicitação)

## Manutenção e Evolução

Ao adicionar novas funcionalidades ao módulo de Benefício:

1. Mantenha o foco apenas na configuração de benefícios
2. Não adicione responsabilidades relacionadas a solicitações ou workflow
3. Evite criar dependências circulares
4. Adicione testes para as novas funcionalidades
5. Atualize a documentação conforme necessário
