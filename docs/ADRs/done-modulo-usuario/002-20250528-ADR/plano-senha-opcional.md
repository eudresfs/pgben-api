# Plano de Implementação: Senha Opcional no Cadastro de Usuários

## Contexto

Implementar funcionalidade onde a senha seja opcional no DTO de criação de usuário, mas continue obrigatória na entidade. Quando não fornecida, uma senha aleatória deve ser gerada e as credenciais enviadas por email. No primeiro acesso, o usuário deve ser obrigado a alterar a senha.

## Objetivos

1. Tornar o campo senha opcional no `CreateUsuarioDto`
2. Manter a senha obrigatória na entidade `Usuario`
3. Gerar senha aleatória quando não fornecida
4. Enviar credenciais por email
5. Forçar alteração de senha no primeiro acesso

## Análise da Estrutura Atual

### Estado Atual
- ✅ Campo `primeiro_acesso` já existe na entidade `Usuario`
- ✅ Sistema de notificações por email já implementado
- ✅ Validações de força de senha já implementadas
- ✅ Sistema de templates de email disponível

### Arquivos a Modificar

1. **DTO de Criação**: `src/modules/usuario/dto/create-usuario.dto.ts`
2. **Serviço de Usuário**: `src/modules/usuario/services/usuario.service.ts`
3. **Controller de Usuário**: `src/modules/usuario/controllers/usuario.controller.ts`
4. **Middleware de Autenticação**: Para verificar primeiro acesso
5. **Templates de Email**: Criar template para envio de credenciais

## Implementação Detalhada

### Fase 1: Modificação do DTO

**Arquivo**: `src/modules/usuario/dto/create-usuario.dto.ts`

```typescript
// Tornar o campo senha opcional
@IsString({ message: 'Senha deve ser uma string' })
@IsOptional() // ← NOVA LINHA
@MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
@MaxLength(30, { message: 'Senha deve ter no máximo 30 caracteres' })
@Matches(
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
  {
    message:
      'Senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial',
  },
)
@Validate(IsStrongPassword, {
  message: 'A senha não pode conter informações pessoais ou palavras comuns',
})
@ApiProperty({
  example: 'Senha@123',
  description: 'Senha do usuário (opcional - se não fornecida, será gerada automaticamente)',
  required: false, // ← MODIFICADO
})
senha?: string; // ← MODIFICADO para opcional
```

### Fase 2: Gerador de Senha Aleatória

**Arquivo**: `src/modules/usuario/services/usuario.service.ts`

```typescript
/**
 * Gera uma senha aleatória segura
 * @returns Senha aleatória que atende aos critérios de segurança
 */
private generateRandomPassword(): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '@$!%*?&#';
  
  // Garantir pelo menos um caractere de cada tipo
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Completar com caracteres aleatórios até 12 caracteres
  const allChars = lowercase + uppercase + numbers + symbols;
  for (let i = 4; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Embaralhar a senha
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
```

### Fase 3: Modificação do Método Create

**Arquivo**: `src/modules/usuario/services/usuario.service.ts`

```typescript
async create(createUsuarioDto: CreateUsuarioDto) {
  this.logger.log(`Iniciando criação de usuário: ${createUsuarioDto.email}`);

  try {
    return await this.dataSource.transaction(async (manager) => {
      // ... validações existentes ...

      // Determinar senha a ser usada
      let senhaParaUso: string;
      let senhaGerada = false;
      
      if (createUsuarioDto.senha) {
        senhaParaUso = createUsuarioDto.senha;
      } else {
        senhaParaUso = this.generateRandomPassword();
        senhaGerada = true;
        this.logger.log(`Senha gerada automaticamente para usuário: ${createUsuarioDto.email}`);
      }

      // Gerar hash da senha
      const senhaHash = await bcrypt.hash(senhaParaUso, this.SALT_ROUNDS);

      // Criar usuário
      const novoUsuario = usuarioRepo.create({
        nome: createUsuarioDto.nome,
        email: createUsuarioDto.email.toLowerCase(),
        senhaHash,
        cpf: createUsuarioDto.cpf,
        telefone: createUsuarioDto.telefone,
        matricula: createUsuarioDto.matricula,
        role_id: createUsuarioDto.role_id,
        unidade_id: createUsuarioDto.unidade_id,
        setor_id: createUsuarioDto.setor_id,
        primeiro_acesso: true, // Sempre true para novos usuários
        ultimo_login: null,
        tentativas_login: 0,
      });

      const usuarioSalvo = await usuarioRepo.save(novoUsuario);
      
      // Enviar credenciais por email se senha foi gerada
      if (senhaGerada) {
        await this.enviarCredenciaisPorEmail(usuarioSalvo, senhaParaUso);
      }

      this.logger.log(`Usuário criado com sucesso: ${usuarioSalvo.id}`);

      // Remover campos sensíveis
      const { senhaHash: _, ...usuarioSemSenha } = usuarioSalvo;

      return {
        data: usuarioSemSenha,
        message: senhaGerada 
          ? 'Usuário criado com sucesso. Credenciais enviadas por email.'
          : 'Usuário criado com sucesso.',
      };
    });
  } catch (error) {
    // ... tratamento de erro existente ...
  }
}
```

### Fase 4: Serviço de Envio de Credenciais

**Arquivo**: `src/modules/usuario/services/usuario.service.ts`

```typescript
/**
 * Envia credenciais por email para usuário recém-criado
 * @param usuario Usuário criado
 * @param senha Senha em texto plano
 */
private async enviarCredenciaisPorEmail(usuario: Usuario, senha: string): Promise<void> {
  try {
    // Buscar template de credenciais
    const template = await this.templateRepository.findOne({
      where: { codigo: 'usuario-credenciais-acesso' }
    });

    if (!template) {
      this.logger.error('Template de credenciais não encontrado');
      return;
    }

    // Dados para o template
    const dadosTemplate = {
      nome: usuario.nome,
      email: usuario.email,
      senha: senha,
      matricula: usuario.matricula,
      sistema_url: process.env.FRONTEND_URL || 'https://pgben.natal.rn.gov.br',
      data_criacao: new Date().toLocaleDateString('pt-BR')
    };

    // Criar notificação
    await this.notificationManager.criarNotificacao({
      template_id: template.id,
      destinatario_id: usuario.id,
      dados_contexto: dadosTemplate,
      canal_preferencial: 'email'
    });

    this.logger.log(`Credenciais enviadas por email para: ${usuario.email}`);
  } catch (error) {
    this.logger.error(`Erro ao enviar credenciais por email: ${error.message}`);
    // Não falhar a criação do usuário por erro no envio do email
  }
}
```

### Fase 5: Template de Email

**Criar template no banco de dados**:

```sql
INSERT INTO notification_templates (
  id,
  codigo,
  nome,
  descricao,
  assunto,
  conteudo,
  canais_suportados,
  ativo,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'usuario-credenciais-acesso',
  'Credenciais de Acesso ao Sistema',
  'Template para envio de credenciais de primeiro acesso',
  'Suas credenciais de acesso ao Sistema PGBen',
  '
  <h2>Bem-vindo(a) ao Sistema PGBen!</h2>
  
  <p>Olá <strong>{{nome}}</strong>,</p>
  
  <p>Sua conta foi criada com sucesso no Sistema de Gestão de Benefícios Eventuais da SEMTAS.</p>
  
  <h3>Suas credenciais de acesso:</h3>
  <ul>
    <li><strong>Email:</strong> {{email}}</li>
    <li><strong>Senha:</strong> {{senha}}</li>
    <li><strong>Matrícula:</strong> {{matricula}}</li>
  </ul>
  
  <p><strong>⚠️ IMPORTANTE:</strong> Por segurança, você será obrigado(a) a alterar sua senha no primeiro acesso.</p>
  
  <p>Acesse o sistema em: <a href="{{sistema_url}}">{{sistema_url}}</a></p>
  
  <p>Data de criação: {{data_criacao}}</p>
  
  <hr>
  <p><small>Este é um email automático. Não responda a esta mensagem.</small></p>
  ',
  '{"email"}',
  true,
  NOW(),
  NOW()
);
```

### Fase 6: Middleware de Primeiro Acesso

**Arquivo**: `src/auth/guards/primeiro-acesso.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsuarioService } from '../../modules/usuario/services/usuario.service';

@Injectable()
export class PrimeiroAcessoGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usuarioService: UsuarioService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Verificar se a rota permite primeiro acesso
    const allowPrimeiroAcesso = this.reflector.get<boolean>(
      'allow-primeiro-acesso',
      context.getHandler(),
    );

    if (allowPrimeiroAcesso) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const usuario = request.user;

    if (!usuario) {
      return false;
    }

    // Buscar dados completos do usuário
    const usuarioCompleto = await this.usuarioService.findById(usuario.id);

    if (usuarioCompleto?.primeiro_acesso) {
      throw new ForbiddenException({
        message: 'Primeiro acesso detectado. Alteração de senha obrigatória.',
        code: 'PRIMEIRO_ACESSO_OBRIGATORIO',
        redirect: '/auth/alterar-senha-primeiro-acesso'
      });
    }

    return true;
  }
}
```

### Fase 7: Decorator para Rotas

**Arquivo**: `src/auth/decorators/allow-primeiro-acesso.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const AllowPrimeiroAcesso = () => SetMetadata('allow-primeiro-acesso', true);
```

### Fase 8: Endpoint de Alteração de Senha (Primeiro Acesso)

**Arquivo**: `src/modules/usuario/controllers/usuario.controller.ts`

```typescript
@Put('/primeiro-acesso/alterar-senha')
@AllowPrimeiroAcesso()
@ApiOperation({ summary: 'Altera senha no primeiro acesso' })
@ApiResponse({ status: 200, description: 'Senha alterada com sucesso' })
@ApiResponse({ status: 400, description: 'Dados inválidos' })
@ApiResponse({ status: 403, description: 'Usuário não está em primeiro acesso' })
async alterarSenhaPrimeiroAcesso(
  @Request() req,
  @Body() updateSenhaDto: UpdateSenhaDto,
): Promise<{ message: string }> {
  return this.usuarioService.alterarSenhaPrimeiroAcesso(
    req.user.id,
    updateSenhaDto.senha,
  );
}
```

### Fase 9: Método de Alteração de Senha (Primeiro Acesso)

**Arquivo**: `src/modules/usuario/services/usuario.service.ts`

```typescript
/**
 * Altera senha no primeiro acesso
 * @param usuarioId ID do usuário
 * @param novaSenha Nova senha
 */
async alterarSenhaPrimeiroAcesso(usuarioId: string, novaSenha: string): Promise<{ message: string }> {
  const usuario = await this.usuarioRepository.findById(usuarioId);
  
  if (!usuario) {
    throw new NotFoundException('Usuário não encontrado');
  }

  if (!usuario.primeiro_acesso) {
    throw new BadRequestException('Usuário não está em primeiro acesso');
  }

  // Validar nova senha
  const validator = new IsStrongPassword();
  if (!validator.validate(novaSenha)) {
    throw new BadRequestException('Nova senha não atende aos critérios de segurança');
  }

  // Gerar hash da nova senha
  const novoHash = await bcrypt.hash(novaSenha, this.SALT_ROUNDS);

  // Atualizar usuário
  await this.usuarioRepository.update(usuarioId, {
    senhaHash: novoHash,
    primeiro_acesso: false,
    updated_at: new Date()
  });

  this.logger.log(`Senha alterada no primeiro acesso para usuário: ${usuarioId}`);

  return {
    message: 'Senha alterada com sucesso. Você já pode acessar o sistema normalmente.'
  };
}
```

## Testes

### Testes Unitários

1. **Geração de senha aleatória**
   - Verificar se senha gerada atende critérios de segurança
   - Verificar se senhas geradas são diferentes

2. **Criação de usuário sem senha**
   - Verificar se senha é gerada automaticamente
   - Verificar se email é enviado
   - Verificar se `primeiro_acesso` é `true`

3. **Criação de usuário com senha**
   - Verificar se senha fornecida é usada
   - Verificar se email NÃO é enviado
   - Verificar se `primeiro_acesso` é `true`

4. **Alteração de senha no primeiro acesso**
   - Verificar se `primeiro_acesso` é alterado para `false`
   - Verificar validações de senha

### Testes de Integração

1. **Fluxo completo sem senha**
   - Criar usuário sem senha
   - Verificar envio de email
   - Fazer login
   - Verificar redirecionamento para alteração de senha
   - Alterar senha
   - Verificar acesso normal

2. **Fluxo completo com senha**
   - Criar usuário com senha
   - Fazer login
   - Verificar redirecionamento para alteração de senha
   - Alterar senha
   - Verificar acesso normal

## Considerações de Segurança

1. **Senha Gerada**
   - Usar gerador criptograficamente seguro
   - Garantir entropia suficiente
   - Não logar senha em texto plano

2. **Envio por Email**
   - Usar conexão segura (TLS)
   - Não armazenar senha em logs
   - Considerar expiração da senha temporária

3. **Primeiro Acesso**
   - Forçar alteração obrigatória
   - Validar nova senha rigorosamente
   - Invalidar sessões existentes após alteração

## Cronograma de Implementação

| Fase | Descrição | Tempo Estimado |
|------|-----------|----------------|
| 1 | Modificação do DTO | 1h |
| 2 | Gerador de senha | 2h |
| 3 | Modificação do método create | 3h |
| 4 | Serviço de envio de email | 2h |
| 5 | Template de email | 1h |
| 6 | Middleware de primeiro acesso | 3h |
| 7 | Decorator para rotas | 0.5h |
| 8 | Endpoint de alteração | 1h |
| 9 | Método de alteração | 2h |
| 10 | Testes unitários | 4h |
| 11 | Testes de integração | 3h |
| 12 | Documentação | 1h |

**Total Estimado**: 23.5 horas (~3 dias úteis)

## Dependências

1. ✅ Sistema de notificações (já implementado)
2. ✅ Templates de email (já implementado)
3. ✅ Validadores de senha (já implementado)
4. ✅ Campo `primeiro_acesso` na entidade (já existe)

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|----------|
| Falha no envio de email | Média | Alto | Logs detalhados + retry automático |
| Senha gerada fraca | Baixa | Alto | Testes rigorosos do gerador |
| Bypass do primeiro acesso | Baixa | Alto | Guard em todas as rotas protegidas |
| Performance no envio | Baixa | Médio | Envio assíncrono |

## Conclusão

A implementação proposta mantém a segurança do sistema enquanto adiciona flexibilidade no cadastro de usuários. O uso da infraestrutura existente (notificações, templates, validadores) minimiza o risco e acelera o desenvolvimento.

A funcionalidade será totalmente compatível com o sistema atual e não afetará usuários existentes.