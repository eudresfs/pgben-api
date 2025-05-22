# Guia de Permissões Granulares para Equipe Frontend

## Introdução

Este guia explica como integrar o sistema de permissões granulares do PGBen em aplicações frontend. O sistema foi projetado para fornecer controle de acesso detalhado a funcionalidades específicas da aplicação, permitindo uma experiência de usuário personalizada com base nas permissões individuais.

## Conceitos Fundamentais

### Estrutura de Permissões

No PGBen, as permissões seguem o formato:

```
modulo.recurso.operacao
```

Exemplos:
- `usuario.visualizar` - Permissão para visualizar usuários
- `beneficio.aprovar` - Permissão para aprovar benefícios
- `documento.excluir` - Permissão para excluir documentos

### Escopos de Permissão

Cada permissão pode ter um dos seguintes escopos:

- **GLOBAL**: Aplica-se a todos os recursos do tipo especificado
- **UNIT**: Aplica-se apenas a um recurso específico, identificado por um ID
- **GROUP**: Aplica-se a um grupo de recursos

### Permissões no Token JWT

Após autenticação bem-sucedida, o backend retorna um token JWT que contém:

1. Dados básicos do usuário (ID, nome, email)
2. Roles do usuário (admin, gerente, operador, etc.)
3. Lista de permissões do usuário
4. Mapa de escopos de permissões (quando aplicável)

## Integração no Frontend

### 1. Armazenamento do Token

Após o login, armazene o token JWT de forma segura:

```typescript
// Exemplo usando localStorage (considere usar soluções mais seguras em produção)
function handleLogin(credentials) {
  return api.post('/v1/auth/login', credentials)
    .then(response => {
      const { accessToken, refreshToken } = response.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      // Decodificar e armazenar as permissões
      const decodedToken = decodeJwt(accessToken);
      return decodedToken;
    });
}
```

### 2. Decodificação do Token

Implemente uma função para decodificar o token JWT:

```typescript
function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Erro ao decodificar token:', error);
    return null;
  }
}
```

### 3. Verificação de Permissões

Crie um serviço para verificar permissões:

```typescript
// auth.service.ts
class AuthService {
  getDecodedToken() {
    const token = localStorage.getItem('accessToken');
    return token ? decodeJwt(token) : null;
  }
  
  hasPermission(permissionName, scopeType = 'GLOBAL', scopeId = null) {
    const decodedToken = this.getDecodedToken();
    
    if (!decodedToken || !decodedToken.permissions) {
      return false;
    }
    
    // Verificar permissão exata
    if (decodedToken.permissions.includes(permissionName)) {
      // Para permissões GLOBAL, basta ter a permissão
      if (scopeType === 'GLOBAL') {
        return true;
      }
      
      // Para permissões UNIT ou GROUP, verificar o escopo
      if (decodedToken.permissionScopes && 
          decodedToken.permissionScopes[permissionName]) {
        
        const scope = decodedToken.permissionScopes[permissionName];
        
        // Se tiver escopo GLOBAL para esta permissão, tem acesso a tudo
        if (scope === 'GLOBAL') {
          return true;
        }
        
        // Se o escopo for UNIT, verificar se o ID do recurso está na lista
        if (scopeType === 'UNIT' && Array.isArray(scope)) {
          return scope.includes(scopeId);
        }
        
        // Se o escopo for GROUP, verificar se o grupo está na lista
        if (scopeType === 'GROUP' && typeof scope === 'object') {
          return Object.keys(scope).some(groupId => 
            scope[groupId].includes(scopeId)
          );
        }
      }
      
      return false;
    }
    
    // Verificar permissões com wildcard
    const permissionParts = permissionName.split('.');
    
    // Verificar permissões do tipo "modulo.*"
    if (permissionParts.length > 1) {
      const wildcardPermission = `${permissionParts[0]}.*`;
      if (decodedToken.permissions.includes(wildcardPermission)) {
        return true;
      }
    }
    
    // Verificar permissões do tipo "*.operacao"
    if (permissionParts.length > 2) {
      const wildcardPermission = `*.${permissionParts[2]}`;
      if (decodedToken.permissions.includes(wildcardPermission)) {
        return true;
      }
    }
    
    // Verificar permissão super admin "*.*"
    return decodedToken.permissions.includes('*.*');
  }
  
  hasRole(role) {
    const decodedToken = this.getDecodedToken();
    return decodedToken && decodedToken.roles && decodedToken.roles.includes(role);
  }
}

export const authService = new AuthService();
```

### 4. Componente de Controle de Acesso

Crie um componente para controlar a exibição de elementos com base em permissões:

```tsx
// PermissionGate.tsx (React)
import React from 'react';
import { authService } from './auth.service';

interface PermissionGateProps {
  permissionName: string;
  scopeType?: 'GLOBAL' | 'UNIT' | 'GROUP';
  scopeId?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permissionName,
  scopeType = 'GLOBAL',
  scopeId,
  fallback = null,
  children,
}) => {
  const hasPermission = authService.hasPermission(permissionName, scopeType, scopeId);
  
  return hasPermission ? <>{children}</> : <>{fallback}</>;
};
```

### 5. Uso em Componentes

Utilize o componente `PermissionGate` para controlar o acesso a funcionalidades:

```tsx
// Exemplo de uso em um componente
import React from 'react';
import { PermissionGate } from './PermissionGate';

export const UserList = () => {
  // ... lógica do componente
  
  return (
    <div>
      <h1>Lista de Usuários</h1>
      
      {/* Botão visível apenas para quem tem permissão de criar usuários */}
      <PermissionGate permissionName="usuario.criar">
        <button onClick={handleCreateUser}>Novo Usuário</button>
      </PermissionGate>
      
      {/* Lista de usuários */}
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>
                {/* Botão de edição visível apenas para quem tem permissão de editar este usuário específico */}
                <PermissionGate 
                  permissionName="usuario.editar" 
                  scopeType="UNIT" 
                  scopeId={user.id}
                >
                  <button onClick={() => handleEditUser(user.id)}>Editar</button>
                </PermissionGate>
                
                {/* Botão de exclusão visível apenas para quem tem permissão de excluir usuários */}
                <PermissionGate permissionName="usuario.excluir">
                  <button onClick={() => handleDeleteUser(user.id)}>Excluir</button>
                </PermissionGate>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### 6. Proteção de Rotas

Crie um componente para proteger rotas com base em permissões:

```tsx
// ProtectedRoute.tsx (React Router)
import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { authService } from './auth.service';

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
  permissionName?: string;
  scopeType?: 'GLOBAL' | 'UNIT' | 'GROUP';
  scopeId?: string;
  exact?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  component: Component,
  permissionName,
  scopeType = 'GLOBAL',
  scopeId,
  ...rest
}) => {
  return (
    <Route
      {...rest}
      render={props => {
        // Verificar se o usuário está autenticado
        const isAuthenticated = !!authService.getDecodedToken();
        
        if (!isAuthenticated) {
          // Redirecionar para a página de login
          return <Redirect to="/login" />;
        }
        
        // Se não for necessária permissão específica, renderizar o componente
        if (!permissionName) {
          return <Component {...props} />;
        }
        
        // Verificar se o usuário tem a permissão necessária
        const hasPermission = authService.hasPermission(permissionName, scopeType, scopeId);
        
        if (!hasPermission) {
          // Redirecionar para a página de acesso negado
          return <Redirect to="/acesso-negado" />;
        }
        
        // Renderizar o componente se o usuário tiver a permissão
        return <Component {...props} />;
      }}
    />
  );
};
```

Uso em rotas:

```tsx
// App.tsx
import React from 'react';
import { BrowserRouter, Switch } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { Login } from './Login';
import { Dashboard } from './Dashboard';
import { UserList } from './UserList';
import { UserEdit } from './UserEdit';
import { AccessDenied } from './AccessDenied';

export const App = () => {
  return (
    <BrowserRouter>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/acesso-negado" component={AccessDenied} />
        <ProtectedRoute path="/dashboard" component={Dashboard} />
        <ProtectedRoute 
          path="/usuarios" 
          component={UserList} 
          permissionName="usuario.listar" 
          exact
        />
        <ProtectedRoute 
          path="/usuarios/:id/editar" 
          component={UserEdit} 
          permissionName="usuario.editar" 
          scopeType="UNIT"
          // O scopeId será extraído dos parâmetros da rota no componente
        />
        <ProtectedRoute path="/" component={Dashboard} exact />
      </Switch>
    </BrowserRouter>
  );
};
```

### 7. Extração de Parâmetros de Rota

Para rotas protegidas com escopo UNIT, extraia o ID do recurso dos parâmetros da rota:

```tsx
// UserEdit.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PermissionGate } from './PermissionGate';
import { authService } from './auth.service';

export const UserEdit = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Verificar permissão programaticamente
    const hasPermission = authService.hasPermission('usuario.editar', 'UNIT', id);
    
    if (!hasPermission) {
      // Redirecionar ou mostrar mensagem de erro
      return;
    }
    
    // Carregar dados do usuário
    api.get(`/v1/users/${id}`)
      .then(response => {
        setUser(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Erro ao carregar usuário:', error);
        setLoading(false);
      });
  }, [id]);
  
  if (loading) {
    return <div>Carregando...</div>;
  }
  
  if (!user) {
    return <div>Usuário não encontrado</div>;
  }
  
  return (
    <div>
      <h1>Editar Usuário</h1>
      
      {/* Formulário de edição */}
      <form>
        {/* ... campos do formulário */}
        
        {/* Botão de salvar visível apenas para quem tem permissão de editar este usuário */}
        <PermissionGate 
          permissionName="usuario.editar" 
          scopeType="UNIT" 
          scopeId={id}
        >
          <button type="submit">Salvar</button>
        </PermissionGate>
      </form>
      
      {/* Seção de permissões visível apenas para administradores */}
      <PermissionGate permissionName="usuario.permissao.gerenciar">
        <div>
          <h2>Gerenciar Permissões</h2>
          {/* Interface para gerenciar permissões do usuário */}
        </div>
      </PermissionGate>
    </div>
  );
};
```

## Renovação de Token

Implemente a renovação automática do token quando ele expirar:

```typescript
// token-refresh.service.ts
class TokenRefreshService {
  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      return false;
    }
    
    try {
      const response = await api.post('/v1/auth/refresh', { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      
      return true;
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      
      // Se o refresh token for inválido, fazer logout
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      return false;
    }
  }
}

export const tokenRefreshService = new TokenRefreshService();
```

Integração com interceptor de API:

```typescript
// api.interceptor.ts
import axios from 'axios';
import { tokenRefreshService } from './token-refresh.service';

const api = axios.create({
  baseURL: 'http://localhost:3000',
});

// Interceptor para adicionar token a todas as requisições
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

// Interceptor para tratar erros de token expirado
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // Se o erro for 401 (Unauthorized) e não for uma requisição de refresh
    if (error.response.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url.includes('/auth/refresh')) {
      
      originalRequest._retry = true;
      
      // Tentar renovar o token
      const refreshed = await tokenRefreshService.refreshToken();
      
      if (refreshed) {
        // Atualizar o token na requisição original
        const token = localStorage.getItem('accessToken');
        originalRequest.headers.Authorization = `Bearer ${token}`;
        
        // Repetir a requisição original
        return api(originalRequest);
      }
      
      // Se não conseguir renovar, redirecionar para login
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

## Exemplos Práticos

### Exemplo 1: Dashboard com Funcionalidades Condicionais

```tsx
// Dashboard.tsx
import React from 'react';
import { PermissionGate } from './PermissionGate';

export const Dashboard = () => {
  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      <div className="dashboard-widgets">
        {/* Widget de usuários visível apenas para quem tem permissão */}
        <PermissionGate permissionName="usuario.visualizar">
          <div className="widget">
            <h2>Usuários</h2>
            {/* Conteúdo do widget */}
          </div>
        </PermissionGate>
        
        {/* Widget de benefícios visível apenas para quem tem permissão */}
        <PermissionGate permissionName="beneficio.visualizar">
          <div className="widget">
            <h2>Benefícios</h2>
            {/* Conteúdo do widget */}
          </div>
        </PermissionGate>
        
        {/* Widget de relatórios visível apenas para quem tem permissão */}
        <PermissionGate permissionName="relatorio.visualizar">
          <div className="widget">
            <h2>Relatórios</h2>
            {/* Conteúdo do widget */}
          </div>
        </PermissionGate>
        
        {/* Widget de administração visível apenas para administradores */}
        <PermissionGate permissionName="admin.acessar">
          <div className="widget">
            <h2>Administração</h2>
            {/* Conteúdo do widget */}
          </div>
        </PermissionGate>
      </div>
    </div>
  );
};
```

### Exemplo 2: Menu de Navegação Dinâmico

```tsx
// MainMenu.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { PermissionGate } from './PermissionGate';

export const MainMenu = () => {
  return (
    <nav className="main-menu">
      <ul>
        <li>
          <Link to="/dashboard">Dashboard</Link>
        </li>
        
        <PermissionGate permissionName="usuario.visualizar">
          <li>
            <Link to="/usuarios">Usuários</Link>
            <ul className="submenu">
              <PermissionGate permissionName="usuario.criar">
                <li>
                  <Link to="/usuarios/novo">Novo Usuário</Link>
                </li>
              </PermissionGate>
              
              <PermissionGate permissionName="usuario.permissao.gerenciar">
                <li>
                  <Link to="/usuarios/permissoes">Gerenciar Permissões</Link>
                </li>
              </PermissionGate>
            </ul>
          </li>
        </PermissionGate>
        
        <PermissionGate permissionName="beneficio.visualizar">
          <li>
            <Link to="/beneficios">Benefícios</Link>
            <ul className="submenu">
              <PermissionGate permissionName="beneficio.criar">
                <li>
                  <Link to="/beneficios/novo">Novo Benefício</Link>
                </li>
              </PermissionGate>
              
              <PermissionGate permissionName="beneficio.aprovar">
                <li>
                  <Link to="/beneficios/pendentes">Aprovar Benefícios</Link>
                </li>
              </PermissionGate>
            </ul>
          </li>
        </PermissionGate>
        
        <PermissionGate permissionName="relatorio.visualizar">
          <li>
            <Link to="/relatorios">Relatórios</Link>
          </li>
        </PermissionGate>
        
        <PermissionGate permissionName="admin.acessar">
          <li>
            <Link to="/admin">Administração</Link>
          </li>
        </PermissionGate>
      </ul>
    </nav>
  );
};
```

## Considerações de Segurança

1. **Não confie apenas na UI**: Sempre implemente verificações de permissão no backend
2. **Armazenamento seguro**: Considere alternativas mais seguras ao localStorage para armazenar tokens
3. **Validação de token**: Verifique a validade e a assinatura do token JWT
4. **Renovação de token**: Implemente a renovação automática do token antes que ele expire
5. **Logout em caso de erro**: Faça logout do usuário se o token não puder ser renovado
6. **Tempo de expiração**: Use tokens com tempo de expiração curto para minimizar riscos

## Solução de Problemas

### Permissão Negada Inesperadamente

1. Verifique se o token JWT contém as permissões corretas
2. Verifique se o escopo da permissão está correto
3. Verifique se o ID do recurso está sendo passado corretamente
4. Tente fazer logout e login novamente

### Problemas de Renovação de Token

1. Verifique se o refresh token está sendo armazenado corretamente
2. Verifique se o endpoint de refresh está funcionando
3. Verifique se o token não expirou completamente

### Problemas de Performance

1. Minimize o tamanho do token JWT
2. Implemente cache de verificações de permissão
3. Otimize a renderização condicional de componentes

## Referências

- [Documentação da API](/api/docs)
- [Guia de Desenvolvimento](/docs/guias/sistema-permissoes.md)
- [Exemplos de Código](/examples)

## Suporte

Para dúvidas ou problemas relacionados à integração do sistema de permissões no frontend, entre em contato com a equipe de desenvolvimento.
