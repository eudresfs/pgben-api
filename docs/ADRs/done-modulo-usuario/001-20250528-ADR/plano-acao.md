


          
# Plano de Ação - Melhorias e Correções do Módulo de Usuários

Com base na análise técnica realizada, apresento um plano estruturado para implementar as melhorias e correções necessárias no módulo de usuários do sistema SEMTAS.

## 🚨 **FASE 1: Correções Críticas (Prioridade ALTA)**

### **1.1 Correção da Ordem das Rotas no Controller**
**Problema**: Endpoint `/me` nunca é alcançado devido à ordem das rotas
**Impacto**: Funcionalidade crítica não funciona
**Tempo estimado**: 15 minutos

**Ação**:
```typescript
// Em usuario.controller.ts - Mover @Get('me') ANTES de @Get(':id')

/**
 * Obtém o perfil do usuário atual
 */
@Get('me')
@RequiresPermission(
  
  {
    permissionName: 'usuario.perfil.visualizar',
    scopeType: ScopeType.SELF
  }
)
@ApiOperation({ summary: 'Obter perfil do usuário atual' })
@ApiResponse({ status: 200, description: 'Perfil obtido com sucesso' })
async getProfile(@Request() req) {
  return this.usuarioService.getProfile(req.user.id);
}

/**
 * Obtém detalhes de um usuário específico
 */
@Get(':id')
// ... resto da implementação
```

### **1.2 Implementação do Endpoint DELETE**
**Problema**: CRUD incompleto - falta endpoint para remoção
**Tempo estimado**: 30 minutos

**Ação**:
```typescript
// Adicionar no usuario.controller.ts

/**
 * Remove um usuário (soft delete)
 */
@Delete(':id')
@RequiresPermission(
  
  {
    permissionName: 'usuario.remover',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'usuario.unidadeId'
  }
)
@ApiOperation({ summary: 'Remover usuário' })
@ApiResponse({ status: 200, description: 'Usuário removido com sucesso' })
@ApiResponse({ status: 404, description: 'Usuário não encontrado' })
async remove(@Param('id') id: string) {
  return this.usuarioService.remove(id);
}
```

```typescript
// Adicionar no usuario.service.ts

/**
 * Remove um usuário (soft delete)
 * @param id ID do usuário
 * @returns Mensagem de sucesso
 */
async remove(id: string) {
  this.logger.log(`Iniciando remoção do usuário ${id}`);
  
  // Verificar se usuário existe
  const usuario = await this.usuarioRepository.findById(id);
  if (!usuario) {
    throw new NotFoundException('Usuário não encontrado');
  }
  
  // Verificar se usuário pode ser removido (regras de negócio)
  // Ex: não remover se tem solicitações ativas
  
  await this.usuarioRepository.remove(id);
  
  this.logger.log(`Usuário ${id} removido com sucesso`);
  return { message: 'Usuário removido com sucesso' };
}
```

## 📋 **FASE 2: Melhorias de Validação (Prioridade MÉDIA)**

### **2.1 Aprimoramento do UpdateUsuarioDto**
**Problema**: Validações incompletas nos campos opcionais
**Tempo estimado**: 45 minutos

**Ação**:
```typescript
// Atualizar update-usuario.dto.ts

import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  MinLength,
  MaxLength,
  Matches,
  Validate,
} from 'class-validator';
import { IsCPF } from '../../../shared/validators/cpf.validator';
import { ROLES, RoleType } from '../../../shared/constants/roles.constants';

export class UpdateUsuarioDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @IsOptional()
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  @Matches(/^[A-Za-zÀ-ÖØ-öø-ÿ]+ [A-Za-zÀ-ÖØ-öø-ÿ ]+$/, {
    message: 'O nome do usuário deve ter pelo menos nome e sobrenome',
  })
  nome?: string;

  @IsEmail({}, { message: 'Email inválido' })
  @IsOptional()
  @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    message: 'Formato de email inválido',
  })
  email?: string;

  @IsString({ message: 'CPF deve ser uma string' })
  @IsOptional()
  @Matches(/^\d{3}\.\d{3}\.\d{3}\-\d{2}$/, {
    message: 'CPF deve estar no formato 123.456.789-00',
  })
  @Validate(IsCPF, { message: 'CPF inválido' })
  cpf?: string;

  @IsString({ message: 'Telefone deve ser uma string' })
  @IsOptional()
  @Matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, {
    message: 'Telefone deve estar no formato (XX) XXXX-XXXX ou (XX) XXXXX-XXXX',
  })
  telefone?: string;

  @IsString({ message: 'Matrícula deve ser uma string' })
  @IsOptional()
  @Matches(/^[0-9]{5,10}$/, {
    message: 'Matrícula deve conter entre 5 e 10 dígitos numéricos',
  })
  matricula?: string;

  // ... resto dos campos
}
```

### **2.2 Correção de Tipagem no Repository**
**Problema**: Uso de `as unknown as Partial<Usuario>` indica problemas de tipagem
**Tempo estimado**: 30 minutos

**Ação**:
```typescript
// Atualizar usuario.repository.ts

import { Repository, DataSource, DeepPartial } from 'typeorm';

/**
 * Atualiza o status de um usuário
 */
async updateStatus(id: string, status: string): Promise<Usuario> {
  const dadosAtualizacao: DeepPartial<Usuario> = { status };
  
  await this.repository.update(id, dadosAtualizacao);
  const usuario = await this.findById(id);
  if (!usuario) {
    throw new Error(`Usuário com ID ${id} não encontrado`);
  }
  return usuario;
}

/**
 * Atualiza a senha de um usuário
 */
async updateSenha(id: string, senhaHash: string): Promise<Usuario> {
  const dadosAtualizacao: DeepPartial<Usuario> = { 
    senhaHash, 
    primeiro_acesso: false 
  };
  
  await this.repository.update(id, dadosAtualizacao);
  const usuario = await this.findById(id);
  if (!usuario) {
    throw new Error(`Usuário com ID ${id} não encontrado`);
  }
  return usuario;
}
```

## 🔒 **FASE 3: Melhorias de Segurança (Prioridade MÉDIA)**

### **3.1 Implementação de Bloqueio por Tentativas**
**Problema**: Sistema não bloqueia usuários após tentativas excessivas
**Tempo estimado**: 1 hora

**Ação**:
```typescript
// Adicionar no usuario.service.ts

private readonly MAX_LOGIN_ATTEMPTS = 5;
private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutos

/**
 * Verifica se usuário está bloqueado por tentativas excessivas
 */
private async isUserLocked(usuario: Usuario): Promise<boolean> {
  if (usuario.tentativas_login >= this.MAX_LOGIN_ATTEMPTS) {
    const lockoutTime = new Date(usuario.ultimo_login.getTime() + this.LOCKOUT_DURATION);
    return new Date() < lockoutTime;
  }
  return false;
}

/**
 * Incrementa tentativas de login falhadas
 */
async incrementLoginAttempts(email: string): Promise<void> {
  await this.dataSource.transaction(async (manager) => {
    const usuarioRepo = manager.getRepository('usuario');
    await usuarioRepo.update(
      { email: email.toLowerCase() },
      {
        tentativas_login: () => '"tentativas_login" + 1',
        ultimo_login: new Date(),
      }
    );
  });
}

/**
 * Reseta tentativas de login após sucesso
 */
async resetLoginAttempts(userId: string): Promise<void> {
  await this.usuarioRepository.update(userId, {
    tentativas_login: 0,
    ultimo_login: new Date(),
  });
}
```

### **3.2 Validação Adicional de Senha**
**Problema**: Validação de senha pode ser mais robusta
**Tempo estimado**: 30 minutos

**Ação**:
```typescript
// Criar shared/validators/password-strength.validator.ts

import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'passwordStrength', async: false })
export class PasswordStrengthValidator implements ValidatorConstraintInterface {
  validate(password: string): boolean {
    // Verificar se não contém sequências comuns
    const commonSequences = ['123456', 'abcdef', 'qwerty'];
    const lowerPassword = password.toLowerCase();
    
    for (const sequence of commonSequences) {
      if (lowerPassword.includes(sequence)) {
        return false;
      }
    }
    
    // Verificar se não é uma senha muito comum
    const commonPasswords = ['password', 'senha123', 'admin123'];
    if (commonPasswords.includes(lowerPassword)) {
      return false;
    }
    
    return true;
  }
  
  defaultMessage(): string {
    return 'Senha muito fraca ou comum';
  }
}
```

## 📊 **FASE 4: Melhorias de Performance e Monitoramento (Prioridade BAIXA)**

### **4.1 Implementação de Cache**
**Tempo estimado**: 1 hora

**Ação**:
```typescript
// Adicionar cache para consultas frequentes

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class UsuarioService {
  constructor(
    // ... outros injects
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}
  
  /**
   * Busca usuário com cache
   */
  async findById(id: string) {
    const cacheKey = `usuario:${id}`;
    let usuario = await this.cacheManager.get(cacheKey);
    
    if (!usuario) {
      usuario = await this.usuarioRepository.findById(id);
      if (usuario) {
        await this.cacheManager.set(cacheKey, usuario, 300); // 5 minutos
      }
    }
    
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }
    
    const { senhaHash, ...usuarioSemSenha } = usuario;
    return usuarioSemSenha;
  }
}
```

### **4.2 Melhorias de Logging**
**Tempo estimado**: 45 minutos

**Ação**:
```typescript
// Adicionar logs estruturados

/**
 * Cria um novo usuário
 */
async create(createUsuarioDto: CreateUsuarioDto) {
  const startTime = Date.now();
  this.logger.log({
    action: 'create_user_start',
    email: createUsuarioDto.email,
    unidadeId: createUsuarioDto.unidadeId,
  });
  
  try {
    const result = await this.dataSource.transaction(async (manager) => {
      // ... implementação existente
    });
    
    this.logger.log({
      action: 'create_user_success',
      userId: result.data.id,
      email: createUsuarioDto.email,
      duration: Date.now() - startTime,
    });
    
    return result;
  } catch (error) {
    this.logger.error({
      action: 'create_user_error',
      email: createUsuarioDto.email,
      error: error.message,
      duration: Date.now() - startTime,
    });
    throw error;
  }
}
```

## 🧪 **FASE 5: Testes (Prioridade MÉDIA)**

### **5.1 Testes Unitários**
**Tempo estimado**: 2 horas

**Ação**: Criar testes para:
- Todos os métodos do service
- Validações dos DTOs
- Casos de erro e exceções

### **5.2 Testes de Integração**
**Tempo estimado**: 1.5 horas

**Ação**: Criar testes para:
- Endpoints do controller
- Fluxos completos de CRUD
- Autenticação e autorização

## 📅 **Cronograma de Implementação**

| Fase | Tempo Estimado | Prioridade | Dependências |
|------|----------------|------------|-------------|
| Fase 1 | 45 minutos | ALTA | Nenhuma |
| Fase 2 | 1h 15min | MÉDIA | Fase 1 |
| Fase 3 | 1h 30min | MÉDIA | Fase 1 |
| Fase 4 | 1h 45min | BAIXA | Fases 1-3 |
| Fase 5 | 3h 30min | MÉDIA | Todas as fases |

**Tempo Total Estimado**: 8 horas e 45 minutos

## ✅ **Checklist de Validação**

### Após Fase 1:
- [ ] Endpoint `/me` funciona corretamente
- [ ] Endpoint DELETE implementado e testado
- [ ] Todos os endpoints retornam respostas adequadas

### Após Fase 2:
- [ ] Validações funcionam em todos os DTOs
- [ ] Tipagem corrigida no repository
- [ ] Testes de validação passando

### Após Fase 3:
- [ ] Sistema de bloqueio por tentativas funcionando
- [ ] Logs de segurança implementados
- [ ] Validações de senha mais robustas

### Após Fase 4:
- [ ] Cache implementado e funcionando
- [ ] Performance melhorada
- [ ] Logs estruturados implementados

### Após Fase 5:
- [ ] Cobertura de testes > 80%
- [ ] Todos os testes passando
- [ ] Documentação atualizada

## 🚀 **Próximos Passos**

1. **Implementar Fase 1** (correções críticas) imediatamente
2. **Testar** as correções em ambiente de desenvolvimento
3. **Implementar Fases 2-3** em paralelo
4. **Implementar Fase 4** após validação das anteriores
5. **Implementar Fase 5** como última etapa
6. **Deploy** em ambiente de homologação para testes finais

Este plano garante que o módulo de usuários esteja 100% funcional e atenda todos os requisitos especificados, com melhorias significativas em segurança, performance e manutenibilidade.