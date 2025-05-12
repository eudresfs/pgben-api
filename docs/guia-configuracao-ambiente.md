# Guia de Configuração do Ambiente de Desenvolvimento - SEMTAS

## Introdução

Este documento fornece instruções detalhadas para configurar o ambiente de desenvolvimento do Sistema de Gestão de Benefícios Eventuais da SEMTAS, seguindo o checklist de preparação.

## Pré-requisitos

- Node.js 20.x LTS
- Docker Desktop
- Git
- Editor de código (recomendado: VSCode com extensões sugeridas)

## 1. Clonagem e Instalação do Projeto

```bash
# Clone o repositório starter
git clone https://github.com/monstar-lab-oss/nestjs-starter-rest-api.git temp-starter

# Instale as dependências
cd temp-starter
npm install

# Verifique a versão do Node.js (deve ser 20.x LTS)
node --version
```

## 2. Configuração do Ambiente Docker

O arquivo `docker-compose.yml` já foi criado na raiz do projeto com os seguintes serviços:
- PostgreSQL 14+ (banco de dados)
- Redis (cache e filas)
- MinIO (armazenamento de documentos)
- MailHog (testes de email)

### Importante: Iniciar o Docker Desktop

Antes de executar os comandos Docker, certifique-se de que o Docker Desktop está em execução:

1. Abra o Docker Desktop a partir do menu Iniciar do Windows
2. Aguarde até que o ícone do Docker na barra de tarefas indique que o serviço está em execução
3. Verifique o status com o comando: `docker ps`

Para iniciar os containers:

```bash
# Na raiz do projeto
docker-compose up -d
```

Verifique se os containers estão em execução:

```bash
docker ps
```

## 3. Configuração do Banco de Dados

O sistema utiliza PostgreSQL com TypeORM. Após os containers estarem em execução:

1. Verifique se o PostgreSQL está acessível:
   ```bash
   # Usando o cliente psql (se instalado)
   psql -h localhost -U postgres -d semtas_beneficios
   # Senha: postgres
   ```

2. As entidades TypeORM devem ser criadas nos seguintes módulos:
   - Usuários (estendendo o modelo do starter)
   - unidade e setor
   - Beneficiários e dados sociais
   - Benefícios e requisitos documentais
   - Solicitações e documentos
   - Histórico e auditoria

3. Após criar as entidades, execute as migrações:
   ```bash
   npm run typeorm:migration:run
   ```

## 4. Estrutura de Módulos

A estrutura de módulos deve seguir o padrão:

```
src/
  modules/
    unidade/
      dto/
      entities/
      controllers/
      services/
      repositories/
    cidadao/
      ...
    beneficio/
      ...
    solicitacao/
      ...
    documentos/
      ...
    relatorios/
      ...
    notificacao/
      ...
```

## 5. Configuração do MinIO

O MinIO é utilizado para armazenamento de documentos. Após iniciar os containers:

1. Acesse a interface web do MinIO: http://localhost:9001
   - Usuário: minioadmin
   - Senha: minioadmin

2. O bucket `documents` será criado automaticamente pelo script no docker-compose

3. Verifique se as pastas para os tipos de benefícios foram criadas:
   - `/beneficio/auxilio-natalidade`
   - `/beneficio/aluguel-social`

## 6. Configuração de Segurança

Implemente as seguintes configurações de segurança:

1. Configure o Helmet com headers recomendados:
   ```typescript
   app.use(
     helmet({
       contentSecurityPolicy: {
         directives: {
           defaultSrc: ["'self'"],
           scriptSrc: ["'self'", "'unsafe-inline'"],
           styleSrc: ["'self'", "'unsafe-inline'"],
         },
       },
       xFrameOptions: { action: 'deny' },
       xContentTypeOptions: { noSniff: true },
       hsts: { maxAge: 31536000, includeSubDomains: true },
       referrerPolicy: { policy: 'same-origin' },
     })
   );
   ```

2. Configure rate limiting para rotas críticas:
   ```typescript
   import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

   @Module({
     imports: [
       ThrottlerModule.forRoot({
         ttl: 60,
         limit: 10,
       }),
     ],
     providers: [
       {
         provide: APP_GUARD,
         useClass: ThrottlerGuard,
       },
     ],
   })
   ```

## 7. Extensão do Modelo de Usuários

Estenda a entidade User do starter kit para incluir:

```typescript
@Entity('users')
export class User {
  // Campos existentes do starter

  @Column({ length: 11, unique: true })
  cpf: string;

  @Column({ length: 15, nullable: true })
  telefone: string;

  @Column({
    type: 'enum',
    enum: ['administrador', 'gestor_semtas', 'tecnico_semtas', 'tecnico_unidade'],
    default: 'tecnico_unidade'
  })
  perfil: string;

  @ManyToOne(() => Unidade, { nullable: true })
  unidade: Unidade;

  @ManyToOne(() => Setor, { nullable: true })
  setor: Setor;
}
```

## 8. Verificações Finais

Antes de iniciar o desenvolvimento, verifique:

1. Inicie a aplicação em modo de desenvolvimento:
   ```bash
   npm run start:dev
   ```

2. Acesse a rota de health check: `GET /health`

3. Verifique se o Swagger está disponível: `/docs`

4. Teste a conexão com serviços externos:
   - PostgreSQL
   - Redis
   - MinIO
   - MailHog

5. Valide o funcionamento do módulo Auth:
   - Registro de usuário
   - Login e obtenção de token JWT
   - Refresh token
   - Acesso a rota protegida

## Próximos Passos

1. Iniciar o Docker Desktop
2. Executar `docker-compose up -d`
3. Verificar logs dos containers
4. Criar o banco de dados e executar migrações
5. Iniciar o desenvolvimento dos módulos específicos

## Observações Importantes

- Sempre mantenha o Docker Desktop em execução durante o desenvolvimento
- Não compartilhe credenciais de produção no arquivo `.env`
- Siga as convenções de código e nomenclatura definidas no projeto
- Utilize o sistema de branches e pull requests para contribuições