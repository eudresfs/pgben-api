# Schemas e Otimizações PostgreSQL

## 1\. Schemas Completos

[

dbdiagram.io

https://dbdiagram.io/d/681c9fd15b2fc4582fc252a8

](https://dbdiagram.io/d/681c9fd15b2fc4582fc252a8)

  

### 1.1 Usuários e Permissões

  

```sql
-- Tabela de usuários do sistema
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) UNIQUE,
  telefone VARCHAR(20),
  role ENUM('administrador', 'gestor_semtas', 'tecnico_semtas', 'tecnico_unidade') NOT NULL,
  unidade_id UUID REFERENCES unidade(id),
  setor_id UUID REFERENCES setor(id),
  status ENUM('ativo', 'inativo') DEFAULT 'ativo',
  primeiro_acesso BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP
);

-- Tabela de unidade de atendimento
CREATE TABLE unidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  sigla VARCHAR(50) NOT NULL,
  tipo ENUM('cras', 'creas', 'centro_pop', 'semtas', 'outro') NOT NULL,
  endereco VARCHAR(255) NOT NULL,
  bairro VARCHAR(100) NOT NULL,
  cidade VARCHAR(100) DEFAULT 'Natal',
  estado CHAR(2) DEFAULT 'RN',
  cep VARCHAR(10),
  telefone VARCHAR(20) NOT NULL,
  whatsapp VARCHAR(20),
  email VARCHAR(255),
  status ENUM('ativo', 'inativo') DEFAULT 'ativo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP
);

-- Tabela de setor organizacionais
CREATE TABLE setor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  status ENUM('ativo', 'inativo') DEFAULT 'ativo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP
);

-- Relacionamento N:M entre setor e unidade
CREATE TABLE setor_unidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id UUID NOT NULL REFERENCES setor(id),
  unidade_id UUID NOT NULL REFERENCES unidade(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(setor_id, unidade_id)
);
```

  

### 1.2 Cidadãos e Dados Sociais

  

```sql
-- Tabela de cidadãos (beneficiários/solicitantes)
CREATE TABLE cidadao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  nome_social VARCHAR(255),
  cpf VARCHAR(14) UNIQUE NOT NULL,
  rg VARCHAR(20),
  nis VARCHAR(14) UNIQUE,
  data_nascimento DATE NOT NULL,
  sexo ENUM('masculino', 'feminino') NOT NULL,
  nome_mae VARCHAR(255),
  naturalidade VARCHAR(255),
  endereco VARCHAR(255) NOT NULL,
  numero VARCHAR(10),
  complemento VARCHAR(100),
  bairro VARCHAR(100) NOT NULL,
  cidade VARCHAR(100) DEFAULT 'Natal',
  estado CHAR(2) DEFAULT 'RN',
  cep VARCHAR(10),
  telefone VARCHAR(20),
  email VARCHAR(255),
  parentesco ENUM('pai', 'mae', 'filho', 'filha', 'irmao', 'irma', 'avô', 'avó', 'outro'),
  pix_tipo ENUM('cpf', 'email', 'telefone', 'chave_aleatoria'),
  pix_chave VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP
);

-- Tabela de composição familiar
CREATE TABLE composicao_familiar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cidadao_id UUID NOT NULL REFERENCES cidadao(id),
  nome VARCHAR(255) NOT NULL,
  idade INTEGER,
  parentesco VARCHAR(50) NOT NULL,
  ocupacao VARCHAR(100),
  escolaridade ENUM('Infantil', 'Fundamental_Incompleto', 'Fundamental_Completo', 
                   'Medio_Incompleto', 'Medio_Completo', 'Superior_Incompleto', 
                   'Superior_Completo', 'Pos_Graduacao', 'Mestrado', 'Doutorado'),
  renda DECIMAL(10,2),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP
);

-- Tabela de situações de moradia
CREATE TABLE situacao_moradia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP
);

-- Tabela de dados sociais
CREATE TABLE dados_sociais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cidadao_id UUID NOT NULL REFERENCES cidadao(id),
  prontuario_suas VARCHAR(50),
  publico_prioritario BOOLEAN DEFAULT FALSE,
  recebe_beneficio BOOLEAN DEFAULT FALSE,
  tipo_beneficio ENUM('pbf', 'bpc', 'pcd'),
  valor_beneficio DECIMAL(10,2),
  possui_curso_profissionalizante BOOLEAN DEFAULT FALSE,
  curso_profissionalizante_possuido VARCHAR(255),
  interesse_curso_profissionalizante BOOLEAN DEFAULT FALSE,
  curso_profissionalizante_desejado VARCHAR(255),
  atividade_remunerada BOOLEAN DEFAULT FALSE,
  mercado_formal BOOLEAN DEFAULT FALSE,
  ocupacao VARCHAR(100),
  nome_conjuge VARCHAR(255),
  ocupacao_conjuge VARCHAR(100),
  atividade_remunerada_conjuge BOOLEAN DEFAULT FALSE,
  mercado_formal_conjuge BOOLEAN DEFAULT FALSE,
  familiar_apto_a_trabalho BOOLEAN DEFAULT FALSE,
  familiar_area_de_trabalho VARCHAR(100),
  situacao_moradia_id UUID REFERENCES situacao_moradia(id),
  escolaridade ENUM('Fundamental_Incompleto', 'Fundamental_Completo', 'Medio_Incompleto', 
                   'Medio_Completo', 'Superior_Incompleto', 'Superior_Completo'),
  tem_filhos BOOLEAN DEFAULT FALSE,
  quantidade_filhos INTEGER DEFAULT 0,
  numero_moradores INTEGER DEFAULT 1,
  renda_familiar DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP,
  UNIQUE(cidadao_id)
);
```

  

### 1.3 Benefícios e Requisitos

  

```sql
-- Tabela de tipos de benefício
CREATE TABLE tipos_beneficio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  base_legal TEXT,
  periodicidade ENUM('unico', 'mensal') NOT NULL,
  periodo_maximo INTEGER DEFAULT 6,
  permite_renovacao BOOLEAN DEFAULT FALSE,
  permite_prorrogacao BOOLEAN DEFAULT FALSE,
  valor DECIMAL(10,2),
  valor_maximo DECIMAL(10,2),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP
);

-- Tabela de requisitos documentais
CREATE TABLE requisito_documento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_beneficio_id UUID NOT NULL REFERENCES tipos_beneficio(id),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  fase ENUM('solicitacao', 'analise', 'liberacao') NOT NULL,
  obrigatorio BOOLEAN DEFAULT TRUE,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP
);

-- Tabela de fluxo de benefício
CREATE TABLE fluxo_beneficio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_beneficio_id UUID NOT NULL REFERENCES tipos_beneficio(id),
  setor_id UUID NOT NULL REFERENCES setor(id),
  ordem INTEGER NOT NULL,
  tipo_acao ENUM('cadastro', 'analise', 'aprovacao', 'liberacao') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP
);
```

  

### 1.4 Solicitações e Documentos

  

```sql
-- Tabela de solicitações
CREATE TABLE solicitacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo VARCHAR(20) UNIQUE NOT NULL,
  solicitante_id UUID NOT NULL REFERENCES cidadao(id),
  tipo_beneficio_id UUID NOT NULL REFERENCES tipos_beneficio(id),
  unidade_id UUID NOT NULL REFERENCES unidade(id),
  tecnico_id UUID NOT NULL REFERENCES users(id),
  tipo_solicitacao ENUM('novo', 'renovacao', 'prorrogacao') DEFAULT 'novo',
  quantidade_parcelas INTEGER DEFAULT 1,
  data_abertura TIMESTAMP NOT NULL,
  status ENUM('rascunho', 'aberta', 'em_analise', 'pendente', 'aprovada', 
             'liberada', 'concluida', 'cancelada') DEFAULT 'rascunho',
  origem ENUM('presencial', 'whatsapp') DEFAULT 'presencial',
  parecer_tecnico TEXT,
  parecer_semtas TEXT,
  aprovador_id UUID REFERENCES users(id),
  data_aprovacao TIMESTAMP,
  data_liberacao TIMESTAMP,
  liberador_id UUID REFERENCES users(id),
  destinatario_pagamento_id UUID REFERENCES cidadao(id),
  valor_pago DECIMAL(10,2),
  observacoes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP
);

-- Tabela de dados de benefícios
CREATE TABLE dados_beneficios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID NOT NULL REFERENCES solicitacao(id),
  tipo_beneficio ENUM('auxilio_natalidade', 'aluguel_social') NOT NULL,
  valor_solicitado DECIMAL(10,2),
  periodo_meses INTEGER,
  
  -- Auxílio Natalidade
  data_prevista_parto DATE,
  data_nascimento DATE,
  pre_natal BOOLEAN,
  psf_ubs BOOLEAN,
  gravidez_risco BOOLEAN,
  gravidez_gemelar BOOLEAN,
  possui_filhos BOOLEAN,
  
  -- Aluguel Social
  motivo ENUM('risco_habitacional', 'desalojamento', 'violencia_domestica', 'outro'),
  detalhes_motivo TEXT,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP,
  
  CONSTRAINT unique_solicitacao UNIQUE (solicitacao_id)
);

-- Tabela de pendências
CREATE TABLE pendencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID NOT NULL REFERENCES solicitacao(id),
  descricao TEXT NOT NULL,
  resolvida BOOLEAN DEFAULT FALSE,
  usuario_criacao_id UUID NOT NULL REFERENCES users(id),
  usuario_resolucao_id UUID REFERENCES users(id),
  data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_resolucao TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP
);

-- Tabela de documentos
CREATE TABLE documento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID NOT NULL REFERENCES solicitacao(id),
  nome_arquivo VARCHAR(255) NOT NULL,
  caminho_arquivo VARCHAR(500) NOT NULL,
  tamanho INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  data_upload TIMESTAMP NOT NULL,
  uploader_id UUID NOT NULL REFERENCES users(id),
  versao INTEGER DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP
);

-- TABELA REMOVIDA: documento_enviado
-- Funcionalidade consolidada na tabela 'documento'
-- Migração realizada em Dezembro 2024
/*
CREATE TABLE documento_enviado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID NOT NULL REFERENCES solicitacao(id),
  requisito_documento_id UUID NOT NULL REFERENCES requisito_documento(id),
  documento_id UUID NOT NULL REFERENCES documento(id),
  status ENUM('enviado', 'aprovado', 'rejeitado') DEFAULT 'enviado',
  verificador_id UUID REFERENCES users(id),
  data_verificacao TIMESTAMP,
  observacao TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP,
  
  CONSTRAINT uk_documento_requisito UNIQUE (solicitacao_id, requisito_documento_id)
);
*/
```

  

### 1.5 Histórico e Auditoria

  

```sql
-- Tabela de histórico de solicitação
CREATE TABLE historico_solicitacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID NOT NULL REFERENCES solicitacao(id),
  status_anterior ENUM('rascunho', 'aberta', 'em_analise', 'pendente', 'aprovada', 
                     'liberada', 'concluida', 'cancelada'),
  status_novo ENUM('rascunho', 'aberta', 'em_analise', 'pendente', 'aprovada', 
                  'liberada', 'concluida', 'cancelada') NOT NULL,
  usuario_id UUID NOT NULL REFERENCES users(id),
  data_alteracao TIMESTAMP NOT NULL,
  observacao TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de logs de auditoria
CREATE TABLE logs_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES users(id),
  acao ENUM('criar', 'ler', 'atualizar', 'deletar', 'login', 'logout') NOT NULL,
  entidade VARCHAR(255) NOT NULL,
  entidade_id UUID NOT NULL,
  dados_anteriores JSONB,
  dados_novos JSONB,
  ip VARCHAR(45) NOT NULL,
  user_agent VARCHAR(255),
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (timestamp);

-- Tabela de notificações
CREATE TABLE notificacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES users(id),
  tipo ENUM('aprovacao', 'pendencia', 'liberacao', 'renovacao') NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  conteudo TEXT NOT NULL,
  lida BOOLEAN DEFAULT FALSE,
  data_leitura TIMESTAMP,
  solicitacao_id UUID REFERENCES solicitacao(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de ocorrências
CREATE TABLE ocorrencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo VARCHAR(100) NOT NULL UNIQUE,
  processo VARCHAR(100) NOT NULL,
  cidadao_id UUID NOT NULL REFERENCES cidadao(id),
  unidade_id UUID NOT NULL REFERENCES unidade(id),
  user_id UUID NOT NULL REFERENCES users(id),
  situacao TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP
);

-- Tabela de motivos de demanda
CREATE TABLE demanda_motivo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP
);
```

  

## 2\. Constraints e Relacionamentos

  

### 2.1 Chaves Estrangeiras

  

As principais relações de chave estrangeira já foram definidas nos scripts acima. Abaixo está uma visão geral dos relacionamentos mais importantes:

  

```sql
-- Usuários e unidade/setor
ALTER TABLE users ADD CONSTRAINT fk_users_unidade FOREIGN KEY (unidade_id) REFERENCES unidade(id);
ALTER TABLE users ADD CONSTRAINT fk_users_setor FOREIGN KEY (setor_id) REFERENCES setor(id);

-- Relação N:M entre setor e unidade
ALTER TABLE setor_unidade ADD CONSTRAINT fk_setor_unidade_setor FOREIGN KEY (setor_id) REFERENCES setor(id);
ALTER TABLE setor_unidade ADD CONSTRAINT fk_setor_unidade_unidade FOREIGN KEY (unidade_id) REFERENCES unidade(id);

-- Dados Sociais e Cidadãos
ALTER TABLE dados_sociais ADD CONSTRAINT fk_dados_sociais_cidadao FOREIGN KEY (cidadao_id) REFERENCES cidadao(id);
ALTER TABLE dados_sociais ADD CONSTRAINT fk_dados_sociais_situacao_moradia FOREIGN KEY (situacao_moradia_id) REFERENCES situacao_moradia(id);

-- Composição Familiar
ALTER TABLE composicao_familiar ADD CONSTRAINT fk_composicao_familiar_cidadao FOREIGN KEY (cidadao_id) REFERENCES cidadao(id);

-- Requisitos de Documentos
ALTER TABLE requisito_documento ADD CONSTRAINT fk_requisito_documento_tipo_beneficio FOREIGN KEY (tipo_beneficio_id) REFERENCES tipos_beneficio(id);

-- Fluxo de Benefício
ALTER TABLE fluxo_beneficio ADD CONSTRAINT fk_fluxo_beneficio_tipo_beneficio FOREIGN KEY (tipo_beneficio_id) REFERENCES tipos_beneficio(id);
ALTER TABLE fluxo_beneficio ADD CONSTRAINT fk_fluxo_beneficio_setor FOREIGN KEY (setor_id) REFERENCES setor(id);

-- Solicitações
ALTER TABLE solicitacao ADD CONSTRAINT fk_solicitacao_solicitante FOREIGN KEY (solicitante_id) REFERENCES cidadao(id);
ALTER TABLE solicitacao ADD CONSTRAINT fk_solicitacao_tipo_beneficio FOREIGN KEY (tipo_beneficio_id) REFERENCES tipos_beneficio(id);
ALTER TABLE solicitacao ADD CONSTRAINT fk_solicitacao_unidade FOREIGN KEY (unidade_id) REFERENCES unidade(id);
ALTER TABLE solicitacao ADD CONSTRAINT fk_solicitacao_tecnico FOREIGN KEY (tecnico_id) REFERENCES users(id);
ALTER TABLE solicitacao ADD CONSTRAINT fk_solicitacao_aprovador FOREIGN KEY (aprovador_id) REFERENCES users(id);
ALTER TABLE solicitacao ADD CONSTRAINT fk_solicitacao_liberador FOREIGN KEY (liberador_id) REFERENCES users(id);
ALTER TABLE solicitacao ADD CONSTRAINT fk_solicitacao_destinatario FOREIGN KEY (destinatario_pagamento_id) REFERENCES cidadao(id);

-- Dados de Benefício
ALTER TABLE dados_beneficios ADD CONSTRAINT fk_dados_beneficios_solicitacao FOREIGN KEY (solicitacao_id) REFERENCES solicitacao(id);

-- Documentos
ALTER TABLE documento ADD CONSTRAINT fk_documento_solicitacao FOREIGN KEY (solicitacao_id) REFERENCES solicitacao(id);
ALTER TABLE documento ADD CONSTRAINT fk_documento_uploader FOREIGN KEY (uploader_id) REFERENCES users(id);

-- Documento Enviado
-- CONSTRAINTS REMOVIDAS: documento_enviado (tabela removida)
/*
ALTER TABLE documento_enviado ADD CONSTRAINT fk_documento_enviado_solicitacao FOREIGN KEY (solicitacao_id) REFERENCES solicitacao(id);
ALTER TABLE documento_enviado ADD CONSTRAINT fk_documento_enviado_requisito FOREIGN KEY (requisito_documento_id) REFERENCES requisito_documento(id);
ALTER TABLE documento_enviado ADD CONSTRAINT fk_documento_enviado_documento FOREIGN KEY (documento_id) REFERENCES documento(id);
ALTER TABLE documento_enviado ADD CONSTRAINT fk_documento_enviado_verificador FOREIGN KEY (verificador_id) REFERENCES users(id);
*/

-- Pendências
ALTER TABLE pendencia ADD CONSTRAINT fk_pendencia_solicitacao FOREIGN KEY (solicitacao_id) REFERENCES solicitacao(id);
ALTER TABLE pendencia ADD CONSTRAINT fk_pendencia_usuario_criacao FOREIGN KEY (usuario_criacao_id) REFERENCES users(id);
ALTER TABLE pendencia ADD CONSTRAINT fk_pendencia_usuario_resolucao FOREIGN KEY (usuario_resolucao_id) REFERENCES users(id);

-- Histórico
ALTER TABLE historico_solicitacao ADD CONSTRAINT fk_historico_solicitacao_solicitacao FOREIGN KEY (solicitacao_id) REFERENCES solicitacao(id);
ALTER TABLE historico_solicitacao ADD CONSTRAINT fk_historico_solicitacao_usuario FOREIGN KEY (usuario_id) REFERENCES users(id);

-- Notificações
ALTER TABLE notificacao ADD CONSTRAINT fk_notificacao_usuario FOREIGN KEY (usuario_id) REFERENCES users(id);
ALTER TABLE notificacao ADD CONSTRAINT fk_notificacao_solicitacao FOREIGN KEY (solicitacao_id) REFERENCES solicitacao(id);

-- Ocorrências
ALTER TABLE ocorrencia ADD CONSTRAINT fk_ocorrencia_cidadao FOREIGN KEY (cidadao_id) REFERENCES cidadao(id);
ALTER TABLE ocorrencia ADD CONSTRAINT fk_ocorrencia_unidade FOREIGN KEY (unidade_id) REFERENCES unidade(id);
ALTER TABLE ocorrencia ADD CONSTRAINT fk_ocorrencia_user FOREIGN KEY (user_id) REFERENCES users(id);
```

  

### 2.2 Constraints Adicionais

  

```sql
-- Garantir que email seja válido
ALTER TABLE users ADD CONSTRAINT check_email_valid CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$');

-- Garantir que CPF tenha formato válido
ALTER TABLE cidadao ADD CONSTRAINT check_cpf_format CHECK (cpf ~* '^\d{3}\.\d{3}\.\d{3}-\d{2}$' OR cpf ~* '^\d{11}$');

-- Garantir que data de liberação seja posterior à data de aprovação
ALTER TABLE solicitacao ADD CONSTRAINT check_data_liberacao 
  CHECK (data_liberacao IS NULL OR (data_aprovacao IS NOT NULL AND data_liberacao >= data_aprovacao));

-- Garantir que data de aprovação seja posterior à data de abertura
ALTER TABLE solicitacao ADD CONSTRAINT check_data_aprovacao 
  CHECK (data_aprovacao IS NULL OR data_aprovacao >= data_abertura);

-- Garantir que valor pago não exceda valor máximo do benefício
ALTER TABLE solicitacao ADD CONSTRAINT check_valor_pago 
  CHECK (valor_pago IS NULL OR (
    valor_pago <= (SELECT tb.valor_maximo FROM tipos_beneficio tb WHERE tb.id = tipo_beneficio_id)
  ));

-- Garantir que data prevista do parto ou data de nascimento seja informada para auxílio natalidade
ALTER TABLE dados_beneficios ADD CONSTRAINT check_data_natalidade 
  CHECK (tipo_beneficio != 'auxilio_natalidade' OR data_prevista_parto IS NOT NULL OR data_nascimento IS NOT NULL);

-- Garantir que motivo e valor sejam informados para aluguel social
ALTER TABLE dados_beneficios ADD CONSTRAINT check_dados_aluguel 
  CHECK (tipo_beneficio != 'aluguel_social' OR (motivo IS NOT NULL AND valor_solicitado IS NOT NULL));

-- Garantir que as chaves PIX sejam válidas conforme o tipo
ALTER TABLE cidadao ADD CONSTRAINT check_pix_chave 
  CHECK (
    (pix_tipo = 'cpf' AND pix_chave ~* '^\d{11}$') OR
    (pix_tipo = 'email' AND pix_chave ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$') OR
    (pix_tipo = 'telefone' AND pix_chave ~* '^\+\d{12,13}$') OR
    (pix_tipo = 'chave_aleatoria' AND pix_chave ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
  );
```

  

## 3\. Índices Recomendados

  

### 3.1 Índices Primários

  

Os índices para chaves primárias são criados automaticamente. Além desses, recomendamos os seguintes índices para otimizar consultas:

  

```sql
-- Índices para tabela users
CREATE INDEX idx_users_unidade ON users(unidade_id);
CREATE INDEX idx_users_setor ON users(setor_id);
CREATE INDEX idx_users_role_status ON users(role, status);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_cpf ON users(cpf);

-- Índices para tabela cidadao
CREATE INDEX idx_cidadaos_cpf ON cidadao(cpf);
CREATE INDEX idx_cidadaos_nis ON cidadao(nis);
CREATE INDEX idx_cidadaos_nome ON cidadao(nome);
CREATE INDEX idx_cidadaos_data_nascimento ON cidadao(data_nascimento);
CREATE INDEX idx_cidadaos_bairro ON cidadao(bairro);

-- Índices para tabela solicitacao
CREATE INDEX idx_solicitacao_solicitante ON solicitacao(solicitante_id);
CREATE INDEX idx_solicitacao_tipo_beneficio ON solicitacao(tipo_beneficio_id);
CREATE INDEX idx_solicitacao_unidade ON solicitacao(unidade_id);
CREATE INDEX idx_solicitacao_tecnico ON solicitacao(tecnico_id);
CREATE INDEX idx_solicitacao_status ON solicitacao(status);
CREATE INDEX idx_solicitacao_data_abertura ON solicitacao(data_abertura);
CREATE INDEX idx_solicitacao_protocolo ON solicitacao(protocolo);
CREATE INDEX idx_solicitacao_status_unidade ON solicitacao(status, unidade_id);
CREATE INDEX idx_solicitacao_status_tipo ON solicitacao(status, tipo_beneficio_id);

-- Índices para tabela dados_beneficios
CREATE INDEX idx_dados_beneficios_tipo ON dados_beneficios(tipo_beneficio);

-- Índice para tabela documento
CREATE INDEX idx_documento_solicitacao ON documento(solicitacao_id);
CREATE INDEX idx_documento_uploader ON documento(uploader_id);

-- ÍNDICES REMOVIDOS: documento_enviado (tabela removida)
/*
CREATE INDEX idx_documento_enviado_requisito ON documento_enviado(requisito_documento_id);
CREATE INDEX idx_documento_enviado_documento ON documento_enviado(documento_id);
CREATE INDEX idx_documento_enviado_status ON documento_enviado(status);
*/

-- Índice para tabela pendencia
CREATE INDEX idx_pendencia_solicitacao ON pendencia(solicitacao_id);
CREATE INDEX idx_pendencia_resolvida ON pendencia(resolvida);

-- Índice para tabela historico_solicitacao
CREATE INDEX idx_historico_solicitacao ON historico_solicitacao(solicitacao_id);
CREATE INDEX idx_historico_usuario ON historico_solicitacao(usuario_id);
CREATE INDEX idx_historico_data ON historico_solicitacao(data_alteracao);

-- Índice para tabela notificacao
CREATE INDEX idx_notificacao_usuario ON notificacao(usuario_id);
CREATE INDEX idx_notificacao_lida ON notificacao(lida);
CREATE INDEX idx_notificacao_solicitacao ON notificacao(solicitacao_id);

-- Índice para tabela logs_auditoria
CREATE INDEX idx_logs_usuario ON logs_auditoria(usuario_id);
CREATE INDEX idx_logs_acao ON logs_auditoria(acao);
CREATE INDEX idx_logs_entidade ON logs_auditoria(entidade, entidade_id);
CREATE INDEX idx_logs_timestamp ON logs_auditoria(timestamp);
```

  

### 3.2 Índices de Texto

  

Para pesquisas textuais eficientes, recomendamos:

  

```sql
-- Índice GIN para pesquisas por nome
CREATE INDEX idx_cidadaos_nome_gin ON cidadao USING gin(to_tsvector('portuguese', nome));
CREATE INDEX idx_cidadaos_nome_social_gin ON cidadao USING gin(to_tsvector('portuguese', nome_social));

-- Índices de pesquisa phonetic (fuzzy search)
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_cidadaos_nome_trgm ON cidadao USING gin(nome gin_trgm_ops);
CREATE INDEX idx_cidadaos_nome_social_trgm ON cidadao USING gin(nome_social gin_trgm_ops);
```

  

## 4\. Views para Relatórios e Dashboards

  

### 4.1 Visão de Solicitações por Status

  

```sql
CREATE OR REPLACE VIEW vw_solicitacoes_por_status AS
SELECT 
    u.nome AS unidade,
    tb.nome AS tipo_beneficio,
    s.status,
    COUNT(*) AS quantidade,
    DATE_TRUNC('month', s.created_at) AS mes
FROM 
    solicitacao s
    JOIN unidade u ON s.unidade_id = u.id
    JOIN tipos_beneficio tb ON s.tipo_beneficio_id = tb.id
WHERE 
    s.removed_at IS NULL
GROUP BY 
    u.nome, 
    tb.nome, 
    s.status, 
    DATE_TRUNC('month', s.created_at);
```

  

### 4.2 Visão de Tempo de Processamento

  

```sql
CREATE OR REPLACE VIEW vw_tempo_processamento AS
SELECT 
    tb.nome AS tipo_beneficio,
    AVG(EXTRACT(EPOCH FROM (s.data_aprovacao - s.data_abertura)) / 86400) AS dias_ate_aprovacao,
    AVG(EXTRACT(EPOCH FROM (s.data_liberacao - s.data_aprovacao)) / 86400) AS dias_ate_liberacao,
    AVG(EXTRACT(EPOCH FROM (s.data_liberacao - s.data_abertura)) / 86400) AS dias_total
FROM 
    solicitacao s
    JOIN tipos_beneficio tb ON s.tipo_beneficio_id = tb.id
WHERE 
    s.status IN ('concluida', 'liberada')
    AND s.data_aprovacao IS NOT NULL
    AND s.data_liberacao IS NOT NULL
    AND s.removed_at IS NULL
GROUP BY 
    tb.nome;
```

### 4.3 Visão de Benefícios por Unidade e Bairro

```sql
CREATE OR REPLACE VIEW vw_beneficios_por_bairro AS
SELECT 
    c.bairro,
    tb.nome AS tipo_beneficio,
    COUNT(*) AS quantidade,
    SUM(s.valor_pago) AS valor_total,
    DATE_TRUNC('month', s.data_liberacao) AS mes
FROM 
    solicitacao s
    JOIN cidadao c ON s.solicitante_id = c.id
    JOIN tipos_beneficio tb ON s.tipo_beneficio_id = tb.id
WHERE 
    s.status = 'liberada'
    AND s.data_liberacao IS NOT NULL
    AND s.removed_at IS NULL
GROUP BY 
    c.bairro,
    tb.nome,
    DATE_TRUNC('month', s.data_liberacao);
```

### 4.4 Visão de Documentos Pendentes

```sql
CREATE OR REPLACE VIEW vw_documentos_pendentes AS
SELECT 
    s.protocolo,
    c.nome AS solicitante,
    tb.nome AS tipo_beneficio,
    u.nome AS unidade,
    r.nome AS requisito_documento,
    s.status,
    s.data_abertura,
    CASE 
        WHEN de.id IS NULL THEN 'Não enviado'
        WHEN de.status = 'enviado' THEN 'Aguardando verificação'
        WHEN de.status = 'rejeitado' THEN 'Rejeitado'
        ELSE de.status::text
    END AS status_documento
FROM 
    solicitacao s
    JOIN cidadao c ON s.solicitante_id = c.id
    JOIN tipos_beneficio tb ON s.tipo_beneficio_id = tb.id
    JOIN unidade u ON s.unidade_id = u.id
    JOIN requisito_documento r ON r.tipo_beneficio_id = tb.id
    -- LEFT JOIN documento_enviado de ON de.solicitacao_id = s.id AND de.requisito_documento_id = r.id
    -- NOTA: Tabela documento_enviado foi removida. Usar JOIN direto com tabela 'documento'
    LEFT JOIN documento d ON d.solicitacao_id = s.id
WHERE 
    s.status IN ('aberta', 'em_analise', 'pendente')
    AND r.obrigatorio = TRUE
    AND (de.id IS NULL OR de.status = 'rejeitado')
    AND s.removed_at IS NULL;
```

### 4.5 Visão de Performance de Técnicos

```sql
CREATE OR REPLACE VIEW vw_performance_tecnicos AS
SELECT 
    u.nome AS tecnico,
    us.nome AS unidade,
    tb.nome AS tipo_beneficio,
    COUNT(*) AS total_solicitacoes,
    SUM(CASE WHEN s.status = 'aprovada' OR s.status = 'liberada' OR s.status = 'concluida' THEN 1 ELSE 0 END) AS aprovadas,
    SUM(CASE WHEN s.status = 'pendente' THEN 1 ELSE 0 END) AS pendentes,
    SUM(CASE WHEN s.status = 'cancelada' THEN 1 ELSE 0 END) AS canceladas,
    ROUND(AVG(EXTRACT(EPOCH FROM (s.data_aprovacao - s.data_abertura)) / 86400)) AS media_dias_aprovacao,
    DATE_TRUNC('month', s.created_at) AS mes
FROM 
    solicitacao s
    JOIN users u ON s.tecnico_id = u.id
    JOIN unidade us ON s.unidade_id = us.id
    JOIN tipos_beneficio tb ON s.tipo_beneficio_id = tb.id
WHERE 
    s.removed_at IS NULL
GROUP BY 
    u.nome,
    us.nome,
    tb.nome,
    DATE_TRUNC('month', s.created_at);
```

  

* * *

## 5\. Triggers e Funções

### 5.1 Função para Atualizar Timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar um trigger para cada tabela que tem o campo updated_at
CREATE TRIGGER trigger_update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_unidade_updated_at
BEFORE UPDATE ON unidade
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Repetir para todas as tabelas relevantes
```

### 5.2 Função para Registro de Histórico de Status

```sql
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO historico_solicitacao(
            solicitacao_id, 
            status_anterior, 
            status_novo, 
            usuario_id, 
            data_alteracao, 
            observacao,
            created_at
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            CURRENT_SETTING('app.current_user_id')::UUID,
            NOW(),
            NEW.observacoes,
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_status_change
AFTER UPDATE OF status ON solicitacao
FOR EACH ROW EXECUTE FUNCTION log_status_change();
```

### 5.3 Função para Geração de Protocolo

```sql
CREATE OR REPLACE FUNCTION generate_protocolo()
RETURNS TRIGGER AS $$
DECLARE
    ano_atual VARCHAR(4);
    contador INTEGER;
    novo_protocolo VARCHAR(20);
BEGIN
    ano_atual := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    -- Obter o maior contador do ano atual
    SELECT COALESCE(MAX(SUBSTRING(protocolo FROM 6 FOR 8)::INTEGER), 0)
    INTO contador
    FROM solicitacao
    WHERE protocolo LIKE ano_atual || '-%';
    
    -- Incrementar contador
    contador := contador + 1;
    
    -- Criar novo protocolo no formato AAAA-XXXXXXXX
    novo_protocolo := ano_atual || '-' || LPAD(contador::VARCHAR, 8, '0');
    
    -- Definir protocolo
    NEW.protocolo := novo_protocolo;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_protocolo
BEFORE INSERT ON solicitacao
FOR EACH ROW EXECUTE FUNCTION generate_protocolo();
```

### 5.4 Função para Auditoria

```sql
CREATE OR REPLACE FUNCTION audit_log()
RETURNS TRIGGER AS $$
DECLARE
    user_id UUID;
    ip VARCHAR(45);
    user_agent VARCHAR(255);
BEGIN
    -- Tentar obter o ID do usuário atual da variável de aplicação
    BEGIN
        user_id := CURRENT_SETTING('app.current_user_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        user_id := NULL;
    END;
    
    -- Tentar obter o IP e User-Agent das variáveis de aplicação
    BEGIN
        ip := CURRENT_SETTING('app.client_ip');
    EXCEPTION WHEN OTHERS THEN
        ip := '0.0.0.0';
    END;
    
    BEGIN
        user_agent := CURRENT_SETTING('app.user_agent');
    EXCEPTION WHEN OTHERS THEN
        user_agent := 'Unknown';
    END;
    
    -- Inserir log de auditoria
    IF TG_OP = 'INSERT' THEN
        INSERT INTO logs_auditoria(
            usuario_id, acao, entidade, entidade_id, 
            dados_anteriores, dados_novos, ip, user_agent, timestamp
        ) VALUES (
            user_id, 'criar', TG_TABLE_NAME, NEW.id,
            NULL, to_jsonb(NEW), ip, user_agent, NOW()
        );
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO logs_auditoria(
            usuario_id, acao, entidade, entidade_id, 
            dados_anteriores, dados_novos, ip, user_agent, timestamp
        ) VALUES (
            user_id, 'atualizar', TG_TABLE_NAME, NEW.id,
            to_jsonb(OLD), to_jsonb(NEW), ip, user_agent, NOW()
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO logs_auditoria(
            usuario_id, acao, entidade, entidade_id, 
            dados_anteriores, dados_novos, ip, user_agent, timestamp
        ) VALUES (
            user_id, 'deletar', TG_TABLE_NAME, OLD.id,
            to_jsonb(OLD), NULL, ip, user_agent, NOW()
        );
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Aplicar o trigger para tabelas críticas
CREATE TRIGGER trigger_audit_cidadaos
AFTER INSERT OR UPDATE OR DELETE ON cidadao
FOR EACH ROW EXECUTE FUNCTION audit_log();

CREATE TRIGGER trigger_audit_solicitacao
AFTER INSERT OR UPDATE OR DELETE ON solicitacao
FOR EACH ROW EXECUTE FUNCTION audit_log();

-- Repetir para outras tabelas críticas
```

### 5.5 Função para Notificações

```sql
CREATE OR REPLACE FUNCTION notify_status_change()
RETURNS TRIGGER AS $$
DECLARE
    titulo VARCHAR(255);
    conteudo TEXT;
    tipo_notificacao notificacao.tipo%TYPE;
    unidade_tecnico_id UUID;
BEGIN
    -- Determinar mensagem e destinatários com base no novo status
    IF NEW.status = 'pendente' AND OLD.status <> 'pendente' THEN
        -- Notificar técnico da unidade sobre pendência
        SELECT u.unidade_id INTO unidade_tecnico_id FROM users u WHERE u.id = NEW.tecnico_id;
        
        titulo := 'Solicitação pendente - Protocolo ' || NEW.protocolo;
        conteudo := 'A solicitação ' || NEW.protocolo || ' possui pendências que precisam ser resolvidas.';
        tipo_notificacao := 'pendencia';
        
        -- Inserir notificações para todos os técnicos da unidade
        INSERT INTO notificacao (
            usuario_id, tipo, titulo, conteudo, lida, solicitacao_id, created_at, updated_at
        )
        SELECT
            u.id, tipo_notificacao, titulo, conteudo, false, NEW.id, NOW(), NOW()
        FROM
            users u
        WHERE
            u.unidade_id = unidade_tecnico_id
            AND u.role = 'tecnico_unidade'
            AND u.status = 'ativo';
            
    ELSIF NEW.status = 'aprovada' AND OLD.status <> 'aprovada' THEN
        -- Notificar técnico da unidade sobre aprovação
        SELECT u.unidade_id INTO unidade_tecnico_id FROM users u WHERE u.id = NEW.tecnico_id;
        
        titulo := 'Solicitação aprovada - Protocolo ' || NEW.protocolo;
        conteudo := 'A solicitação ' || NEW.protocolo || ' foi aprovada e está pronta para liberação.';
        tipo_notificacao := 'aprovacao';
        
        -- Inserir notificações para todos os técnicos da unidade
        INSERT INTO notificacao (
            usuario_id, tipo, titulo, conteudo, lida, solicitacao_id, created_at, updated_at
        )
        SELECT
            u.id, tipo_notificacao, titulo, conteudo, false, NEW.id, NOW(), NOW()
        FROM
            users u
        WHERE
            u.unidade_id = unidade_tecnico_id
            AND u.role = 'tecnico_unidade'
            AND u.status = 'ativo';
            
    ELSIF NEW.status = 'liberada' AND OLD.status <> 'liberada' THEN
        -- Notificar gestores SEMTAS sobre liberação
        titulo := 'Solicitação liberada - Protocolo ' || NEW.protocolo;
        conteudo := 'A solicitação ' || NEW.protocolo || ' foi liberada para o beneficiário.';
        tipo_notificacao := 'liberacao';
        
        -- Inserir notificações para todos os gestores SEMTAS
        INSERT INTO notificacao (
            usuario_id, tipo, titulo, conteudo, lida, solicitacao_id, created_at, updated_at
        )
        SELECT
            u.id, tipo_notificacao, titulo, conteudo, false, NEW.id, NOW(), NOW()
        FROM
            users u
        WHERE
            u.role = 'gestor_semtas'
            AND u.status = 'ativo';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_status_change
AFTER UPDATE OF status ON solicitacao
FOR EACH ROW EXECUTE FUNCTION notify_status_change();
```

* * *

## 6\. Estratégias de Particionamento

### 6.1 Particionamento da Tabela de Logs de Auditoria

```sql
-- Criar partições mensais para a tabela logs_auditoria
CREATE TABLE logs_auditoria_y2025m01 PARTITION OF logs_auditoria
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
    
CREATE TABLE logs_auditoria_y2025m02 PARTITION OF logs_auditoria
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE logs_auditoria_y2025m03 PARTITION OF logs_auditoria
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

-- Continuar para os outros meses
```

### 6.2 Particionamento da Tabela de Histórico de Solicitações

```sql
-- Alterar a tabela historico_solicitacao para particionamento
CREATE TABLE historico_solicitacao_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitacao_id UUID NOT NULL,
    status_anterior ENUM('rascunho', 'aberta', 'em_analise', 'pendente', 'aprovada', 
                      'liberada', 'concluida', 'cancelada'),
    status_novo ENUM('rascunho', 'aberta', 'em_analise', 'pendente', 'aprovada', 
                   'liberada', 'concluida', 'cancelada') NOT NULL,
    usuario_id UUID NOT NULL,
    data_alteracao TIMESTAMP NOT NULL,
    observacao TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (data_alteracao);

-- Criar partições anuais para historico_solicitacao
CREATE TABLE historico_solicitacao_y2025 PARTITION OF historico_solicitacao_new
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
    
CREATE TABLE historico_solicitacao_y2026 PARTITION OF historico_solicitacao_new
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Migrar dados
INSERT INTO historico_solicitacao_new
SELECT * FROM historico_solicitacao;

-- Criar restrições e índices na nova tabela
ALTER TABLE historico_solicitacao_new 
    ADD CONSTRAINT fk_historico_solicitacao_new_solicitacao 
    FOREIGN KEY (solicitacao_id) REFERENCES solicitacao(id);
    
CREATE INDEX idx_historico_solicitacao_new_solicitacao 
    ON historico_solicitacao_new(solicitacao_id);
    
CREATE INDEX idx_historico_solicitacao_new_usuario 
    ON historico_solicitacao_new(usuario_id);
    
CREATE INDEX idx_historico_solicitacao_new_data 
    ON historico_solicitacao_new(data_alteracao);

-- Trocar as tabelas
DROP TABLE historico_solicitacao;
ALTER TABLE historico_solicitacao_new RENAME TO historico_solicitacao;
```

* * *

## 7\. Configurações de Performance

### 7.1 Parâmetros do PostgreSQL

```sql
-- Ajustar configurações do PostgreSQL para performance
ALTER SYSTEM SET shared_buffers = '2GB';                    -- 25% da RAM do servidor
ALTER SYSTEM SET work_mem = '32MB';                         -- Memória para operações de ordenação
ALTER SYSTEM SET maintenance_work_mem = '256MB';            -- Memória para manutenção
ALTER SYSTEM SET effective_cache_size = '6GB';              -- 75% da RAM do servidor
ALTER SYSTEM SET default_statistics_target = 100;           -- Estatísticas para o planejador
ALTER SYSTEM SET random_page_cost = 1.1;                   -- Para discos SSD
ALTER SYSTEM SET effective_io_concurrency = 200;            -- Para discos SSD
ALTER SYSTEM SET max_parallel_workers = 8;                  -- Paralelismo
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;       -- Paralelismo por operação
ALTER SYSTEM SET max_worker_processes = 16;                 -- Processos workers

-- Armazenamento TOAST para campos grandes
ALTER TABLE documento ALTER COLUMN caminho_arquivo SET STORAGE EXTENDED;
ALTER TABLE logs_auditoria ALTER COLUMN dados_anteriores SET STORAGE EXTERNAL;
ALTER TABLE logs_auditoria ALTER COLUMN dados_novos SET STORAGE EXTERNAL;

-- Reindexação automática
ALTER TABLE logs_auditoria SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE logs_auditoria SET (autovacuum_analyze_scale_factor = 0.025);
ALTER TABLE historico_solicitacao SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE historico_solicitacao SET (autovacuum_analyze_scale_factor = 0.025);
```

### 7.2 Configuração de WAL

```sql
-- Configuração de Write-Ahead Log (WAL) para performance e segurança
ALTER SYSTEM SET wal_level = 'replica';                    -- Nível de detalhe do WAL
ALTER SYSTEM SET wal_buffers = '16MB';                     -- Buffers para WAL
ALTER SYSTEM SET checkpoint_timeout = '15min';             -- Tempo entre checkpoints
ALTER SYSTEM SET max_wal_size = '2GB';                     -- Tamanho máximo do WAL
ALTER SYSTEM SET min_wal_size = '1GB';                     -- Tamanho mínimo do WAL
ALTER SYSTEM SET checkpoint_completion_target = 0.9;       -- Distribuição do checkpoint
ALTER SYSTEM SET archive_mode = 'on';                      -- Arquivamento de WAL
ALTER SYSTEM SET archive_command = 'cp %p /var/lib/postgresql/archive/%f'; -- Comando de arquivamento
```

* * *

## 8\. Estratégias de Backup e Recuperação

### 8.1 Backup Lógico

```bash
#!/bin/bash
# backup_logical.sh - Backup lógico do banco de dados

DB_NAME="semtas_beneficios"
DB_USER="postgres"
BACKUP_DIR="/var/backups/postgres"
DATE=$(date +%Y-%m-%d)
FILENAME="${BACKUP_DIR}/${DB_NAME}_${DATE}.sql"

# Criar diretório se não existir
mkdir -p ${BACKUP_DIR}

# Backup completo
pg_dump -U ${DB_USER} -Fc ${DB_NAME} > ${FILENAME}

# Compactar
gzip ${FILENAME}

# Manter somente backups dos últimos 30 dias
find ${BACKUP_DIR} -name "${DB_NAME}_*.sql.gz" -mtime +30 -delete
```

### 8.2 Backup Físico

```perl
#!/bin/bash
# backup_physical.sh - Backup físico contínuo do banco de dados

PGDATA="/var/lib/postgresql/data"
ARCHIVE_DIR="/var/lib/postgresql/archive"
BACKUP_DIR="/var/backups/postgres/basebackup"
DATE=$(date +%Y-%m-%d)

# Criar diretório se não existir
mkdir -p ${BACKUP_DIR}/${DATE}

# Base backup
pg_basebackup -D ${BACKUP_DIR}/${DATE} -Ft -z -P -U postgres

# Script para recuperação
cat > ${BACKUP_DIR}/${DATE}/recover.sh << EOF
#!/bin/bash
# Recuperar a partir deste backup

# Parar o PostgreSQL
systemctl stop postgresql

# Limpar o diretório de dados
rm -rf ${PGDATA}/*

# Descompactar os arquivos
tar -xzf ${BACKUP_DIR}/${DATE}/base.tar.gz -C ${PGDATA}
tar -xzf ${BACKUP_DIR}/${DATE}/pg_wal.tar.gz -C ${PGDATA}/pg_wal

# Configurar recovery.conf
cat > ${PGDATA}/recovery.conf << EOC
restore_command = 'cp ${ARCHIVE_DIR}/%f %p'
recovery_target_timeline = 'latest'
EOC

# Ajustar permissões
chown -R postgres:postgres ${PGDATA}
chmod 700 ${PGDATA}

# Iniciar o PostgreSQL
systemctl start postgresql
EOF

chmod +x ${BACKUP_DIR}/${DATE}/recover.sh

# Manter somente backups dos últimos 7 dias
find ${BACKUP_DIR} -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;
```

### 8.3 Arquivamento Contínuo

```sql
-- Configurar arquivamento contínuo no PostgreSQL
ALTER SYSTEM SET archive_mode = 'on';
ALTER SYSTEM SET archive_command = 'test ! -f /var/lib/postgresql/archive/%f && cp %p /var/lib/postgresql/archive/%f';
ALTER SYSTEM SET restore_command = 'cp /var/lib/postgresql/archive/%f %p';
```

### 8.4 Script de Limpeza do Arquivo WAL

```bash
#!/bin/bash
# cleanup_wal.sh - Limpeza de arquivos WAL antigos

ARCHIVE_DIR="/var/lib/postgresql/archive"
DAYS_TO_KEEP=30

# Remover arquivos WAL mais antigos que 30 dias
find ${ARCHIVE_DIR} -name "*.backup" -o -name "*.history" -mtime +${DAYS_TO_KEEP} -delete
find ${ARCHIVE_DIR} -name "*.gz" -mtime +${DAYS_TO_KEEP} -delete
```

* * *

  

Este documento fornece um guia completo para a configuração do banco de dados PostgreSQL para a Plataforma de Gestão de Benefícios (PGBen). Os esquemas, índices, funções e estratégias de particionamento foram projetados para garantir desempenho, segurança e escalabilidade, atendendo aos requisitos específicos do sistema.