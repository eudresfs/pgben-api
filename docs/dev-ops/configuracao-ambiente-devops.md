# Configuração do Ambiente DevOps - PGBen

## Introdução

Este documento descreve a configuração do ambiente DevOps para o projeto PGBen, incluindo as ferramentas de CI/CD, monitoramento, observabilidade e segurança implementadas como parte do plano de ação de DevOps e Qualidade.

## Ferramentas Implementadas

### 1. Integração Contínua e Entrega Contínua (CI/CD)

Foi configurado um pipeline de CI/CD utilizando GitHub Actions com as seguintes etapas:

- **Lint**: Verificação de qualidade de código com ESLint
- **Test**: Execução de testes automatizados
- **SonarQube**: Análise estática de código para identificação de problemas de qualidade e segurança
- **Build**: Compilação do código para produção
- **Deploy**: Implantação automática nos ambientes de homologação e produção

Arquivos de configuração:
- `.github/workflows/ci.yml`: Configuração do pipeline de CI/CD
- `sonar-project.properties`: Configuração do SonarQube para análise de código

### 2. Monitoramento e Observabilidade

Foi implementada uma stack completa de monitoramento e observabilidade com as seguintes ferramentas:

- **Prometheus**: Coleta e armazenamento de métricas
- **Grafana**: Visualização de métricas e criação de dashboards
- **ELK Stack**: Centralização e análise de logs
  - **Elasticsearch**: Armazenamento e indexação de logs
  - **Logstash**: Processamento e transformação de logs
  - **Kibana**: Visualização e análise de logs
- **Jaeger**: Rastreamento distribuído para análise de performance
- **Alertmanager**: Gerenciamento e roteamento de alertas

Arquivos de configuração:
- `docker-compose.monitoring.yml`: Configuração dos serviços de monitoramento
- `config/prometheus/prometheus.yml`: Configuração do Prometheus
- `config/alertmanager/alertmanager.yml`: Configuração do Alertmanager
- `config/logstash/pipeline/pgben.conf`: Pipeline de processamento de logs
- `config/grafana/provisioning/datasources/datasources.yml`: Configuração das fontes de dados do Grafana
- `config/grafana/provisioning/dashboards/dashboards.yml`: Configuração dos dashboards do Grafana

### 3. Ambiente de Desenvolvimento

O ambiente de desenvolvimento foi configurado com Docker Compose, incluindo todos os serviços necessários para o desenvolvimento local:

- **PostgreSQL**: Banco de dados relacional
- **Redis**: Cache e armazenamento de sessões
- **MinIO**: Armazenamento de objetos para documentos
- **MailHog**: Servidor SMTP para testes de email

## Como Utilizar

### Configuração Inicial

1. Certifique-se de ter o Docker e o Docker Compose instalados
2. Execute o script de configuração:
   ```powershell
   .\setup-devops.ps1
   ```
3. O script irá iniciar todos os serviços necessários e exibir as informações de acesso

### Acessando as Ferramentas

- **SonarQube**: Configurar no servidor SonarQube da organização
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (usuário: admin, senha: admin)
- **Kibana**: http://localhost:5601
- **Jaeger**: http://localhost:16686
- **Alertmanager**: http://localhost:9093
- **MinIO Console**: http://localhost:9001 (usuário: minioadmin, senha: minioadmin)
- **MailHog**: http://localhost:8025

### Executando o Pipeline de CI/CD

O pipeline de CI/CD é executado automaticamente quando:
- Um push é feito para as branches `main` ou `develop`
- Um pull request é aberto para as branches `main` ou `develop`

## Próximos Passos

1. **Configuração do SonarQube**: Configurar o token do SonarQube nos secrets do GitHub
2. **Criação de Dashboards**: Desenvolver dashboards personalizados no Grafana para monitoramento de métricas de negócio
3. **Configuração de Alertas**: Definir regras de alerta específicas para o projeto
4. **Implementação de Métricas de Negócio**: Adicionar métricas específicas do negócio na aplicação
5. **Configuração de Tracing**: Implementar o rastreamento distribuído na aplicação

## Considerações de Segurança

- As credenciais utilizadas neste ambiente de desenvolvimento não devem ser utilizadas em produção
- Para ambientes de produção, utilizar secrets gerenciados e rotação de credenciais
- Implementar políticas de acesso restritivas para os serviços de monitoramento
- Configurar TLS para comunicação entre os serviços

## Referências

- [Documentação do Docker](https://docs.docker.com/)
- [Documentação do Prometheus](https://prometheus.io/docs/introduction/overview/)
- [Documentação do Grafana](https://grafana.com/docs/)
- [Documentação do Elastic Stack](https://www.elastic.co/guide/index.html)
- [Documentação do Jaeger](https://www.jaegertracing.io/docs/)
