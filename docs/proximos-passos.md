# Próximos Passos para Configuração do Ambiente SEMTAS

## Status Atual

Atualmente, foram realizadas as seguintes etapas do checklist:

1. ✅ Clonagem do repositório `monstar-lab-oss/nestjs-starter-rest-api`
2. ✅ Criação do arquivo `docker-compose.yml` com os serviços necessários
3. ✅ Criação do arquivo `.env` com as variáveis de ambiente
4. ✅ Documentação da estrutura de módulos do sistema
5. ✅ Guia de configuração do ambiente

## Próximos Passos

### 1. Iniciar o Docker Desktop

Antes de prosseguir, é necessário iniciar o Docker Desktop:

1. Abra o Docker Desktop a partir do menu Iniciar do Windows
2. Aguarde até que o ícone do Docker na barra de tarefas indique que o serviço está em execução
3. Verifique o status com o comando: `docker ps`

### 2. Iniciar os Containers Docker

Após o Docker Desktop estar em execução:

```bash
# Na raiz do projeto
docker-compose up -d
```

Verifique se os containers estão em execução:

```bash
docker ps
```

### 3. Copiar Arquivos do Starter Kit

Copie os arquivos necessários do starter kit para o projeto principal:

```bash
# Copiar arquivos de configuração
cp -r temp-starter/src/shared ./src/
cp -r temp-starter/src/auth ./src/
cp -r temp-starter/src/user ./src/
```

### 4. Adaptar o Modelo de Usuário

Modifique a entidade User para incluir os campos específicos da SEMTAS:

- CPF (com validação)
- Telefone
- Perfil/Role (administrador, gestor_semtas, tecnico_semtas, tecnico_unidade)
- Relacionamento com unidade
- Relacionamento com setor

### 5. Criar a Estrutura de Módulos

Crie os diretórios para os módulos específicos do SEMTAS:

```bash
mkdir -p src/modules/unidade/{dto,entities,controllers,services,repositories}
mkdir -p src/modules/cidadao/{dto,entities,controllers,services,repositories}
mkdir -p src/modules/beneficio/{dto,entities,controllers,services,repositories}
mkdir -p src/modules/solicitacao/{dto,entities,controllers,services,repositories}
mkdir -p src/modules/documento/{dto,entities,controllers,services,repositories}
mkdir -p src/modules/relatorios/{dto,controllers,services}
mkdir -p src/modules/notificacao/{dto,entities,controllers,services,repositories}
```

### 6. Configurar o Banco de Dados

Após os containers estarem em execução:

1. Verifique se o PostgreSQL está acessível:
   ```bash
   # Usando o cliente psql (se instalado)
   psql -h localhost -U postgres -d pgben
   # Senha: postgres
   ```

3. Crie as migrations iniciais:
   ```bash
   npm run typeorm:migration:generate -- -n InitialStructure
   ```

4. Execute as migrations:
   ```bash
   npm run typeorm:migration:run
   ```

### 7. Configurar o MinIO

Verifique se o MinIO está acessível e configurado corretamente:

1. Acesse a interface web do MinIO: http://localhost:9001
   - Usuário: minioadmin
   - Senha: minioadmin

2. Verifique se o bucket `documents` foi criado automaticamente

3. Crie as pastas para os tipos de benefícios:
   - `/beneficio/auxilio-natalidade`
   - `/beneficio/aluguel-social`

### 8. Implementar Configurações de Segurança

1. Configure o Helmet com headers recomendados
2. Implemente rate limiting para rotas críticas
3. Configure CORS adequadamente
4. Verifique a configuração de cookies para JWT

### 9. Iniciar o Desenvolvimento

1. Inicie a aplicação em modo de desenvolvimento:
   ```bash
   npm run start:dev
   ```

2. Acesse a rota de health check: `GET /health`

3. Verifique se o Swagger está disponível: `/docs`

4. Comece o desenvolvimento pelos módulos prioritários:
   - unidade
   - Cidadãos
   - Benefícios
   - Solicitações
   - Documentos

## Observações Importantes

- Siga as convenções de código e nomenclatura definidas no projeto
- Implemente validações rigorosas para CPF e outros dados sensíveis
- Mantenha a documentação Swagger atualizada para todos os endpoints
- Escreva testes unitários para garantir a qualidade do código
- Utilize o sistema de branches e pull requests para contribuições

## Checklist de Verificação Final

Antes de considerar o ambiente pronto para desenvolvimento, verifique:

- [ ] Docker Desktop em execução
- [ ] Containers Docker rodando corretamente
- [ ] Banco de dados PostgreSQL acessível
- [ ] MinIO configurado com bucket e pastas
- [ ] Redis funcionando para cache
- [ ] MailHog disponível para testes de email
- [ ] Estrutura de módulos criada
- [ ] Entidades básicas implementadas
- [ ] Migrations executadas com sucesso
- [ ] Aplicação iniciando sem erros
- [ ] Swagger disponível e funcionando
- [ ] Autenticação JWT configurada
- [ ] RBAC implementado para os perfis SEMTAS