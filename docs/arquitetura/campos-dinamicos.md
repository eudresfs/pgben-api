# Arquitetura de Campos Dinâmicos no Módulo de Benefício

## Visão Geral

A implementação de campos dinâmicos no módulo de Benefício permite a criação de estruturas de dados flexíveis e específicas para cada tipo de benefício, possibilitando a adaptação do sistema a diferentes requisitos sem a necessidade de alterações no código-fonte.

## Componentes Principais

### 1. Entidades

#### 1.1 CampoDinamicoBeneficio

Define os campos específicos para cada tipo de benefício, incluindo:
- Nome e rótulo do campo
- Tipo de dado (string, number, boolean, date)
- Obrigatoriedade
- Regras de validação
- Ordem de exibição

#### 1.2 VersaoSchemaBeneficio

Controla o versionamento do schema de campos dinâmicos, permitindo:
- Evolução do schema sem quebrar dados existentes
- Rastreamento de mudanças
- Compatibilidade retroativa

#### 1.3 SolicitacaoBeneficio

Armazena as solicitações de benefícios com suporte a dados dinâmicos:
- Referência ao cidadão solicitante
- Referência ao tipo de benefício
- Dados dinâmicos específicos do tipo de benefício
- Versão do schema utilizada na solicitação

### 2. Serviços

#### 2.1 ValidacaoDinamicaService

Responsável por validar os dados dinâmicos conforme o schema definido:
- Validação de tipos de dados
- Validação de campos obrigatórios
- Validação de regras específicas (min/max, formatos, etc.)

#### 2.2 CampoDinamicoService

Gerencia o ciclo de vida dos campos dinâmicos:
- Criação e atualização de campos
- Versionamento do schema
- Consulta de campos ativos

#### 2.3 DadosDinamicosService

Processa e valida dados dinâmicos durante solicitações:
- Sanitização e transformação de dados
- Integração com o serviço de validação
- Geração de estrutura de formulário dinâmico

### 3. Controllers

#### 3.1 CampoDinamicoController

Expõe endpoints para gerenciar campos dinâmicos:
- Criação e atualização de campos
- Consulta de campos por tipo de benefício
- Gerenciamento de versões do schema

#### 3.2 FormularioDinamicoController

Fornece a estrutura de formulário específica para cada tipo de benefício:
- Obtenção de campos ordenados
- Metadados para renderização de formulários

#### 3.3 SolicitacaoBeneficioController

Gerencia as solicitações de benefícios com suporte a dados dinâmicos:
- Criação de solicitações com validação de dados dinâmicos
- Consulta de solicitações com filtros
- Detalhamento de solicitações específicas

## Fluxo de Dados

1. **Definição de Campos**:
   - Administradores definem campos específicos para cada tipo de benefício
   - O sistema cria uma nova versão do schema quando necessário

2. **Geração de Formulário**:
   - O frontend solicita a estrutura do formulário para um tipo de benefício
   - O backend retorna os campos ordenados com suas regras de validação

3. **Submissão de Solicitação**:
   - O usuário preenche o formulário dinâmico
   - O frontend envia os dados para o backend
   - O backend valida os dados conforme o schema
   - Se válidos, os dados são processados e armazenados

4. **Consulta de Solicitações**:
   - Os dados dinâmicos são retornados junto com as informações da solicitação
   - A versão do schema é armazenada para garantir compatibilidade

## Benefícios da Arquitetura

1. **Flexibilidade**: Permite adaptar o sistema a diferentes tipos de benefícios sem alterações no código.

2. **Manutenibilidade**: Centraliza a lógica de validação e processamento de dados dinâmicos.

3. **Evolução**: Suporta a evolução dos requisitos através do versionamento de schemas.

4. **Performance**: Utiliza índices GIN para otimizar consultas em campos JSON.

5. **Usabilidade**: Fornece metadados para geração automática de formulários no frontend.

## Considerações Técnicas

### Armazenamento

Os dados dinâmicos são armazenados em campos JSONB no PostgreSQL, permitindo:
- Consultas eficientes com índices GIN
- Flexibilidade na estrutura de dados
- Validação no nível da aplicação

### Validação

A validação ocorre em múltiplas camadas:
- No frontend, baseada nos metadados do formulário
- No backend, antes do processamento dos dados
- No banco de dados, através de constraints básicas

### Versionamento

O versionamento do schema permite:
- Rastrear mudanças nos requisitos
- Migrar dados entre versões quando necessário
- Garantir compatibilidade com solicitações existentes

## Exemplos de Uso

Consulte o documento [Exemplos de Uso de Campos Dinâmicos](../exemplos/uso-campos-dinamicos.md) para ver exemplos práticos de como utilizar esta funcionalidade.

## Diagrama de Arquitetura

```
+-------------------+     +----------------------+     +---------------------+
| TipoBeneficio     |<----| CampoDinamicoBenef.  |<----| VersaoSchemaBenel.  |
+-------------------+     +----------------------+     +---------------------+
         ^                          ^                           ^
         |                          |                           |
         v                          |                           |
+-------------------+               |                           |
| SolicitacaoBenef. |               |                           |
+-------------------+               |                           |
         ^                          |                           |
         |                          |                           |
         v                          v                           v
+-------------------+     +----------------------+     +---------------------+
| SolicitacaoContr. |---->| DadosDinamicosServ.  |---->| ValidacaoDinamicaS. |
+-------------------+     +----------------------+     +---------------------+
         ^                          ^                           ^
         |                          |                           |
         v                          v                           v
+-------------------+     +----------------------+     +---------------------+
| Frontend          |---->| FormularioDinamico   |---->| CampoDinamicoContr. |
+-------------------+     +----------------------+     +---------------------+
```

## Conclusão

A arquitetura de campos dinâmicos fornece uma solução flexível e robusta para gerenciar diferentes tipos de benefícios com requisitos específicos, melhorando a adaptabilidade do sistema e reduzindo a necessidade de alterações no código-fonte para acomodar novos requisitos.
