/**
 * Estilos personalizados para o Swagger UI
 * 
 * Este arquivo contém todas as customizações visuais para a documentação da API,
 * incluindo estilos, animações e responsividade.
 */
export const swaggerCustomCss = `
  /* Animações */
  @keyframes fadeInDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(10, 77, 104, 0.4);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(10, 77, 104, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(10, 77, 104, 0);
    }
  }
  
  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  .swagger-ui .info {
    animation: fadeInDown 0.8s ease-out;
  }
  
  .swagger-ui .opblock-tag {
    animation: fadeInUp 0.6s ease-out;
    animation-fill-mode: both;
  }
  
  .swagger-ui .opblock:nth-child(1) { animation-delay: 0.1s; }
  .swagger-ui .opblock:nth-child(2) { animation-delay: 0.2s; }
  .swagger-ui .opblock:nth-child(3) { animation-delay: 0.3s; }
  .swagger-ui .opblock:nth-child(4) { animation-delay: 0.4s; }
  .swagger-ui .opblock:nth-child(5) { animation-delay: 0.5s; }
  
  .swagger-ui .btn.execute:hover {
    animation: pulse 1.5s infinite;
  }
  
  .swagger-ui .loading-container .loading:after {
    animation: rotate 1s linear infinite;
  }
  
  /* Estilos globais */
  body {
    font-family: 'Segoe UI', 'Roboto', sans-serif;
    background-color: #f8f9fa;
    margin: 0;
    padding: 0;
  }
  
  /* Cabeçalho e informações gerais */
  .swagger-ui .topbar { display: none }
  
  .swagger-ui .info {
    margin: 30px 0;
    padding: 20px 30px;
    background: white;
    color: #333;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  }
  
  .swagger-ui .info .title {
    font-size: 36px;
    font-weight: 600;
    color: #0a4d68;
    margin-bottom: 20px;
  }
  
  .swagger-ui .info .description {
    font-size: 16px;
    line-height: 1.6;
    max-width: 900px;
  }
  
  .swagger-ui .info .description h2 {
    font-size: 28px;
    margin: 30px 0 15px 0;
    font-weight: 600;
    border-bottom: 2px solid rgba(255, 255, 255, 0.3);
    padding-bottom: 8px;
  }
  
  .swagger-ui .info .description h3 {
    font-size: 22px;
    margin: 25px 0 10px 0;
    font-weight: 500;
  }
  
  .swagger-ui .info .description p {
    margin: 15px 0;
  }
  
  .swagger-ui .info .description ul {
    margin: 15px 0;
    padding-left: 25px;
  }
  
  .swagger-ui .info .description li {
    margin: 8px 0;
    list-style-type: square;
  }
  
  .swagger-ui .info a {
    color: #0a4d68;
    text-decoration: none;
    transition: all 0.2s ease;
  }
  
  .swagger-ui .info a:hover {
    color: #088395;
    text-decoration: underline;
  }
  
  /* Container de esquemas */
  .swagger-ui .scheme-container {
    margin: 20px 0;
    padding: 20px;
    background-color: white;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    border-radius: 8px;
  }
  
  /* Tags e seções */
  .swagger-ui .opblock-tag {
    font-size: 24px;
    margin: 25px 0 15px 0;
    padding: 15px;
    background-color: #f0f8ff;
    border-radius: 8px;
    border-left: 5px solid #0a4d68;
    transition: all 0.3s ease;
  }
  
  .swagger-ui .opblock-tag:hover {
    background-color: #e6f3ff;
    transform: translateX(5px);
  }
  
  .swagger-ui .opblock-tag small {
    font-size: 15px;
    color: #555;
    margin-left: 10px;
  }
  
  /* Blocos de operações */
  .swagger-ui .opblock {
    margin: 0 0 15px 0;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    transition: all 0.3s ease;
  }
  
  .swagger-ui .opblock:hover {
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
  
  /* Cores dos métodos HTTP */
  .swagger-ui .opblock-get {
    background-color: rgba(97, 175, 254, 0.1);
    border-color: #61affe;
  }
  
  .swagger-ui .opblock-post {
    background-color: rgba(73, 204, 144, 0.1);
    border-color: #49cc90;
  }
  
  .swagger-ui .opblock-put {
    background-color: rgba(252, 161, 48, 0.1);
    border-color: #fca130;
  }
  
  .swagger-ui .opblock-delete {
    background-color: rgba(249, 62, 62, 0.1);
    border-color: #f93e3e;
  }
  
  .swagger-ui .opblock-patch {
    background-color: rgba(80, 227, 194, 0.1);
    border-color: #50e3c2;
  }
  
  /* Resumo da operação */
  .swagger-ui .opblock .opblock-summary {
    padding: 10px 20px;
    display: flex;
    align-items: center;
  }
  
  .swagger-ui .opblock .opblock-summary-method {
    font-weight: 700;
    border-radius: 4px;
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.1);
  }
  
  .swagger-ui .opblock .opblock-summary-path {
    font-family: 'Roboto Mono', monospace;
    font-size: 16px;
    display: flex;
    align-items: center;
    padding: 0 10px;
  }
  
  .swagger-ui .opblock .opblock-summary-description {
    font-size: 14px;
    font-weight: 500;
    color: #555;
    text-align: right;
    padding-right: 10px;
    margin-left: auto;
  }
  
  /* Botões */
  .swagger-ui .btn {
    border-radius: 4px;
    font-weight: 500;
    text-transform: uppercase;
    font-size: 13px;
    padding: 8px 15px;
    transition: all 0.2s ease;
  }
  
  .swagger-ui .btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  .swagger-ui .btn.try-out__btn {
    background-color: #0a4d68;
    color: white;
    border: none;
  }
  
  .swagger-ui .btn.execute {
    background-color: #49cc90;
    color: white;
    border: none;
  }
  
  .swagger-ui .btn.cancel {
    background-color: #f93e3e;
    color: white;
    border: none;
  }
  
  /* Modelos */
  .swagger-ui section.models {
    margin: 30px 0;
    border: 1px solid #eee;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .swagger-ui .model-box {
    padding: 10px;
    background-color: #f8f9fa;
    border-radius: 4px;
  }
  
  .swagger-ui .model {
    font-size: 13px;
    font-family: 'Roboto Mono', monospace;
  }
  
  .swagger-ui .model-title {
    font-size: 16px;
    font-weight: 600;
    color: #0a4d68;
  }
  
  /* Responsividade */
  @media (max-width: 768px) {
    .swagger-ui .info .title {
      font-size: 32px;
    }
    
    .swagger-ui .opblock-tag {
      font-size: 20px;
    }
    
    .swagger-ui .opblock .opblock-summary-path {
      font-size: 14px;
    }
  }

  /* Esconde alguns elementos desnecessários */
  .swagger-ui .topbar .download-url-wrapper { display: none }
  
  .swagger-ui {
    font-family: 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    color: #333;
  }
  
  /* Reset e estilos base */
  .swagger-ui {
    font-family: 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    color: #333;
  }
  
  /* Cabeçalho */
  .swagger-ui .topbar {
    background-color: #1e3a8a;
    padding: 10px 0;
  }
  
  .swagger-ui .topbar-wrapper {
    align-items: center;
    display: flex;
  }
  
  .swagger-ui .topbar-wrapper img {
    max-width: 180px;
    height: auto;
  }
  
  /* Títulos */
  .swagger-ui .info hgroup.main {
    margin: 0 0 20px;
  }
  
  .swagger-ui .info h2 {
    font-size: 24px;
    margin: 0;
  }
  
  .swagger-ui .info h3 {
    font-size: 16px;
    margin: 10px 0 5px;
  }
  
  /* Seções */
  .swagger-ui .opblock-tag-section {
    margin-bottom: 30px;
  }
  
  .swagger-ui .opblock {
    border-radius: 4px;
    margin-bottom: 15px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  }
  
  /* Botões */
  .swagger-ui .btn {
    border-radius: 4px;
    font-weight: 500;
    padding: 5px 15px;
  }
  
  .swagger-ui .btn.execute {
    background-color: #3b82f6;
  }
  
  .swagger-ui .btn.authorize {
    background-color: #10b981;
    color: white;
  }
  
  /* Cores para os métodos HTTP */
  .swagger-ui .opblock.opblock-get {
    background: rgba(97, 175, 254, 0.1);
    border-color: #61affe;
  }
  
  .swagger-ui .opblock.opblock-post {
    background: rgba(73, 204, 144, 0.1);
    border-color: #49cc90;
  }
  
  .swagger-ui .opblock.opblock-put {
    background: rgba(252, 161, 48, 0.1);
    border-color: #fca130;
  }
  
  .swagger-ui .opblock.opblock-delete {
    background: rgba(249, 62, 62, 0.1);
    border-color: #f93e3e;
  }
  
  /* Responsividade */
  @media (max-width: 768px) {
    .swagger-ui .wrapper {
      padding: 10px;
    }
    
    .swagger-ui .opblock {
      margin: 0 0 15px 0;
    }
  }
`;
