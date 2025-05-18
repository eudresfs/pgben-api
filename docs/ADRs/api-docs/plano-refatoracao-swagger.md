# Plano de Refatoração do Swagger para Incluir Barra Lateral de Navegação

Após analisar todos os arquivos fornecidos, percebi que você tem uma documentação Swagger robusta e bem estruturada, com uma excelente organização do código. Agora, vamos criar um plano para implementar a barra lateral de navegação mantendo a qualidade da documentação atual.

## Análise da Situação Atual

**Pontos fortes:**
- Documentação bem organizada com schemas, exemplos e respostas
- Separação clara de preocupações em arquivos diferentes
- Estrutura modular para facilitar manutenção
- Estilos e animações bem definidos

**Oportunidades de melhoria:**
- O HTML atual não possui barra lateral de navegação para facilitar a navegação
- O script de inicialização (`swagger-ui-init.js`) precisa ser personalizado
- A estrutura responsiva pode ser aprimorada

## Plano de Implementação

### 1. Criar um Novo Arquivo HTML Principal

Criaremos um novo arquivo HTML que mantém a maioria dos elementos existentes, mas inclui a barra lateral.

```html
<!-- docs-ui.html -->
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>API PGBEN - Documentação</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" type="text/css" href="./swagger-ui.css">
  <link rel="stylesheet" type="text/css" href="./sidebar.css">
  <link rel="icon" type="image/png" href="./favicon-32x32.png" sizes="32x32">
  <link rel="icon" type="image/png" href="./favicon-16x16.png" sizes="16x16">
</head>
<body>
  <div id="sidebar" class="sidebar">
    <div class="sidebar-header">
      <h3>API PGBEN</h3>
    </div>
    <div class="sidebar-menu" id="sidebar-menu">
      <!-- Menu gerado dinamicamente via JavaScript -->
    </div>
  </div>
  
  <div id="main-content">
    <button id="sidebar-toggle" class="sidebar-toggle">☰</button>
    <div id="swagger-ui"></div>
  </div>

  <script src="./swagger-ui-bundle.js"></script>
  <script src="./swagger-ui-standalone-preset.js"></script>
  <script src="./swagger-init.js"></script>
  <script src="./sidebar.js"></script>
</body>
</html>
```

### 2. Criar Arquivo CSS para a Barra Lateral

```css
/* sidebar.css */
:root {
  --sidebar-width: 250px;
  --sidebar-bg: #f0f2f5;
  --sidebar-hover-bg: #e6f4f1;
  --sidebar-active-bg: #e6f4f1;
  --sidebar-border: #0a4d68;
  --text-color: #333;
  --header-color: #0a4d68;
}

body {
  margin: 0;
  padding: 0;
  display: flex;
}

.sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  background-color: var(--sidebar-bg);
  overflow-y: auto;
  z-index: 100;
  box-shadow: 2px 0 5px rgba(0,0,0,0.1);
  transition: transform 0.3s ease;
}

.sidebar-header {
  padding: 15px 20px;
  border-bottom: 1px solid #ddd;
}

.sidebar-header h3 {
  margin: 0;
  color: var(--header-color);
  font-size: 18px;
  font-weight: 700;
}

.sidebar-menu {
  padding: 10px 0;
}

.sidebar-menu-item {
  padding: 10px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.sidebar-menu-item:hover {
  background-color: var(--sidebar-hover-bg);
  border-left-color: var(--sidebar-border);
}

.sidebar-menu-item.active {
  background-color: var(--sidebar-active-bg);
  border-left-color: var(--sidebar-border);
  font-weight: 600;
}

.sidebar-menu-item a {
  color: var(--text-color);
  text-decoration: none;
  display: block;
}

.sidebar-submenu {
  padding-left: 15px;
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.sidebar-menu-item.open .sidebar-submenu {
  max-height: 500px;
}

.sidebar-submenu-item {
  padding: 8px 15px;
  font-size: 0.9em;
}

#main-content {
  margin-left: var(--sidebar-width);
  width: calc(100% - var(--sidebar-width));
  transition: margin-left 0.3s ease, width 0.3s ease;
}

.sidebar-toggle {
  display: none;
  position: fixed;
  top: 15px;
  left: 15px;
  z-index: 999;
  background-color: var(--header-color);
  color: white;
  border: none;
  border-radius: 4px;
  width: 40px;
  height: 40px;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

/* Responsividade */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
  }
  
  .sidebar.open {
    transform: translateX(0);
  }
  
  #main-content {
    margin-left: 0;
    width: 100%;
  }
  
  .sidebar-toggle {
    display: block;
  }
}
```

### 3. Criar Script JavaScript para Inicialização do Swagger com Barra Lateral

```javascript
// swagger-init.js
window.onload = function() {
  // Configuração do Swagger UI
  const ui = SwaggerUIBundle({
    url: "./swagger-spec.json",
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    plugins: [
      SwaggerUIBundle.plugins.DownloadUrl
    ],
    layout: "StandaloneLayout",
    tagsSorter: 'alpha',
    docExpansion: 'list',
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
    displayRequestDuration: true,
    filter: true,
    syntaxHighlight: {
      activated: true,
      theme: "tomorrow-night"
    },
    tryItOutEnabled: true
  });

  window.ui = ui;
  
  // Extrair tags após a inicialização do Swagger para população da barra lateral
  setTimeout(function() {
    populateSidebar(ui);
  }, 1000);
};
```

### 4. Criar Script para a Funcionalidade da Barra Lateral

```javascript
// sidebar.js
function populateSidebar(ui) {
  // Obter o elemento do menu da barra lateral
  const sidebarMenu = document.getElementById('sidebar-menu');
  
  // Limpar o menu atual
  sidebarMenu.innerHTML = '';
  
  // Adicionar link para a visão geral
  const overviewItem = document.createElement('div');
  overviewItem.className = 'sidebar-menu-item';
  overviewItem.innerHTML = '<a href="#/">Visão Geral</a>';
  overviewItem.addEventListener('click', function() {
    document.location.hash = "/";
    highlightActiveItem();
  });
  sidebarMenu.appendChild(overviewItem);
  
  // Obter todas as tags do Swagger
  const tags = document.querySelectorAll('.opblock-tag');
  
  // Para cada tag, criar um item no menu
  tags.forEach((tag) => {
    const tagId = tag.getAttribute('id');
    const tagName = tag.querySelector('.opblock-tag-section h3 span').textContent.trim();
    
    // Criar o item do menu
    const menuItem = document.createElement('div');
    menuItem.className = 'sidebar-menu-item';
    menuItem.innerHTML = `<a href="#tag/${tagName}">${tagName}</a>`;
    
    // Adicionar evento de clique
    menuItem.addEventListener('click', function() {
      document.getElementById(tagId).scrollIntoView({ behavior: 'smooth' });
      document.location.hash = `/tag/${tagName}`;
      highlightActiveItem();
    });
    
    // Adicionar ao menu
    sidebarMenu.appendChild(menuItem);
    
    // Obter todas as operações (endpoints) dessa tag
    const operations = tag.parentElement.querySelectorAll('.opblock');
    
    // Se houver operações, criar submenu
    if (operations.length > 0) {
      const submenu = document.createElement('div');
      submenu.className = 'sidebar-submenu';
      
      operations.forEach((operation) => {
        const method = operation.querySelector('.opblock-summary-method').textContent.trim();
        const path = operation.querySelector('.opblock-summary-path').textContent.trim();
        
        const submenuItem = document.createElement('div');
        submenuItem.className = 'sidebar-submenu-item';
        submenuItem.innerHTML = `<a href="#${method}-${path.replace(/\//g, '-')}"><span class="method ${method.toLowerCase()}">${method}</span> ${path}</a>`;
        
        submenuItem.addEventListener('click', function(e) {
          e.stopPropagation();
          operation.scrollIntoView({ behavior: 'smooth' });
          
          // Expandir a operação se estiver fechada
          if (!operation.classList.contains('is-open')) {
            operation.querySelector('.opblock-summary').click();
          }
        });
        
        submenu.appendChild(submenuItem);
      });
      
      menuItem.appendChild(submenu);
      
      // Adicionar funcionalidade de expansão do submenu
      menuItem.addEventListener('click', function() {
        this.classList.toggle('open');
      });
    }
  });
  
  // Inicializar com o item ativo
  highlightActiveItem();
  
  // Adicionar funcionalidade ao botão de alternância da barra lateral
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  
  sidebarToggle.addEventListener('click', function() {
    sidebar.classList.toggle('open');
  });
}

// Função para destacar o item ativo com base na URL atual
function highlightActiveItem() {
  // Remover classe 'active' de todos os itens
  document.querySelectorAll('.sidebar-menu-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Obter o hash atual
  const hash = document.location.hash;
  
  // Encontrar e destacar o item ativo
  document.querySelectorAll('.sidebar-menu-item a').forEach(link => {
    if (link.getAttribute('href') === hash) {
      link.parentElement.classList.add('active');
      
      // Se estiver em um submenu, abrir o menu pai
      if (link.parentElement.classList.contains('sidebar-submenu-item')) {
        link.parentElement.parentElement.parentElement.classList.add('open');
      }
    }
  });
}

// Adicionar listener para atualizar o item ativo quando a URL mudar
window.addEventListener('hashchange', highlightActiveItem);
```

### 5. Alterações no Swagger Config

Modificar `swagger.config.ts` para exportar o arquivo de especificação JSON para o diretório público:

```typescript
// swagger.config.ts
import * as fs from 'fs';
import * as path from 'path';

export function setupSwagger(app: INestApplication) {
  // Configuração existente...
  
  // Salvar a especificação para uso na UI personalizada
  const outputPath = path.join(__dirname, '../../public/api-docs/swagger-spec.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    JSON.stringify(document, null, 2)
  );
  
  // Configuração existente...
}
```

### 6. Estrutura de Arquivos Finais

```
public/
└── api-docs/
    ├── favicon-16x16.png
    ├── favicon-32x32.png
    ├── docs-ui.html       # Novo arquivo HTML principal
    ├── sidebar.css        # Estilos da barra lateral
    ├── sidebar.js         # Script da barra lateral
    ├── swagger-ui.css     # CSS existente do Swagger
    ├── swagger-init.js    # Script de inicialização personalizado
    ├── swagger-spec.json  # Especificação gerada pelo Nest
    ├── swagger-ui-bundle.js
    └── swagger-ui-standalone-preset.js
```

### 7. Configuração no NestJS Main.ts

Modificar `main.ts` para servir a nova interface:

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './shared/configs/swagger/swagger.config';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configurar Swagger
  setupSwagger(app);
  
  // Servir arquivos estáticos incluindo a documentação personalizada
  app.use('/api-docs', express.static(join(__dirname, '..', 'public/api-docs')));
  
  // Redirecionar /api para a documentação personalizada
  app.use('/api', (req, res) => {
    res.redirect('/api-docs/docs-ui.html');
  });
  
  await app.listen(3000);
}
bootstrap();
```

## Passos de Implementação

1. **Criar a estrutura de diretórios** na pasta `public/api-docs`
2. **Copiar os arquivos base do Swagger UI** (CSS e JS) para essa pasta
3. **Criar os novos arquivos** (HTML, CSS e JS) conforme descrito acima
4. **Modificar a configuração** no NestJS para exportar a especificação e servir os arquivos estáticos
5. **Testar a documentação** navegando para `/api` ou `/api-docs/docs-ui.html`

## Benefícios da Nova Implementação (continuação)

1. **Navegação facilitada** com barra lateral organizada por tags e endpoints
2. **Design responsivo** que funciona em dispositivos móveis e desktop
3. **Manutenção da UI existente** preservando estilos e animações que você já desenvolveu
4. **Separação clara de preocupações** dividindo o código em arquivos específicos
5. **Experiência aprimorada para o usuário** com acesso rápido a seções específicas da documentação

## Otimizações Adicionais

### 1. Adicionar Motor de Busca na Barra Lateral

Adicionar um campo de busca na barra lateral para filtrar endpoints:

```html
<!-- Adicionar no sidebar-header -->
<div class="sidebar-search">
  <input type="text" id="sidebar-search-input" placeholder="Buscar endpoints...">
</div>
```

```javascript
// Adicionar ao sidebar.js
function setupSearch() {
  const searchInput = document.getElementById('sidebar-search-input');
  searchInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    
    document.querySelectorAll('.sidebar-menu-item').forEach(item => {
      const tagText = item.textContent.toLowerCase();
      const hasMatch = tagText.includes(searchTerm);
      
      // Se for um item principal, verificar se tem submenu
      if (item.querySelector('.sidebar-submenu')) {
        const submenuItems = Array.from(item.querySelectorAll('.sidebar-submenu-item'));
        const submenuMatch = submenuItems.some(subItem => 
          subItem.textContent.toLowerCase().includes(searchTerm)
        );
        
        if (hasMatch || submenuMatch) {
          item.style.display = 'block';
          
          // Se o termo de busca corresponde a um submenu, expandi-lo
          if (submenuMatch && searchTerm.length > 0) {
            item.classList.add('open');
            
            // Mostrar/ocultar itens do submenu com base na correspondência
            submenuItems.forEach(subItem => {
              subItem.style.display = subItem.textContent.toLowerCase().includes(searchTerm) 
                ? 'block' 
                : 'none';
            });
          } else if (searchTerm.length === 0) {
            // Quando a busca é limpa, retornar ao estado normal
            item.classList.remove('open');
            submenuItems.forEach(subItem => {
              subItem.style.display = 'block';
            });
          }
        } else {
          item.style.display = 'none';
        }
      } else {
        // Item simples, sem submenu
        item.style.display = hasMatch ? 'block' : 'none';
      }
    });
  });
}
```

### 2. Adicionar Modo Escuro

Implementar alternância entre modo claro e escuro:

```html
<!-- Adicionar no sidebar-header -->
<div class="theme-toggle">
  <button id="theme-toggle-btn">🌙</button>
</div>
```

```javascript
// Adicionar ao sidebar.js
function setupThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const body = document.body;
  
  // Verificar preferência salva
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    body.classList.add('dark-theme');
    toggleBtn.textContent = '☀️';
  }
  
  toggleBtn.addEventListener('click', function() {
    body.classList.toggle('dark-theme');
    
    if (body.classList.contains('dark-theme')) {
      localStorage.setItem('theme', 'dark');
      toggleBtn.textContent = '☀️';
    } else {
      localStorage.setItem('theme', 'light');
      toggleBtn.textContent = '🌙';
    }
  });
}
```

```css
/* Adicionar ao sidebar.css */
/* Tema escuro */
body.dark-theme {
  --sidebar-bg: #252a33;
  --sidebar-hover-bg: #2f3643;
  --sidebar-active-bg: #384152;
  --sidebar-border: #53b4cf;
  --text-color: #e0e0e0;
  --header-color: #53b4cf;
}

body.dark-theme .swagger-ui {
  filter: invert(0.9) hue-rotate(180deg);
}

body.dark-theme .swagger-ui pre {
  filter: invert(0.9) hue-rotate(180deg);
}

.theme-toggle {
  position: absolute;
  top: 15px;
  right: 15px;
}

.theme-toggle button {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 5px;
}
```

### 3. Adicionar Agrupamento por Domínios/Módulos

Para documentações muito grandes, agrupar as tags em seções por domínio:

```javascript
// Configurar no swagger.config.ts
export const tagGroups = [
  {
    name: 'Autenticação e Usuários',
    tags: ['auth', 'usuarios']
  },
  {
    name: 'Cidadãos',
    tags: ['cidadaos']
  },
  {
    name: 'Benefícios',
    tags: ['beneficios', 'solicitacoes']
  },
  {
    name: 'Documentação',
    tags: ['documentos']
  },
  {
    name: 'Sistema',
    tags: ['health', 'metrics']
  }
];

// Modificar o populateSidebar no sidebar.js
function populateSidebar(ui) {
  // Código anterior...
  
  // Se houver grupos de tags definidos, usar essa estrutura
  if (window.tagGroups && window.tagGroups.length > 0) {
    const tagsByName = {};
    
    // Mapear todas as tags pelo nome
    tags.forEach(tag => {
      const tagName = tag.querySelector('.opblock-tag-section h3 span').textContent.trim();
      tagsByName[tagName] = tag;
    });
    
    // Criar grupos na barra lateral
    window.tagGroups.forEach(group => {
      // Criar cabeçalho do grupo
      const groupHeader = document.createElement('div');
      groupHeader.className = 'sidebar-group-header';
      groupHeader.textContent = group.name;
      sidebarMenu.appendChild(groupHeader);
      
      // Adicionar tags pertencentes a este grupo
      group.tags.forEach(tagName => {
        if (tagsByName[tagName]) {
          // Código para adicionar o item do menu e submenu
          // (similar ao código anterior)
        }
      });
    });
  } else {
    // Código existente para adicionar todas as tags sem agrupamento
  }
}
```

### 4. Melhoria na Visualização de Modelos

Adicionar uma seção dedicada para visualizar modelos/schemas:

```javascript
// Adicionar ao sidebar.js
function addModelsSection() {
  const sidebarMenu = document.getElementById('sidebar-menu');
  
  // Criar botão para mostrar/ocultar modelos
  const modelsToggle = document.createElement('div');
  modelsToggle.className = 'sidebar-menu-item models-toggle';
  modelsToggle.innerHTML = '<a href="#models">Modelos (Schemas)</a>';
  
  modelsToggle.addEventListener('click', function() {
    // Expandir/recolher a seção de modelos do Swagger UI
    const modelsSection = document.querySelector('.swagger-ui section.models');
    if (modelsSection) {
      const modelsToggle = modelsSection.querySelector('.models-control');
      if (modelsToggle && !modelsSection.classList.contains('is-open')) {
        modelsToggle.click();
      }
      
      // Rolar até a seção de modelos
      modelsSection.scrollIntoView({ behavior: 'smooth' });
    }
  });
  
  // Adicionar ao final do menu
  sidebarMenu.appendChild(modelsToggle);
}
```

## Exemplo de Configuração Final

Vamos atualizar o arquivo `sidebar.js` para incluir todas as funcionalidades propostas:

```javascript
// sidebar.js (versão completa)
function populateSidebar(ui) {
  // Obter o elemento do menu da barra lateral
  const sidebarMenu = document.getElementById('sidebar-menu');
  
  // Limpar o menu atual
  sidebarMenu.innerHTML = '';
  
  // Adicionar link para a visão geral
  const overviewItem = document.createElement('div');
  overviewItem.className = 'sidebar-menu-item';
  overviewItem.innerHTML = '<a href="#/">Visão Geral</a>';
  overviewItem.addEventListener('click', function() {
    document.location.hash = "/";
    highlightActiveItem();
  });
  sidebarMenu.appendChild(overviewItem);
  
  // Obter todas as tags do Swagger
  const tags = document.querySelectorAll('.opblock-tag');
  const tagsByName = {};
  
  // Mapear todas as tags pelo nome
  tags.forEach(tag => {
    const tagName = tag.querySelector('.opblock-tag-section h3 span').textContent.trim();
    tagsByName[tagName] = tag;
  });
  
  // Se houver grupos de tags definidos, usar essa estrutura
  if (window.tagGroups && window.tagGroups.length > 0) {
    // Criar grupos na barra lateral
    window.tagGroups.forEach(group => {
      // Criar cabeçalho do grupo
      const groupHeader = document.createElement('div');
      groupHeader.className = 'sidebar-group-header';
      groupHeader.textContent = group.name;
      sidebarMenu.appendChild(groupHeader);
      
      // Adicionar tags pertencentes a este grupo
      group.tags.forEach(tagName => {
        if (tagsByName[tagName]) {
          addTagToMenu(tagsByName[tagName], tagName, sidebarMenu);
        }
      });
    });
  } else {
    // Adicionar todas as tags sem agrupamento
    tags.forEach((tag) => {
      const tagName = tag.querySelector('.opblock-tag-section h3 span').textContent.trim();
      addTagToMenu(tag, tagName, sidebarMenu);
    });
  }
  
  // Adicionar seção de modelos
  addModelsSection();
  
  // Inicializar com o item ativo
  highlightActiveItem();
  
  // Configurar funcionalidades adicionais
  setupSearch();
  setupThemeToggle();
  setupSidebarToggle();
}

function addTagToMenu(tag, tagName, sidebarMenu) {
  const tagId = tag.getAttribute('id');
  
  // Criar o item do menu
  const menuItem = document.createElement('div');
  menuItem.className = 'sidebar-menu-item';
  menuItem.innerHTML = `<a href="#tag/${tagName}">${tagName}</a>`;
  
  // Adicionar evento de clique
  menuItem.addEventListener('click', function() {
    document.getElementById(tagId).scrollIntoView({ behavior: 'smooth' });
    document.location.hash = `/tag/${tagName}`;
    highlightActiveItem();
  });
  
  // Adicionar ao menu
  sidebarMenu.appendChild(menuItem);
  
  // Obter todas as operações (endpoints) dessa tag
  const operations = tag.parentElement.querySelectorAll('.opblock');
  
  // Se houver operações, criar submenu
  if (operations.length > 0) {
    const submenu = document.createElement('div');
    submenu.className = 'sidebar-submenu';
    
    operations.forEach((operation) => {
      const method = operation.querySelector('.opblock-summary-method').textContent.trim();
      const path = operation.querySelector('.opblock-summary-path').textContent.trim();
      const summary = operation.querySelector('.opblock-summary-description')?.textContent.trim() || '';
      
      const submenuItem = document.createElement('div');
      submenuItem.className = 'sidebar-submenu-item';
      submenuItem.innerHTML = `
        <a href="#${method}-${path.replace(/\//g, '-')}">
          <span class="method ${method.toLowerCase()}">${method}</span> 
          <span class="path">${path}</span>
          <span class="summary">${summary}</span>
        </a>
      `;
      
      submenuItem.addEventListener('click', function(e) {
        e.stopPropagation();
        operation.scrollIntoView({ behavior: 'smooth' });
        
        // Expandir a operação se estiver fechada
        if (!operation.classList.contains('is-open')) {
          operation.querySelector('.opblock-summary').click();
        }
      });
      
      submenu.appendChild(submenuItem);
    });
    
    menuItem.appendChild(submenu);
    
    // Adicionar funcionalidade de expansão do submenu
    menuItem.addEventListener('click', function() {
      this.classList.toggle('open');
    });
  }
}

function addModelsSection() {
  const sidebarMenu = document.getElementById('sidebar-menu');
  
  // Criar separador visual
  const separator = document.createElement('div');
  separator.className = 'sidebar-separator';
  sidebarMenu.appendChild(separator);
  
  // Criar botão para mostrar/ocultar modelos
  const modelsToggle = document.createElement('div');
  modelsToggle.className = 'sidebar-menu-item models-toggle';
  modelsToggle.innerHTML = '<a href="#models">Modelos (Schemas)</a>';
  
  modelsToggle.addEventListener('click', function() {
    // Expandir/recolher a seção de modelos do Swagger UI
    const modelsSection = document.querySelector('.swagger-ui section.models');
    if (modelsSection) {
      const modelsToggle = modelsSection.querySelector('.models-control');
      if (modelsToggle && !modelsSection.classList.contains('is-open')) {
        modelsToggle.click();
      }
      
      // Rolar até a seção de modelos
      modelsSection.scrollIntoView({ behavior: 'smooth' });
    }
  });
  
  // Adicionar ao final do menu
  sidebarMenu.appendChild(modelsToggle);
}

function setupSearch() {
  // Adicionar campo de busca ao DOM
  const sidebarHeader = document.querySelector('.sidebar-header');
  const searchDiv = document.createElement('div');
  searchDiv.className = 'sidebar-search';
  searchDiv.innerHTML = '<input type="text" id="sidebar-search-input" placeholder="Buscar endpoints...">';
  sidebarHeader.appendChild(searchDiv);
  
  // Configurar funcionalidade de busca
  const searchInput = document.getElementById('sidebar-search-input');
  searchInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    
    document.querySelectorAll('.sidebar-menu-item:not(.models-toggle)').forEach(item => {
      const tagText = item.textContent.toLowerCase();
      const hasMatch = tagText.includes(searchTerm);
      
      // Se for um item principal, verificar se tem submenu
      if (item.querySelector('.sidebar-submenu')) {
        const submenuItems = Array.from(item.querySelectorAll('.sidebar-submenu-item'));
        const submenuMatch = submenuItems.some(subItem => 
          subItem.textContent.toLowerCase().includes(searchTerm)
        );
        
        if (hasMatch || submenuMatch) {
          item.style.display = 'block';
          
          // Se o termo de busca corresponde a um submenu, expandi-lo
          if (submenuMatch && searchTerm.length > 0) {
            item.classList.add('open');
            
            // Mostrar/ocultar itens do submenu com base na correspondência
            submenuItems.forEach(subItem => {
              subItem.style.display = subItem.textContent.toLowerCase().includes(searchTerm) 
                ? 'block' 
                : 'none';
            });
          } else if (searchTerm.length === 0) {
            // Quando a busca é limpa, retornar ao estado normal
            item.classList.remove('open');
            submenuItems.forEach(subItem => {
              subItem.style.display = 'block';
            });
          }
        } else {
          item.style.display = 'none';
        }
      } else {
        // Item simples, sem submenu
        item.style.display = hasMatch ? 'block' : 'none';
      }
    });
    
    // Mostrar sempre os cabeçalhos de grupo e separadores
    document.querySelectorAll('.sidebar-group-header, .sidebar-separator').forEach(el => {
      el.style.display = 'block';
    });
  });
}

function setupThemeToggle() {
  // Adicionar botão de alternância de tema ao DOM
  const sidebarHeader = document.querySelector('.sidebar-header');
  const themeToggleDiv = document.createElement('div');
  themeToggleDiv.className = 'theme-toggle';
  themeToggleDiv.innerHTML = '<button id="theme-toggle-btn">🌙</button>';
  sidebarHeader.appendChild(themeToggleDiv);
  
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const body = document.body;
  
  // Verificar preferência salva
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    body.classList.add('dark-theme');
    toggleBtn.textContent = '☀️';
  }
  
  toggleBtn.addEventListener('click', function() {
    body.classList.toggle('dark-theme');
    
    if (body.classList.contains('dark-theme')) {
      localStorage.setItem('theme', 'dark');
      toggleBtn.textContent = '☀️';
    } else {
      localStorage.setItem('theme', 'light');
      toggleBtn.textContent = '🌙';
    }
  });
}

function setupSidebarToggle() {
  // Adicionar botão de alternância da barra lateral
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('main-content');
  
  sidebarToggle.addEventListener('click', function() {
    sidebar.classList.toggle('open');
    
    if (sidebar.classList.contains('open')) {
      mainContent.style.marginLeft = '0';
    } else {
      // Verificar se está em modo mobile
      if (window.innerWidth <= 768) {
        mainContent.style.marginLeft = '0';
      } else {
        mainContent.style.marginLeft = '250px';
      }
    }
  });
  
  // Verificar tamanho da janela para modo responsivo
  window.addEventListener('resize', function() {
    if (window.innerWidth <= 768) {
      sidebar.classList.remove('open');
      mainContent.style.marginLeft = '0';
    } else {
      sidebar.classList.add('open');
      mainContent.style.marginLeft = '250px';
    }
  });
  
  // Inicializar com base no tamanho da tela
  if (window.innerWidth <= 768) {
    sidebar.classList.remove('open');
    mainContent.style.marginLeft = '0';
  } else {
    sidebar.classList.add('open');
    mainContent.style.marginLeft = '250px';
  }
}

// Função para destacar o item ativo com base na URL atual
function highlightActiveItem() {
  // Remover classe 'active' de todos os itens
  document.querySelectorAll('.sidebar-menu-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Obter o hash atual
  const hash = document.location.hash;
  
  // Encontrar e destacar o item ativo
  document.querySelectorAll('.sidebar-menu-item a').forEach(link => {
    if (link.getAttribute('href') === hash) {
      link.parentElement.classList.add('active');
      
      // Se estiver em um submenu, abrir o menu pai
      if (link.parentElement.classList.contains('sidebar-submenu-item')) {
        link.parentElement.parentElement.parentElement.classList.add('open');
      }
    }
  });
}

// Adicionar listener para atualizar o item ativo quando a URL mudar
window.addEventListener('hashchange', highlightActiveItem);
```

## Conclusão

Esta implementação proposta preserva seu investimento atual na documentação Swagger, adicionando uma interface de navegação lateral que melhora significativamente a usabilidade, especialmente para APIs maiores e mais complexas.

Conseguimos adicionar várias funcionalidades úteis:
1. Navegação lateral com organização por tags e endpoints
2. Busca rápida na barra lateral
3. Alternância entre tema claro e escuro
4. Agrupamento por domínios funcionais
5. Acesso fácil aos modelos/schemas
6. Design responsivo para todos os dispositivos

O código foi organizado em módulos separados para facilitar a manutenção futura, e todas as funcionalidades podem ser ativadas ou desativadas conforme necessário.