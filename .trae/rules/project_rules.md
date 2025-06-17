# Regras do Projeto - API REST SEMTAS

REGRAS DE OURO:
- Sempre avalie se a implementação tem overengineering e, em caso afirmativo, avalie se a implementação é realmente necessária.
- Nunca implemente nada fora do escopo do projeto. Todas as documentações estão disponíveis no repositório na pasta /docs.
- Aguarde de 30 a 45 segundos quando iniciar o servidor

## 1. Padrões de Código e Estilo

### 1.1 Convenções de Nomenclatura
- Usar camelCase para nomes de variáveis, funções e propriedades
- Usar PascalCase para nomes de classes, interfaces e tipos
- Usar snake_case para propriedades de entidades e enums
- Prefixar interfaces com 'I' (ex: IUserService)
- Sufixar DTOs com 'Dto' (ex: CreateUserDto)

### 1.2 Formatação
- Usar 2 espaços para indentação
- Usar ponto e vírgula no final das declarações
- Limitar linhas a 100 caracteres
- Usar aspas simples para strings
- Rodar linters e formatadores de código antes de commitar

### 1.3 Comentários
- Comentar código complexo
- Documentar código que não é trivial
- Usar comentários de linha para explicação rápida
- Usar comentários de bloco para explicação mais detalhada

## 2. Framework e Tecnologias

### 2.1 Stack Principal
- NestJS como framework principal
- TypeScript como linguagem de programação
- TypeORM como ORM
- PostgreSQL como banco de dados

### 2.2 Ferramentas de Desenvolvimento
- Jest para testes unitários
- Supertest para testes de integração
- ESLint para linting
- Prettier para formatação de código

## 3. Estrutura do Projeto

### 3.1 Organização de Módulos
- Separar código por domínio em módulos
- Separar entities e enums em pastas separadas
- Cada módulo deve ter sua própria pasta
- Seguir estrutura recomendada do NestJS:
  - controllers/
  - services/
  - dtos/
  - interfaces/

### 3.2 Nomenclatura de Arquivos
- `*.controller.ts` para controladores
- `*.service.ts` para serviços
- `*.entity.ts` para entidades
- `*.dto.ts` para DTOs
- `*.interface.ts` para interfaces
- `*.spec.ts` para testes

## 4. APIs e Endpoints

### 4.1 Padrões REST
- Usar verbos HTTP apropriados (GET, POST, PUT, DELETE)
- Usar substantivos no plural para recursos
- Implementar paginação para listas
- Versionar API via URL (/v1/...)

### 4.2 Documentação
- Documentar todos endpoints com Swagger
- Incluir descrições detalhadas dos parâmetros
- Documentar possíveis respostas e códigos de erro

## 5. Segurança

### 5.1 Autenticação e Autorização
- Implementar JWT para autenticação
- Usar Guards para proteção de rotas
- Implementar ABAC para autorização

### 5.2 Práticas de Segurança
- Sanitizar inputs do usuário
- Implementar rate limiting
- Usar HTTPS em produção
- Implementar validação de dados com class-validator

## 6. Tratamento de Erros

### 6.1 Padronização
- Usar filtros de exceção globais
- Retornar respostas de erro consistentes
- Implementar logging adequado

### 6.2 Códigos HTTP
- 200: Sucesso
- 201: Criação
- 400: Erro do cliente
- 401: Não autorizado
- 403: Proibido
- 404: Não encontrado
- 500: Erro do servidor

## 7. Performance

### 7.1 Otimizações
- Usar cache quando apropriado
- Implementar compressão de resposta
- Otimizar consultas ao banco de dados

### 7.2 Monitoramento
- Implementar health checks
- Configurar logging adequado
- Monitorar performance da API