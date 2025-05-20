# Guia de Configuração de Integrações

## Introdução

As integrações permitem que o sistema PGBen se conecte com serviços externos, como servidores de e-mail, gateways de SMS, serviços de armazenamento em nuvem, APIs externas e serviços de validação. Este guia explica como configurar e gerenciar integrações através da interface administrativa.

## Acessando o Gerenciador de Integrações

1. Faça login no sistema PGBen com um usuário que possua perfil de administrador
2. No menu principal, clique em "Administração"
3. Selecione "Configurações do Sistema"
4. Clique na aba "Integrações"

## Visualizando Integrações

A tela de integrações exibe uma lista com todas as integrações configuradas no sistema, organizadas por tipo. Para cada integração, são exibidas as seguintes informações:

- **Código**: Identificador único da integração
- **Nome**: Nome descritivo da integração
- **Tipo**: Tipo de integração (EMAIL, SMS, STORAGE, etc.)
- **Status**: Ativo ou Inativo
- **Última atualização**: Data e usuário da última modificação

### Filtrando Integrações

Você pode filtrar a lista de integrações utilizando as seguintes opções:

- **Filtro por texto**: Busca em códigos, nomes e descrições
- **Filtro por tipo**: Exibe apenas integrações de um tipo específico
- **Filtro por status**: Exibe apenas integrações ativas ou inativas

## Visualizando uma Integração

Para visualizar os detalhes de uma integração:

1. Localize a integração na lista
2. Clique no nome da integração ou no botão "Visualizar" (ícone de olho)
3. Na tela de detalhes, você verá:
   - Informações básicas (código, nome, tipo, etc.)
   - Configuração (parâmetros específicos do tipo)
   - Credenciais (mascaradas por segurança)
   - Histórico de alterações

> **Nota**: Por segurança, as credenciais são exibidas de forma mascarada (ex: "pass****").

## Criando uma Nova Integração

Para criar uma nova integração:

1. Clique no botão "Nova Integração" no topo da página
2. Preencha o formulário com as informações básicas:
   - **Código**: Identificador único (use formato com hífens, ex: "smtp-principal")
   - **Nome**: Nome descritivo da integração
   - **Descrição**: Descrição detalhada da função da integração
   - **Tipo**: Tipo de integração (EMAIL, SMS, STORAGE, API_EXTERNA, etc.)
   - **Status**: Ativo ou Inativo
3. Clique em "Próximo" para configurar os parâmetros específicos

### Configurando Parâmetros

Na tela de configuração de parâmetros:

1. Preencha os campos específicos para o tipo de integração selecionado
2. Os campos variam conforme o tipo, mas geralmente incluem:
   - Informações de conexão (host, porta, URL base)
   - Configurações de timeout
   - Opções de formato de dados
   - Configurações específicas do serviço
3. Clique em "Próximo" para configurar as credenciais

### Configurando Credenciais

Na tela de configuração de credenciais:

1. Preencha os campos de autenticação específicos para o tipo de integração
2. Os campos variam conforme o tipo, mas geralmente incluem:
   - Nome de usuário e senha
   - Chaves de API
   - Tokens de acesso
   - Certificados
3. Clique em "Testar" para verificar a conexão
4. Se o teste for bem-sucedido, clique em "Salvar" para criar a integração

> **Importante**: As credenciais são armazenadas de forma criptografada no banco de dados para garantir a segurança.

## Editando Integrações

Para editar uma integração existente:

1. Localize a integração na lista
2. Clique no botão "Editar" (ícone de lápis) na linha da integração
3. Siga o mesmo processo de criação, com as informações pré-preenchidas
4. Faça as alterações necessárias e clique em "Salvar"

> **Nota**: Não é possível alterar o código ou o tipo de uma integração existente. Caso seja necessário, crie uma nova integração e desative a antiga.

## Editando Apenas Credenciais

Para atualizar apenas as credenciais de uma integração:

1. Localize a integração na lista
2. Clique no botão "Editar Credenciais" (ícone de chave) na linha da integração
3. Atualize os campos de credenciais
4. Clique em "Testar" para verificar a conexão
5. Se o teste for bem-sucedido, clique em "Salvar" para atualizar as credenciais

Esta opção é útil quando você precisa atualizar senhas ou chaves de API sem modificar a configuração básica.

## Ativando/Desativando Integrações

Para alterar o status de uma integração:

1. Localize a integração na lista
2. Clique no botão "Ativar/Desativar" (ícone de toggle) na linha da integração
3. Confirme a alteração na caixa de diálogo

> **Nota**: Desativar uma integração impede que o sistema a utilize, mas mantém sua configuração para uso futuro.

## Testando Integrações

Para testar uma integração:

1. Localize a integração na lista
2. Clique no botão "Testar" (ícone de verificação) na linha da integração
3. Preencha os parâmetros de teste específicos para o tipo de integração
4. Clique em "Executar Teste"
5. Verifique o resultado do teste

O sistema exibirá um relatório detalhado do teste, incluindo:
- Status (sucesso ou falha)
- Tempo de resposta
- Mensagens de erro (se houver)
- Detalhes da resposta (quando aplicável)

## Excluindo Integrações

> **Atenção**: A exclusão de integrações pode causar problemas no funcionamento do sistema. Recomenda-se desativar em vez de excluir.

Para excluir uma integração:

1. Localize a integração na lista
2. Clique no botão "Excluir" (ícone de lixeira) na linha da integração
3. Confirme a exclusão na caixa de diálogo

> **Nota**: Não é possível excluir integrações que estão sendo utilizadas por outros módulos do sistema.

## Tipos de Integrações

### Integração de E-mail (SMTP)

Permite o envio de e-mails através de um servidor SMTP.

**Configuração**:
- **Host**: Endereço do servidor SMTP
- **Porta**: Porta de conexão (geralmente 25, 465 ou 587)
- **Secure**: Se deve usar conexão segura (SSL/TLS)
- **RequireTLS**: Se deve exigir TLS
- **From**: Endereço de e-mail do remetente padrão

**Credenciais**:
- **Usuário**: Nome de usuário para autenticação SMTP
- **Senha**: Senha para autenticação SMTP

**Parâmetros de teste**:
- **Destinatário**: E-mail para teste
- **Assunto**: Assunto da mensagem de teste
- **Conteúdo**: Conteúdo da mensagem de teste

### Integração de SMS

Permite o envio de mensagens SMS através de um gateway.

**Configuração**:
- **API URL**: URL base da API do gateway
- **Timeout**: Tempo limite para requisições (em ms)
- **Formato de Resposta**: Formato esperado da resposta (JSON, XML)

**Credenciais**:
- **API Key**: Chave de API para autenticação
- **API Secret**: Segredo de API (se aplicável)

**Parâmetros de teste**:
- **Número**: Número de telefone para teste
- **Mensagem**: Conteúdo da mensagem de teste

### Integração de Armazenamento (S3)

Permite o armazenamento de arquivos em um serviço compatível com S3.

**Configuração**:
- **Region**: Região do serviço
- **Bucket**: Nome do bucket para armazenamento
- **Base URL**: URL base para acesso aos arquivos
- **ACL**: Controle de acesso padrão para arquivos

**Credenciais**:
- **Access Key ID**: ID da chave de acesso
- **Secret Access Key**: Chave de acesso secreta

**Parâmetros de teste**:
- **Teste de Upload**: Se deve testar upload de arquivo
- **Teste de Download**: Se deve testar download de arquivo
- **Teste de Exclusão**: Se deve testar exclusão de arquivo

### Integração de API Externa

Permite a comunicação com APIs externas genéricas.

**Configuração**:
- **Base URL**: URL base da API
- **Timeout**: Tempo limite para requisições (em ms)
- **Headers**: Cabeçalhos padrão para requisições
- **Formato de Resposta**: Formato esperado da resposta (JSON, XML)

**Credenciais**:
- **API Key**: Chave de API para autenticação
- **Bearer Token**: Token de autenticação
- **Usuário**: Nome de usuário (para autenticação básica)
- **Senha**: Senha (para autenticação básica)

**Parâmetros de teste**:
- **Endpoint**: Endpoint específico para teste
- **Método**: Método HTTP para teste (GET, POST, etc.)
- **Corpo**: Corpo da requisição para teste (se aplicável)

### Integração de Validação de CEP

Permite a validação e consulta de CEPs.

**Configuração**:
- **Base URL**: URL base do serviço de CEP
- **Timeout**: Tempo limite para requisições (em ms)
- **Formato de Resposta**: Formato esperado da resposta (JSON, XML)

**Credenciais**:
- **API Key**: Chave de API para autenticação (se necessário)

**Parâmetros de teste**:
- **CEP**: CEP para teste

### Integração de Validação de CPF

Permite a validação de CPFs.

**Configuração**:
- **Base URL**: URL base do serviço de validação
- **Timeout**: Tempo limite para requisições (em ms)
- **Formato de Resposta**: Formato esperado da resposta (JSON, XML)

**Credenciais**:
- **API Key**: Chave de API para autenticação

**Parâmetros de teste**:
- **CPF**: CPF para teste

## Segurança das Credenciais

O sistema implementa as seguintes medidas de segurança para proteger as credenciais:

1. **Criptografia**: Todas as credenciais são criptografadas no banco de dados
2. **Mascaramento**: Ao exibir credenciais, parte do conteúdo é mascarado
3. **Acesso restrito**: Apenas usuários com perfil de administrador podem visualizar ou editar credenciais
4. **Auditoria**: Todas as alterações em credenciais são registradas no log de auditoria
5. **Timeout de sessão**: Sessões administrativas expiram após período de inatividade

## Rotação de Credenciais

É recomendável realizar a rotação periódica de credenciais para aumentar a segurança:

1. Gere novas credenciais no serviço externo
2. Atualize as credenciais na integração
3. Teste a integração com as novas credenciais
4. Revogue as credenciais antigas no serviço externo

> **Dica**: Estabeleça uma política de rotação de credenciais (ex: a cada 90 dias) e documente o processo.

## Monitoramento de Integrações

O sistema fornece ferramentas para monitorar o uso e desempenho das integrações:

### Logs de Integração

Para acessar os logs de integração:

1. No menu principal, clique em "Administração"
2. Selecione "Logs do Sistema"
3. Clique na aba "Logs de Integração"
4. Filtre por tipo de integração, período e/ou status
5. Visualize detalhes de cada operação

### Dashboard de Integrações

Para acessar o dashboard de integrações:

1. No menu principal, clique em "Dashboard"
2. Selecione "Integrações"
3. Visualize gráficos e estatísticas sobre:
   - Taxa de sucesso por integração
   - Tempo médio de resposta
   - Volume de operações
   - Erros mais comuns

## Boas Práticas

### Configuração de Integrações

1. **Use nomes descritivos**: Facilite a identificação da função de cada integração
2. **Documente detalhes**: Inclua informações sobre o serviço externo na descrição
3. **Configure timeouts adequados**: Evite bloqueios por serviços lentos
4. **Implemente fallbacks**: Configure alternativas para serviços críticos

### Segurança

1. **Use credenciais específicas**: Crie usuários/chaves específicos para o PGBen
2. **Limite permissões**: Configure apenas as permissões necessárias
3. **Monitore uso anormal**: Verifique regularmente os logs de integração
4. **Rotacione credenciais**: Atualize periodicamente as credenciais

### Testes

1. **Teste após configuração**: Sempre teste a integração após configurá-la
2. **Teste após atualizações**: Verifique a integração após atualizações do sistema
3. **Teste com dados reais**: Use dados realistas para testes
4. **Verifique limites**: Teste o comportamento com volumes maiores de dados

## Resolução de Problemas

### Falha na Conexão

Se uma integração falhar na conexão:

1. Verifique se o serviço externo está disponível
2. Confirme se as credenciais estão corretas
3. Verifique se há bloqueios de firewall
4. Teste a conexão a partir de outro ambiente

### Erros de Autenticação

Se ocorrerem erros de autenticação:

1. Verifique se as credenciais estão corretas
2. Confirme se as credenciais não expiraram
3. Verifique se o formato das credenciais está correto
4. Confirme se a conta no serviço externo está ativa

### Timeout

Se ocorrerem erros de timeout:

1. Aumente o valor de timeout na configuração
2. Verifique a performance do serviço externo
3. Considere otimizar o volume de dados enviados
4. Verifique a conectividade de rede

### Erros de Formato

Se ocorrerem erros de formato de dados:

1. Verifique se o formato esperado está configurado corretamente
2. Confirme se o serviço externo não alterou seu formato de resposta
3. Teste com dados simplificados
4. Consulte a documentação atualizada do serviço externo

## Exemplos de Configuração

### Exemplo: Servidor SMTP do Gmail

**Configuração**:
```json
{
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "requireTLS": true,
  "from": "sistema@pgben.gov.br"
}
```

**Credenciais**:
```json
{
  "user": "sistema@pgben.gov.br",
  "password": "sua-senha-ou-senha-de-app"
}
```

> **Nota**: Para o Gmail, é recomendável usar senhas de aplicativo em vez da senha principal da conta.

### Exemplo: Amazon S3

**Configuração**:
```json
{
  "region": "us-east-1",
  "bucket": "pgben-documentos",
  "baseUrl": "https://pgben-documentos.s3.amazonaws.com/",
  "acl": "private"
}
```

**Credenciais**:
```json
{
  "accessKeyId": "AKIAXXXXXXXXXXXXXXXX",
  "secretAccessKey": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

> **Dica**: Para o Amazon S3, é recomendável criar um usuário IAM específico com permissões limitadas apenas ao bucket necessário.
