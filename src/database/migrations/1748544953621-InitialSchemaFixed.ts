import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchemaFixed1748544953621 implements MigrationInterface {
    name = 'InitialSchemaFixed1748544953621'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
        await queryRunner.query(`CREATE TYPE "jwt_blacklist_token_type_enum" AS ENUM ('access', 'refresh');`);
        await queryRunner.query(`CREATE TYPE "unidade_tipo_enum" AS ENUM ('cras', 'creas', 'centro_pop', 'semtas', 'outro');`);
        await queryRunner.query(`CREATE TYPE "unidade_status_enum" AS ENUM ('ativo', 'inativo');`);
        await queryRunner.query(`CREATE TYPE "usuario_status_enum" AS ENUM ('ativo', 'inativo');`);
        await queryRunner.query(`CREATE TYPE "role_permissao_role_enum" AS ENUM ('admin', 'gestor', 'tecnico', 'coordenador', 'assistente_social', 'cidadao', 'auditor');`);
        await queryRunner.query(`CREATE TYPE "audit_logs_action_enum" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_RESET', 'PASSWORD_CHANGE', 'PERMISSION_DENIED', 'TOKEN_REFRESH', 'TOKEN_REVOKE', 'EXPORT_DATA', 'IMPORT_DATA', 'SYSTEM_CONFIG');`);
        await queryRunner.query(`CREATE TYPE "audit_logs_severity_enum" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');`);
        await queryRunner.query(`CREATE TYPE "composicao_familiar_escolaridade_enum" AS ENUM ('ANALFABETO', 'FUNDAMENTAL_INCOMPLETO', 'FUNDAMENTAL_COMPLETO', 'MEDIO_INCOMPLETO', 'MEDIO_COMPLETO', 'SUPERIOR_INCOMPLETO', 'SUPERIOR_COMPLETO', 'POS_GRADUACAO');`);
        await queryRunner.query(`CREATE TYPE "composicao_familiar_parentesco_enum" AS ENUM ('CONJUGE', 'FILHO', 'PAI', 'MAE', 'IRMAO', 'AVO', 'NETO', 'TIO', 'SOBRINHO', 'OUTRO');`);
        await queryRunner.query(`CREATE TYPE "papel_cidadao_tipo_papel_enum" AS ENUM ('beneficiario', 'requerente', 'representante_legal', 'membro_composicao');`);
        await queryRunner.query(`CREATE TYPE "cidadao_sexo_enum" AS ENUM ('MASCULINO', 'FEMININO', 'OUTRO');`);
        await queryRunner.query(`CREATE TYPE "dados_sociais_escolaridade_enum" AS ENUM ('ANALFABETO', 'FUNDAMENTAL_INCOMPLETO', 'FUNDAMENTAL_COMPLETO', 'MEDIO_INCOMPLETO', 'MEDIO_COMPLETO', 'SUPERIOR_INCOMPLETO', 'SUPERIOR_COMPLETO', 'POS_GRADUACAO');`);
        await queryRunner.query(`CREATE TYPE "dados_sociais_situacao_trabalho_enum" AS ENUM ('desempregado', 'empregado_formal', 'empregado_informal', 'autonomo', 'aposentado', 'pensionista', 'beneficiario_bpc', 'outro');`);
        await queryRunner.query(`CREATE TYPE "situacao_moradia_tipo_moradia_enum" AS ENUM ('propria', 'alugada', 'cedida', 'ocupacao', 'situacao_rua', 'abrigo', 'outro');`);
        await queryRunner.query(`CREATE TYPE "historico_conversao_papel_papel_anterior_enum" AS ENUM ('beneficiario', 'requerente', 'representante_legal', 'membro_composicao');`);
        await queryRunner.query(`CREATE TYPE "historico_conversao_papel_papel_novo_enum" AS ENUM ('beneficiario', 'requerente', 'representante_legal', 'membro_composicao');`);
        await queryRunner.query(`CREATE TYPE "requisitos_documento_tipo_documento_enum" AS ENUM ('rg', 'cpf', 'comprovante_residencia', 'comprovante_renda', 'certidao_nascimento', 'declaracao_medica', 'contrato_aluguel', 'outro');`);
        await queryRunner.query(`CREATE TYPE "documentos_tipo_enum" AS ENUM ('rg', 'cpf', 'comprovante_residencia', 'comprovante_renda', 'certidao_nascimento', 'declaracao_medica', 'contrato_aluguel', 'outro');`);
        await queryRunner.query(`CREATE TYPE "processo_judicial_status_enum" AS ENUM ('ABERTO', 'EM_ANDAMENTO', 'SUSPENSO', 'CONCLUIDO', 'ARQUIVADO');`);
        await queryRunner.query(`CREATE TYPE "determinacao_judicial_tipo_enum" AS ENUM ('CONCESSAO', 'SUSPENSAO', 'CANCELAMENTO', 'ALTERACAO', 'OUTRO');`);
        await queryRunner.query(`CREATE TYPE "solicitacao_status_enum" AS ENUM ('rascunho', 'pendente', 'em_analise', 'aguardando_documentos', 'aprovada', 'reprovada', 'liberada', 'cancelada', 'em_processamento', 'concluida', 'arquivada');`);
        await queryRunner.query(`CREATE TYPE "campos_dinamicos_beneficio_tipo_enum" AS ENUM ('string', 'number', 'boolean', 'date', 'array', 'object');`);
        await queryRunner.query(`CREATE TYPE "tipo_beneficio_periodicidade_enum" AS ENUM ('unico', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual');`);
        await queryRunner.query(`CREATE TYPE "especificacao_cesta_basica_tipo_entrega_enum" AS ENUM ('presencial', 'domiciliar', 'cartao_alimentacao');`);
        await queryRunner.query(`CREATE TYPE "especificacao_cesta_basica_periodicidade_enum" AS ENUM ('unica', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual');`);
        await queryRunner.query(`CREATE TYPE "especificacao_cesta_basica_periodicidade_cesta_enum" AS ENUM ('unica', 'mensal', 'bimestral', 'trimestral', 'semestral');`);
        await queryRunner.query(`CREATE TYPE "fluxo_beneficio_tipo_etapa_enum" AS ENUM ('abertura', 'analise_documentos', 'analise_tecnica', 'aprovacao', 'liberacao');`);
        await queryRunner.query(`CREATE TYPE "fluxo_beneficio_perfil_responsavel_enum" AS ENUM ('admin', 'gestor', 'tecnico', 'coordenador', 'assistente_social', 'cidadao', 'auditor');`);
        await queryRunner.query(`CREATE TYPE "dados_beneficios_tipo_beneficio_enum" AS ENUM ('auxilio_natalidade', 'auxilio_funeral', 'cesta_basica', 'aluguel_social', 'passagem', 'outro');`);
        await queryRunner.query(`CREATE TYPE "pendencias_status_enum" AS ENUM ('aberta', 'resolvida', 'cancelada');`);
        await queryRunner.query(`CREATE TYPE "notification_templates_canais_suportados_enum" AS ENUM ('email', 'in_app', 'sms', 'push');`);
        await queryRunner.query(`CREATE TYPE "notificacoes_sistema_status_enum" AS ENUM ('pendente', 'em_processamento', 'enviada', 'falha', 'cancelada', 'nao_lida', 'lida', 'arquivada');`);
        await queryRunner.query(`CREATE TYPE "demanda_motivos_tipo_enum" AS ENUM ('denuncia', 'reclamacao', 'sugestao', 'elogio', 'informacao', 'outro');`);
        await queryRunner.query(`CREATE TYPE "ocorrencia_status_enum" AS ENUM ('aberta', 'em_analise', 'resolvida', 'concluida', 'cancelada');`);
        await queryRunner.query(`CREATE TYPE "configuracao_integracao_tipo_enum" AS ENUM ('email', 'storage', 'sms', 'api_externa');`);
        await queryRunner.query(`CREATE TYPE "configuracao_parametro_tipo_enum" AS ENUM ('string', 'number', 'boolean', 'json', 'date');`);
        await queryRunner.query(`CREATE TYPE "configuracao_template_tipo_enum" AS ENUM ('email', 'notificacao', 'documento');`);
        await queryRunner.query(`CREATE TYPE "pagamento_status_enum" AS ENUM ('agendado', 'liberado', 'confirmado', 'cancelado');`);
        await queryRunner.query(`CREATE TYPE "pagamento_metodoPagamento_enum" AS ENUM ('pix', 'deposito', 'presencial', 'doc');`);
        await queryRunner.query(`CREATE TYPE "confirmacao_recebimento_metodoConfirmacao_enum" AS ENUM ('assinatura', 'digital', 'terceirizado');`);
        await queryRunner.query(`CREATE TYPE "metricas_seguranca_nivel_enum" AS ENUM ('info', 'aviso', 'critico', 'emergencia');`);
        await queryRunner.query(`CREATE TYPE "regras_alerta_nivel_enum" AS ENUM ('info', 'aviso', 'critico', 'emergencia');`);
        await queryRunner.query(`CREATE TYPE "metricas_tipo_enum" AS ENUM ('seguranca', 'lgpd', 'documento', 'sistema', 'banco_dados', 'http');`);
        await queryRunner.query(`CREATE TYPE "metricas_categoria_enum" AS ENUM ('contagem', 'duracao', 'tamanho', 'percentual', 'estado', 'erro');`);
        await queryRunner.query(`CREATE TYPE "alertas_metricas_nivel_enum" AS ENUM ('info', 'aviso', 'critico', 'emergencia');`);
        await queryRunner.query(`CREATE TYPE "configuracoes_notificacao_niveis_alerta_enum" AS ENUM ('info', 'aviso', 'critico', 'emergencia');`);
        await queryRunner.query(`CREATE TYPE "metrica_definicao_tipo_enum" AS ENUM ('contagem', 'soma', 'media', 'minimo', 'maximo', 'composta', 'percentil', 'cardinalidade', 'taxa_variacao');`);
        await queryRunner.query(`CREATE TYPE "metrica_definicao_categoria_enum" AS ENUM ('financeiro', 'operacional', 'desempenho', 'qualidade', 'usuario', 'beneficio', 'processamento', 'sistema');`);
        await queryRunner.query(`CREATE TYPE "metrica_definicao_granularidade_enum" AS ENUM ('minuto', 'hora', 'dia', 'semana', 'mes', 'trimestre', 'ano');`);
        await queryRunner.query(`CREATE TYPE "metrica_configuracao_tipo_agendamento_enum" AS ENUM ('intervalo', 'cron', 'evento', 'manual');`);
        await queryRunner.query(`CREATE TYPE "metrica_configuracao_estrategia_amostragem_enum" AS ENUM ('completa', 'aleatoria', 'sistematica', 'estratificada');`);
        await queryRunner.query(`CREATE TABLE "jwt_blacklist" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "jti" VARCHAR(255) NOT NULL,
    "usuario_id" UUID NOT NULL,
    "token_type" "jwt_blacklist_token_type_enum" NOT NULL DEFAULT 'access',
    "expires_at" TEXT NOT NULL,
    "reason" VARCHAR(100) NOT NULL,
    "client_ip" VARCHAR(45),
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL
);`);
        await queryRunner.query(`CREATE INDEX "IDX_8e34500df0db639fa951586676" ON "jwt_blacklist" ("jti");`);
        await queryRunner.query(`CREATE INDEX "IDX_ef28645667d5965ce79b307ac6" ON "jwt_blacklist" ("created_at");`);
        await queryRunner.query(`CREATE INDEX "IDX_06b923535c4764253c786d04d6" ON "jwt_blacklist" ("expires_at");`);
        await queryRunner.query(`CREATE INDEX "IDX_d7fae2264c0c24e3ccd0b66ccd" ON "jwt_blacklist" ("usuario_id");`);
        await queryRunner.query(`CREATE TABLE "refresh_tokens" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "usuario_id" UUID NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "expires_at" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TEXT,
    "revoked_by_ip" VARCHAR(45),
    "replaced_by_token" VARCHAR(500),
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL
);`);
        await queryRunner.query(`CREATE TABLE "setor" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nome" TEXT NOT NULL,
    "sigla" TEXT DEFAULT 'N/A',
    "descricao" TEXT,
    "unidade_id" UUID NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE INDEX "IDX_4095c1294fca5deaef67242e93" ON "setor" ("status");`);
        await queryRunner.query(`CREATE INDEX "IDX_b857a294dfc326b23926bce5ef" ON "setor" ("unidade_id");`);
        await queryRunner.query(`CREATE INDEX "IDX_0d9d3f7f072e028a5601e07a97" ON "setor" ("nome");`);
        await queryRunner.query(`CREATE TABLE "unidade" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nome" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "sigla" TEXT,
    "tipo" "unidade_tipo_enum" NOT NULL DEFAULT 'cras',
    "endereco" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "responsavel_matricula" TEXT,
    "status" "unidade_status_enum" NOT NULL DEFAULT 'ativo',
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE INDEX "IDX_d4597b9996d51d2d3afaa9140e" ON "unidade" ("status");`);
        await queryRunner.query(`CREATE INDEX "IDX_63e5fa185b2b1fd65721f9f5d8" ON "unidade" ("tipo");`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_0c2402a8569bba71cc1e311b65" ON "unidade" ("codigo");`);
        await queryRunner.query(`CREATE INDEX "IDX_a8bb7b4183a8038197be4f3e73" ON "unidade" ("nome");`);
        await queryRunner.query(`CREATE TABLE "role" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);`);
        await queryRunner.query(`CREATE TABLE "usuario" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "role_id" UUID,
    "unidade_id" UUID,
    "setor_id" UUID,
    "status" "usuario_status_enum" NOT NULL DEFAULT 'ativo',
    "primeiro_acesso" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE INDEX "IDX_df0630b069ecca09c829b53700" ON "usuario" ("status");`);
        await queryRunner.query(`CREATE INDEX "IDX_5ae226ebff39eb6d1b2ba12924" ON "usuario" ("role_id");`);
        await queryRunner.query(`CREATE INDEX "IDX_02daf63c89aa78a7a1b84b1cbe" ON "usuario" ("setor_id");`);
        await queryRunner.query(`CREATE INDEX "IDX_5a56517544da4275c479536072" ON "usuario" ("unidade_id");`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8907b27b6312769f5b846975ab" ON "usuario" ("matricula");`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_28cd8597e57c8197d4929a98e7" ON "usuario" ("cpf");`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2863682842e688ca198eb25c12" ON "usuario" ("email");`);
        await queryRunner.query(`CREATE TABLE "password_reset_tokens" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "token" VARCHAR(255) NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "usuario_id" UUID NOT NULL,
    "expires_at" TIMESTAMP NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP,
    "client_ip" VARCHAR(45),
    "user_agent" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP,
    "invalidation_reason" VARCHAR(50),
    "metadata" JSONB,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);`);
        await queryRunner.query(`CREATE INDEX "IDX_7c038e5a589b06cbe4320cc88b" ON "password_reset_tokens" ("expires_at");`);
        await queryRunner.query(`CREATE INDEX "IDX_2723bda24c4145021e54e269c2" ON "password_reset_tokens" ("usuario_id", "is_used");`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ab673f0e63eac966762155508e" ON "password_reset_tokens" ("token");`);
        await queryRunner.query(`CREATE TABLE "role_permissao" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "role" "role_permissao_role_enum" NOT NULL,
    "permissao_id" UUID NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE INDEX "IDX_f80fcdc74b632b76c8a8300698" ON "role_permissao" ("permissao_id");`);
        await queryRunner.query(`CREATE INDEX "IDX_3555f461e1a2314067993070e8" ON "role_permissao" ("role");`);
        await queryRunner.query(`CREATE TABLE "permissao" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE INDEX "IDX_63f232965c4f68044255ae83a9" ON "permissao" ("nome");`);
        await queryRunner.query(`CREATE INDEX "IDX_e3cf3fdcfb6d5b291e84bbaea8" ON "permissao" ("modulo");`);
        await queryRunner.query(`CREATE TABLE "grupo_permissao" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nome" VARCHAR(100) NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criado_por" UUID,
    "atualizado_por" UUID
);`);

        await queryRunner.query(`CREATE TABLE "mapeamento_grupo_permissao" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "permissao_id" UUID NOT NULL,
    "grupo_id" UUID NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criado_por" UUID
);`);
        await queryRunner.query(`CREATE TABLE "usuario_permissao" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "usuario_id" UUID NOT NULL,
    "permissao_id" UUID NOT NULL,
    "concedida" BOOLEAN NOT NULL DEFAULT true,
    "tipo_escopo" VARCHAR(20) NOT NULL DEFAULT 'GLOBAL',
    "escopo_id" UUID,
    "valido_ate" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criado_por" UUID,
    "atualizado_por" UUID
);`);
        await queryRunner.query(`CREATE TABLE "escopo_permissao" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "permissao_id" UUID NOT NULL,
    "tipo_escopo_padrao" VARCHAR(20) NOT NULL DEFAULT 'GLOBAL',
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criado_por" UUID,
    "atualizado_por" UUID
);`);

        await queryRunner.query(`CREATE TABLE "audit_logs" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "usuario_id" UUID,
    "action" "audit_logs_action_enum" NOT NULL,
    "resource_type" VARCHAR(100) NOT NULL,
    "resource_id" VARCHAR(255),
    "description" TEXT,
    "severity" "audit_logs_severity_enum" NOT NULL DEFAULT 'LOW',
    "client_ip" TEXT,
    "user_agent" VARCHAR(500),
    "session_id" VARCHAR(100),
    "request_method" VARCHAR(50),
    "request_url" VARCHAR(500),
    "response_status" INTEGER,
    "response_time_ms" INTEGER,
    "old_values" JSONB,
    "new_values" JSONB,
    "metadata" JSONB,
    "error_message" TEXT,
    "stack_trace" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);`);
        await queryRunner.query(`CREATE INDEX "IDX_d4e5a2ad76a3dfc8ac639068d4" ON "audit_logs" ("client_ip", "created_at");`);
        await queryRunner.query(`CREATE INDEX "IDX_3d04b6f2b05825501c1427f0d9" ON "audit_logs" ("resource_type", "resource_id");`);
        await queryRunner.query(`CREATE INDEX "IDX_c3f3be5f9937b5309b26c15f7f" ON "audit_logs" ("severity", "created_at");`);
        await queryRunner.query(`CREATE INDEX "IDX_99fca4a3a4a93c26a756c5aca5" ON "audit_logs" ("action", "created_at");`);
        await queryRunner.query(`CREATE INDEX "IDX_6adb17e9f4abd83df9e4f2fba1" ON "audit_logs" ("usuario_id", "created_at");`);
        await queryRunner.query(`CREATE TABLE "categoria_log" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nome" VARCHAR(100) NOT NULL,
    "descricao" TEXT,
    "cor" VARCHAR(7) NOT NULL DEFAULT '#CCCCCC',
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);`);
        await queryRunner.query(`CREATE TABLE "logs_auditoria" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tipo_operacao" VARCHAR(20) NOT NULL,
    "entidade_afetada" VARCHAR(100) NOT NULL,
    "entidade_id" VARCHAR(36),
    "dados_anteriores" JSONB,
    "dados_novos" JSONB,
    "usuario_id" TEXT,
    "descricao" VARCHAR(500),
    "ip_origem" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "dados_sensiveis_acessados" JSONB,
    "endpoint" VARCHAR(255),
    "metodo_http" VARCHAR(10),
    "data_hora" TEXT,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL
);`);
        await queryRunner.query(`CREATE INDEX "IDX_bd1b541500964e345f86694bef" ON "logs_auditoria" ("tipo_operacao", "created_at");`);
        await queryRunner.query(`CREATE INDEX "IDX_5d0b8d3a7c0d3b3334a19bdd5e" ON "logs_auditoria" ("entidade_afetada", "created_at");`);
        await queryRunner.query(`CREATE INDEX "IDX_2102aacc049d0ceadc98e67c4e" ON "logs_auditoria" ("usuario_id", "created_at");`);
        await queryRunner.query(`CREATE TABLE "setor_unidade" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "setor_id" UUID NOT NULL,
    "unidade_id" UUID NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);`);
        await queryRunner.query(`CREATE TABLE "composicao_familiar" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "cidadao_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "nis" TEXT,
    "idade" INTEGER NOT NULL,
    "ocupacao" TEXT NOT NULL,
    "escolaridade" "composicao_familiar_escolaridade_enum" NOT NULL,
    "parentesco" "composicao_familiar_parentesco_enum" NOT NULL DEFAULT 'OUTRO',
    "renda" DECIMAL(10, 2),
    "observacoes" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_4678b12c2b834c458b252733ff" ON "composicao_familiar" ("cidadao_id", "nome");`);
        await queryRunner.query(`CREATE TABLE "papel_cidadao" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "cidadao_id" UUID NOT NULL,
    "composicao_familiar_id" UUID,
    "tipo_papel" "papel_cidadao_tipo_papel_enum" NOT NULL,
    "metadados" JSONB,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_12c613386fe90593e8ce0cac59" ON "papel_cidadao" ("cidadao_id", "tipo_papel");`);
        await queryRunner.query(`CREATE TABLE "cidadao" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nome" TEXT NOT NULL,
    "nome_social" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "rg" TEXT NOT NULL,
    "nis" TEXT NOT NULL,
    "nome_mae" TEXT NOT NULL,
    "naturalidade" TEXT NOT NULL,
    "prontuario_suas" TEXT NOT NULL,
    "data_nascimento" DATE NOT NULL,
    "sexo" "cidadao_sexo_enum" NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "endereco" JSONB NOT NULL,
    "unidade_id" UUID NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE INDEX "IDX_859e5af984f5d9f57c3a641682" ON "cidadao" ("endereco");`);
        await queryRunner.query(`CREATE INDEX "idx_cidadao_nome_trgm" ON "cidadao" ("nome");`);
        await queryRunner.query(`CREATE INDEX "idx_cidadao_endereco_cidade" ON "cidadao" (("endereco"->>'cidade'));`);
        await queryRunner.query(`CREATE INDEX "idx_cidadao_endereco_bairro" ON "cidadao" (("endereco"->>'bairro'));`);
        await queryRunner.query(`CREATE INDEX "IDX_80ffc95cbb425a44b532fa13c9" ON "cidadao" ("unidade_id");`);
        await queryRunner.query(`CREATE INDEX "IDX_270382aed2d93f9e8e219d6556" ON "cidadao" ("created_at");`);
        await queryRunner.query(`CREATE INDEX "IDX_4645cf71e6c5578cf62f875e7c" ON "cidadao" ("telefone");`);
        await queryRunner.query(`CREATE INDEX "IDX_1d0e02cabec5b1eaf0b943dbf5" ON "cidadao" ("nome");`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_dcc6ac9afe54f5a0c88ee75446" ON "cidadao" ("nis");`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a78dc107708ca989c1ab256e02" ON "cidadao" ("cpf");`);
        await queryRunner.query(`CREATE TABLE "dados_sociais" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "cidadao_id" UUID NOT NULL,
    "escolaridade" "dados_sociais_escolaridade_enum" NOT NULL,
    "publico_prioritario" BOOLEAN,
    "renda" DECIMAL(10, 2),
    "ocupacao" TEXT,
    "recebe_pbf" BOOLEAN NOT NULL DEFAULT false,
    "valor_pbf" DECIMAL(10, 2),
    "recebe_bpc" BOOLEAN NOT NULL DEFAULT false,
    "tipo_bpc" TEXT,
    "valor_bpc" DECIMAL(10, 2),
    "curso_profissionalizante" TEXT,
    "interesse_curso_profissionalizante" BOOLEAN,
    "situacao_trabalho" "dados_sociais_situacao_trabalho_enum",
    "area_trabalho" TEXT,
    "familiar_apto_trabalho" BOOLEAN,
    "area_interesse_familiar" TEXT,
    "observacoes" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7883370d870f6998b58c40888e" ON "dados_sociais" ("cidadao_id");`);
        await queryRunner.query(`CREATE TABLE "situacao_moradia" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "cidadao_id" UUID NOT NULL,
    "tipo_moradia" "situacao_moradia_tipo_moradia_enum",
    "numero_comodos" TEXT,
    "valor_aluguel" DECIMAL(10, 2),
    "tempo_moradia" TEXT,
    "possui_banheiro" BOOLEAN,
    "possui_energia_eletrica" BOOLEAN,
    "possui_agua_encanada" BOOLEAN,
    "possui_coleta_lixo" BOOLEAN,
    "observacoes" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_79c329a5139ffcd20a38fd641a" ON "situacao_moradia" ("cidadao_id");`);
        await queryRunner.query(`CREATE TABLE "historico_conversao_papel" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "cidadao_id" UUID NOT NULL,
    "papel_anterior" "historico_conversao_papel_papel_anterior_enum" NOT NULL,
    "papel_novo" "historico_conversao_papel_papel_novo_enum" NOT NULL,
    "composicao_familiar_id" UUID,
    "usuario_id" UUID NOT NULL,
    "justificativa" TEXT NOT NULL,
    "notificacao_enviada" BOOLEAN NOT NULL DEFAULT false,
    "tecnico_notificado_id" UUID,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);`);
        await queryRunner.query(`CREATE INDEX "IDX_8d02b2dedb65806a31029c1963" ON "historico_conversao_papel" ("cidadao_id", "created_at");`);
        await queryRunner.query(`CREATE TABLE "regra_conflito_papel" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "papel_origem_id" UUID NOT NULL,
    "papel_destino_id" UUID NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID
);`);
        await queryRunner.query(`CREATE TABLE "requisitos_documento" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tipo_beneficio_id" UUID NOT NULL,
    "tipo_documento" "requisitos_documento_tipo_documento_enum" NOT NULL,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT true,
    "descricao" TEXT,
    "validacoes" JSONB,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_5614b2f577c7cefded0e4bf13b" ON "requisitos_documento" ("tipo_beneficio_id", "tipo_documento");`);
        await queryRunner.query(`CREATE TABLE "documentos" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "solicitacao_id" UUID NOT NULL,
    "tipo" "documentos_tipo_enum" NOT NULL,
    "nome_arquivo" TEXT NOT NULL,
    "nome_original" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "thumbnail" TEXT,
    "descricao" TEXT,
    "tamanho" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "data_upload" TIMESTAMP NOT NULL,
    "usuario_upload" TEXT NOT NULL,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "data_verificacao" TIMESTAMP,
    "usuario_verificacao" TEXT,
    "observacoes_verificacao" TEXT,
    "metadados" JSONB,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE INDEX "IDX_3bfbfff4ab942ab46ec78cc9e3" ON "documentos" ("verificado");`);
        await queryRunner.query(`CREATE INDEX "IDX_f5a1d483d8f9312eb1e512d2af" ON "documentos" ("data_upload");`);
        await queryRunner.query(`CREATE INDEX "IDX_b22ef8e71d5a27327f7974548b" ON "documentos" ("usuario_upload");`);
        await queryRunner.query(`CREATE INDEX "IDX_a135626285538e1567d3adba36" ON "documentos" ("solicitacao_id", "tipo");`);
        await queryRunner.query(`CREATE TABLE "historico_solicitacao" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "solicitacao_id" UUID NOT NULL,
    "status_anterior" TEXT NOT NULL,
    "status_atual" TEXT NOT NULL,
    "usuario_id" UUID NOT NULL,
    "observacao" TEXT,
    "dados_alterados" JSONB,
    "ip_usuario" VARCHAR(45),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);`);
        await queryRunner.query(`CREATE INDEX "IDX_918f391d9f3e55a53b1502e30b" ON "historico_solicitacao" ("solicitacao_id", "created_at");`);
        await queryRunner.query(`CREATE TABLE "processo_judicial" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "numero_processo" VARCHAR(50) NOT NULL,
    "vara_judicial" VARCHAR(255) NOT NULL,
    "comarca" VARCHAR(255) NOT NULL,
    "juiz" VARCHAR(255),
    "status" "processo_judicial_status_enum" NOT NULL DEFAULT 'ABERTO',
    "objeto" TEXT NOT NULL,
    "data_distribuicao" DATE NOT NULL,
    "data_conclusao" DATE,
    "observacao" TEXT,
    "cidadao_id" UUID,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID
);`);
        await queryRunner.query(`CREATE TABLE "determinacao_judicial" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "processo_judicial_id" UUID NOT NULL,
    "solicitacao_id" UUID,
    "cidadao_id" UUID,
    "numero_processo" VARCHAR(50) NOT NULL,
    "numero_determinacao" VARCHAR(255) NOT NULL,
    "tipo" "determinacao_judicial_tipo_enum" NOT NULL DEFAULT 'OUTRO',
    "orgao_judicial" VARCHAR(100),
    "comarca" VARCHAR(100),
    "juiz" VARCHAR(100),
    "descricao" TEXT NOT NULL,
    "data_determinacao" TEXT NOT NULL,
    "data_prazo" TEXT,
    "cumprida" BOOLEAN NOT NULL DEFAULT false,
    "data_cumprimento" TEXT,
    "observacao_cumprimento" TEXT,
    "documento_url" VARCHAR(255),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "usuario_id" UUID,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID
);`);
        await queryRunner.query(`CREATE INDEX "IDX_f3f25ae401d795ef9bce6479ad" ON "determinacao_judicial" ("numero_processo");`);
        await queryRunner.query(`CREATE INDEX "IDX_5fd5c6f18205c2832ef9775534" ON "determinacao_judicial" ("cidadao_id");`);
        await queryRunner.query(`CREATE INDEX "IDX_39e77fffefeb955e81a10e4bf1" ON "determinacao_judicial" ("solicitacao_id");`);
        await queryRunner.query(`CREATE INDEX "IDX_9653d429c481ebd35631a03255" ON "determinacao_judicial" ("processo_judicial_id");`);
        await queryRunner.query(`CREATE TABLE "solicitacao" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "protocolo" TEXT NOT NULL,
    "statusAnterior" TEXT NOT NULL,
    "usuarioAlteracao" TEXT NOT NULL,
    "observacaoAlteracao" TEXT NOT NULL,
    "ipUsuario" TEXT NOT NULL,
    "beneficiario_id" UUID NOT NULL,
    "tipo_beneficio_id" UUID NOT NULL,
    "unidade_id" UUID NOT NULL,
    "tecnico_id" UUID NOT NULL,
    "data_abertura" TIMESTAMP NOT NULL,
    "status" "solicitacao_status_enum" NOT NULL DEFAULT 'rascunho',
    "parecer_semtas" TEXT,
    "aprovador_id" UUID,
    "data_aprovacao" TIMESTAMP,
    "data_liberacao" TIMESTAMP,
    "liberador_id" UUID,
    "observacoes" TEXT,
    "dados_complementares" JSONB,
    "version" TEXT NOT NULL,
    "processo_judicial_id" UUID,
    "determinacao_judicial_id" UUID,
    "determinacao_judicial_flag" BOOLEAN NOT NULL DEFAULT false,
    "solicitacao_original_id" UUID,
    "renovacao_automatica" BOOLEAN NOT NULL DEFAULT false,
    "contador_renovacoes" INTEGER NOT NULL DEFAULT 0,
    "data_proxima_renovacao" TIMESTAMP,
    "dados_dinamicos" JSONB,
    "prazo_analise" TIMESTAMP,
    "prazo_documentos" TIMESTAMP,
    "prazo_processamento" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE INDEX "IDX_decb6f4f02bef1985afb9de824" ON "solicitacao" ("determinacao_judicial_id");`);
        await queryRunner.query(`CREATE INDEX "IDX_7de9716e7bf9aa8bfe3fe193d9" ON "solicitacao" ("processo_judicial_id");`);
        await queryRunner.query(`CREATE INDEX "IDX_bd8ea92071e65588f8648a96f5" ON "solicitacao" ("status");`);
        await queryRunner.query(`CREATE INDEX "IDX_88cebd57ae2cb9e98563390b44" ON "solicitacao" ("data_abertura", "status");`);
        await queryRunner.query(`CREATE INDEX "IDX_2747a04e73abb61ad4b79c5248" ON "solicitacao" ("status", "tipo_beneficio_id");`);
        await queryRunner.query(`CREATE INDEX "IDX_cbd28d0589d5b4b12a3826ecb2" ON "solicitacao" ("status", "unidade_id");`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_5dc7df7681656f0ba74bde89d3" ON "solicitacao" ("protocolo");`);
        await queryRunner.query(`CREATE TABLE "campos_dinamicos_beneficio" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tipo_beneficio_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "campos_dinamicos_beneficio_tipo_enum" NOT NULL,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT false,
    "descricao" TEXT,
    "validacoes" JSONB,
    "ordem" TEXT NOT NULL DEFAULT 1,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_45d57d728a7eaf0460aafadbc3" ON "campos_dinamicos_beneficio" ("tipo_beneficio_id", "nome");`);
        await queryRunner.query(`CREATE TABLE "tipo_beneficio" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "periodicidade" "tipo_beneficio_periodicidade_enum" NOT NULL DEFAULT 'unico',
    "valor" DECIMAL(10, 2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criterios_elegibilidade" JSONB,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_eeebd551e2fdb3e68d8abe747c" ON "tipo_beneficio" ("nome");`);
        await queryRunner.query(`CREATE TABLE "configuracao_renovacao" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tipo_beneficio_id" UUID NOT NULL,
    "renovacao_automatica" BOOLEAN NOT NULL DEFAULT false,
    "dias_antecedencia_renovacao" INTEGER NOT NULL DEFAULT 7,
    "numero_maximo_renovacoes" INTEGER,
    "requer_aprovacao_renovacao" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "usuario_id" UUID NOT NULL,
    "observacoes" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);`);
        await queryRunner.query(`CREATE INDEX "IDX_459f2c63cfff01126699900e4e" ON "configuracao_renovacao" ("tipo_beneficio_id");`);
        await queryRunner.query(`CREATE TABLE "especificacao_aluguel_social" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tipo_beneficio_id" UUID NOT NULL,
    "duracao_maxima_meses" INTEGER NOT NULL,
    "permite_prorrogacao" BOOLEAN NOT NULL DEFAULT false,
    "tempo_maximo_prorrogacao_meses" INTEGER,
    "valor_maximo" DECIMAL(10, 2) NOT NULL,
    "motivos_validos" TEXT NOT NULL,
    "requer_comprovante_aluguel" BOOLEAN NOT NULL DEFAULT true,
    "requer_vistoria" BOOLEAN NOT NULL DEFAULT false,
    "pago_diretamente_locador" BOOLEAN NOT NULL DEFAULT false,
    "percentual_maximo_renda" DECIMAL(10, 2),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_51dfaacd8461bea0fd2c741941" ON "especificacao_aluguel_social" ("tipo_beneficio_id");`);
        await queryRunner.query(`CREATE TABLE "especificacao_cesta_basica" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tipo_beneficio_id" UUID NOT NULL,
    "tipo_entrega" "especificacao_cesta_basica_tipo_entrega_enum" NOT NULL DEFAULT 'presencial',
    "periodicidade" "especificacao_cesta_basica_periodicidade_enum" NOT NULL DEFAULT 'unica',
    "periodicidade_cesta" "especificacao_cesta_basica_periodicidade_cesta_enum" NOT NULL DEFAULT 'unica',
    "quantidade_entregas" INTEGER NOT NULL DEFAULT 1,
    "exige_comprovante_residencia" BOOLEAN NOT NULL DEFAULT false,
    "exige_comprovacao_vulnerabilidade" BOOLEAN NOT NULL DEFAULT false,
    "permite_substituicao_itens" BOOLEAN NOT NULL DEFAULT false,
    "itens_obrigatorios" TEXT,
    "itens_opcionais" TEXT,
    "local_entrega" VARCHAR(255),
    "horario_entrega" VARCHAR(255),
    "exige_agendamento" BOOLEAN NOT NULL DEFAULT false,
    "requer_comprovante_renda" BOOLEAN NOT NULL DEFAULT true,
    "renda_maxima_per_capita" DECIMAL(10, 2),
    "quantidade_minima_dependentes" INTEGER,
    "prioriza_familias_com_criancas" BOOLEAN NOT NULL DEFAULT false,
    "prioriza_idosos" BOOLEAN NOT NULL DEFAULT false,
    "prioriza_pcd" BOOLEAN NOT NULL DEFAULT false,
    "valor_cesta" DECIMAL(10, 2),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8a8272603a6e783b87cbe6f39a" ON "especificacao_cesta_basica" ("tipo_beneficio_id");`);
        await queryRunner.query(`CREATE TABLE "especificacao_funeral" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tipo_beneficio_id" UUID NOT NULL,
    "prazo_maximo_apos_obito" INTEGER NOT NULL,
    "requer_certidao_obito" BOOLEAN NOT NULL DEFAULT true,
    "requer_comprovante_residencia" BOOLEAN NOT NULL DEFAULT false,
    "requer_comprovante_vinculo_familiar" BOOLEAN NOT NULL DEFAULT false,
    "requer_comprovante_despesas" BOOLEAN NOT NULL DEFAULT false,
    "permite_reembolso" BOOLEAN NOT NULL DEFAULT false,
    "valor_maximo_reembolso" DECIMAL(10, 2),
    "valor_fixo" DECIMAL(10, 2),
    "inclui_translado" BOOLEAN NOT NULL DEFAULT false,
    "inclui_isencao_taxas" BOOLEAN NOT NULL DEFAULT false,
    "limitado_ao_municipio" BOOLEAN NOT NULL DEFAULT true,
    "inclui_urna_funeraria" BOOLEAN NOT NULL DEFAULT true,
    "inclui_edredom_funebre" BOOLEAN NOT NULL DEFAULT true,
    "inclui_despesas_sepultamento" BOOLEAN NOT NULL DEFAULT true,
    "servico_sobreaviso" VARCHAR(255),
    "valor_maximo" DECIMAL(10, 2),
    "permite_cremacao" BOOLEAN NOT NULL DEFAULT true,
    "permite_sepultamento" BOOLEAN NOT NULL DEFAULT true,
    "documentos_necessarios" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_70062900aed393e99021dafa39" ON "especificacao_funeral" ("tipo_beneficio_id");`);
        await queryRunner.query(`CREATE TABLE "especificacao_natalidade" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tipo_beneficio_id" UUID NOT NULL,
    "tempo_gestacao_minimo" INTEGER,
    "prazo_maximo_apos_nascimento" INTEGER NOT NULL,
    "requer_pre_natal" BOOLEAN NOT NULL DEFAULT false,
    "requer_comprovante_residencia" BOOLEAN NOT NULL DEFAULT false,
    "numero_maximo_filhos" INTEGER,
    "valor_complementar" DECIMAL(10, 2),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2c21869318167ff370136e1e20" ON "especificacao_natalidade" ("tipo_beneficio_id");`);
        await queryRunner.query(`CREATE TABLE "fluxo_beneficio" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tipo_beneficio_id" UUID NOT NULL,
    "nome_etapa" TEXT NOT NULL,
    "tipo_etapa" "fluxo_beneficio_tipo_etapa_enum" NOT NULL,
    "ordem" TEXT NOT NULL,
    "perfil_responsavel" "fluxo_beneficio_perfil_responsavel_enum" NOT NULL,
    "setor_id" TEXT,
    "descricao" TEXT,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT true,
    "permite_retorno" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fdcd9333fee6a1b1cb6fd43ac0" ON "fluxo_beneficio" ("tipo_beneficio_id", "ordem");`);
        await queryRunner.query(`CREATE TABLE "versoes_schema_beneficio" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tipo_beneficio_id" UUID NOT NULL,
    "versao" TEXT NOT NULL,
    "schema" JSONB NOT NULL,
    "descricao_mudancas" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_707389f7bd340d8200a104d70b" ON "versoes_schema_beneficio" ("tipo_beneficio_id", "versao");`);
        await queryRunner.query(`CREATE TABLE "dados_beneficios" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "solicitacao_id" UUID NOT NULL,
    "tipo_beneficio" "dados_beneficios_tipo_beneficio_enum" NOT NULL DEFAULT 'auxilio_natalidade',
    "valor_solicitado" DECIMAL(10, 2),
    "periodo_meses" INTEGER,
    "data_prevista_parto" DATE,
    "data_nascimento" DATE,
    "pre_natal" BOOLEAN,
    "psf_ubs" BOOLEAN,
    "gravidez_risco" BOOLEAN,
    "gravidez_gemelar" BOOLEAN,
    "motivo" TEXT,
    "valor_aluguel" DECIMAL(10, 2),
    "endereco_aluguel" TEXT,
    "bairro_aluguel" VARCHAR(100),
    "cep_aluguel" VARCHAR(8),
    "nome_proprietario" VARCHAR(255),
    "cpf_proprietario" VARCHAR(11),
    "telefone_proprietario" VARCHAR(20),
    "banco_proprietario" VARCHAR(100),
    "agencia_proprietario" VARCHAR(10),
    "conta_proprietario" VARCHAR(20),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b644080d63183daaaa8989eae4" ON "dados_beneficios" ("solicitacao_id");`);
        await queryRunner.query(`CREATE TABLE "pendencias" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "solicitacao_id" UUID NOT NULL,
    "descricao" TEXT NOT NULL,
    "registrado_por_id" UUID NOT NULL,
    "status" "pendencias_status_enum" NOT NULL DEFAULT 'aberta',
    "resolvido_por_id" UUID,
    "data_resolucao" TIMESTAMP,
    "observacao_resolucao" TEXT,
    "prazo_resolucao" DATE,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE INDEX "IDX_81d2bbea84d4582d06ddfc6d03" ON "pendencias" ("solicitacao_id", "created_at");`);
        await queryRunner.query(`CREATE TABLE "documentos_enviados" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "documento_id" UUID NOT NULL,
    "nome_arquivo" TEXT NOT NULL,
    "caminho_arquivo" TEXT NOT NULL,
    "tamanho" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "data_envio" TIMESTAMP NOT NULL,
    "enviado_por_id" UUID NOT NULL,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "verificado_por_id" UUID,
    "data_verificacao" TIMESTAMP,
    "observacoes" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE INDEX "IDX_17685e8f599fe57053c9f928b2" ON "documentos_enviados" ("documento_id");`);
        await queryRunner.query(`CREATE TABLE "notification_templates" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nome" VARCHAR(100) NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "assunto" VARCHAR(150) NOT NULL,
    "template_conteudo" TEXT NOT NULL,
    "canais_suportados" "notification_templates_canais_suportados_enum" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP NOT NULL,
    "atualizado_em" TIMESTAMP NOT NULL
);`);
        await queryRunner.query(`CREATE TABLE "notificacoes_sistema" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "destinatario_id" TEXT NOT NULL,
    "template_id" UUID NOT NULL,
    "dados_contexto" JSONB NOT NULL,
    "status" "notificacoes_sistema_status_enum" NOT NULL DEFAULT 'pendente',
    "tentativas_entrega" JSONB,
    "dados_envio" JSONB,
    "ultima_tentativa" DATE,
    "tentativas_envio" TEXT NOT NULL DEFAULT 0,
    "proxima_tentativa" DATE,
    "numero_tentativas" TEXT NOT NULL DEFAULT 0,
    "data_entrega" DATE,
    "data_envio" DATE,
    "data_agendamento" DATE,
    "data_leitura" DATE,
    "criado_em" TIMESTAMP NOT NULL,
    "atualizado_em" TIMESTAMP NOT NULL
);`);
        await queryRunner.query(`CREATE INDEX "IDX_fb39a0eb48e68bf9e15a2f27dc" ON "notificacoes_sistema" ("status", "criado_em");`);
        await queryRunner.query(`CREATE INDEX "IDX_2a8be9a941bfa7f8f057b27dc1" ON "notificacoes_sistema" ("destinatario_id", "criado_em");`);
        await queryRunner.query(`CREATE TABLE "demanda_motivos" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tipo" "demanda_motivos_tipo_enum" NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_07b71a7ca343f40ac8394e34d9" ON "demanda_motivos" ("tipo", "nome");`);
        await queryRunner.query(`CREATE TABLE "ocorrencia" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tipo" TEXT NOT NULL,
    "cidadao_id" UUID,
    "solicitacao_id" UUID,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "registrado_por_id" UUID NOT NULL,
    "demanda_motivo_id" UUID,
    "status" "ocorrencia_status_enum" NOT NULL DEFAULT 'aberta',
    "responsavel_id" UUID,
    "parecer" TEXT,
    "data_resolucao" TIMESTAMP,
    "prioridade" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE INDEX "IDX_a5a61318966f91f30ce13146e4" ON "ocorrencia" ("status", "created_at");`);
        await queryRunner.query(`CREATE INDEX "IDX_c1441cccaa2df49048748bd844" ON "ocorrencia" ("cidadao_id", "created_at");`);
        await queryRunner.query(`CREATE TABLE "configuracao_integracao" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "codigo" VARCHAR(50) NOT NULL,
    "tipo" "configuracao_integracao_tipo_enum" NOT NULL,
    "nome" VARCHAR(200) NOT NULL,
    "descricao" VARCHAR(500),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "parametros" JSONB NOT NULL DEFAULT '{}',
    "credenciais" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID
);`);
        await queryRunner.query(`CREATE INDEX "idx_integracao_codigo" ON "configuracao_integracao" ("codigo");`);
        await queryRunner.query(`CREATE INDEX "idx_integracao_tipo" ON "configuracao_integracao" ("tipo");`);
        await queryRunner.query(`CREATE TABLE "configuracao_parametro" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "chave" VARCHAR(100) NOT NULL,
    "valor" TEXT NOT NULL,
    "tipo" "configuracao_parametro_tipo_enum" NOT NULL DEFAULT 'string',
    "descricao" VARCHAR(500) NOT NULL,
    "categoria" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID
);`);
        await queryRunner.query(`CREATE INDEX "idx_parametro_chave" ON "configuracao_parametro" ("chave");`);
        await queryRunner.query(`CREATE INDEX "idx_parametro_categoria" ON "configuracao_parametro" ("categoria");`);
        await queryRunner.query(`CREATE TABLE "configuracao_template" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "codigo" VARCHAR(100) NOT NULL,
    "nome" VARCHAR(200) NOT NULL,
    "tipo" "configuracao_template_tipo_enum" NOT NULL,
    "assunto" VARCHAR(200),
    "conteudo" TEXT NOT NULL,
    "variaveis" JSONB NOT NULL DEFAULT '[]',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID
);`);
        await queryRunner.query(`CREATE INDEX "idx_template_codigo" ON "configuracao_template" ("codigo");`);
        await queryRunner.query(`CREATE INDEX "idx_template_tipo" ON "configuracao_template" ("tipo");`);
        await queryRunner.query(`CREATE TABLE "configuracao_workflow_beneficio" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tipo_beneficio_id" UUID NOT NULL,
    "nome" VARCHAR(200) NOT NULL,
    "descricao" VARCHAR(500) NOT NULL,
    "etapas" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "sla_total" REAL NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID
);`);
        await queryRunner.query(`CREATE INDEX "idx_workflow_tipo_beneficio" ON "configuracao_workflow_beneficio" ("tipo_beneficio_id");`);
        await queryRunner.query(`CREATE TABLE "integrador_tokens" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "integrador_id" UUID NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "descricao" VARCHAR(500),
    "tokenHash" VARCHAR(64) NOT NULL,
    "escopos" TEXT,
    "dataExpiracao" TEXT,
    "revogado" BOOLEAN NOT NULL DEFAULT false,
    "dataRevogacao" TEXT,
    "motivoRevogacao" TEXT,
    "ultimoUso" TEXT,
    "dataCriacao" TEXT NOT NULL
);`);
        await queryRunner.query(`CREATE TABLE "integradores" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nome" TEXT NOT NULL,
    "descricao" VARCHAR(500),
    "responsavel" TEXT,
    "emailContato" TEXT,
    "telefoneContato" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "permissoesEscopo" TEXT,
    "ipPermitidos" TEXT,
    "ultimoAcesso" TEXT,
    "dataCriacao" TEXT NOT NULL,
    "dataAtualizacao" TEXT NOT NULL
);`);
        await queryRunner.query(`CREATE TABLE "tokens_revogados" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tokenHash" VARCHAR(64) NOT NULL,
    "integradorId" TEXT NOT NULL,
    "motivoRevogacao" TEXT,
    "dataExpiracao" TEXT,
    "dataCriacao" TEXT NOT NULL,
    "dataLimpeza" TEXT
);`);
        await queryRunner.query(`CREATE INDEX "IDX_f63299dcd135b4b8ece4fab4de" ON "tokens_revogados" ("tokenHash");`);
        await queryRunner.query(`CREATE INDEX "IDX_894528549ad89b4e5b89ff62bd" ON "tokens_revogados" ("dataLimpeza");`);
        await queryRunner.query(`CREATE TABLE "pagamento" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "solicitacao_id" UUID NOT NULL,
    "info_bancaria_id" TEXT,
    "valor" DECIMAL(10, 2) NOT NULL,
    "data_liberacao" TIMESTAMP NOT NULL,
    "status" "pagamento_status_enum" NOT NULL DEFAULT 'agendado',
    "metodo_pagamento" "pagamento_metodoPagamento_enum" NOT NULL,
    "liberado_por" UUID NOT NULL,
    "observacoes" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE TABLE "comprovante_pagamento" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "pagamento_id" UUID NOT NULL,
    "tipo_documento" TEXT NOT NULL,
    "nome_arquivo" TEXT NOT NULL,
    "caminho_arquivo" TEXT NOT NULL,
    "tamanho" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "data_upload" TIMESTAMP NOT NULL,
    "uploaded_por" TEXT NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);`);
        await queryRunner.query(`CREATE TABLE "confirmacao_recebimento" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "pagamento_id" UUID NOT NULL,
    "data_confirmacao" TIMESTAMP NOT NULL,
    "metodo_confirmacao" "confirmacao_recebimento_metodoConfirmacao_enum" NOT NULL,
    "confirmado_por" TEXT NOT NULL,
    "destinatario_id" TEXT,
    "observacoes" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);`);
        await queryRunner.query(`CREATE TABLE "registros_metricas" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "metrica_id" UUID NOT NULL,
    "valor" DECIMAL(15, 2) NOT NULL,
    "timestamp" TEXT NOT NULL,
    "detalhes" JSONB,
    "ip_origem" VARCHAR(45),
    "usuario_id" UUID,
    "endpoint" VARCHAR(255)
);`);
        await queryRunner.query(`CREATE INDEX "idx_registros_metricas_metrica_id" ON "registros_metricas" ("metrica_id");`);
        await queryRunner.query(`CREATE INDEX "idx_registros_metricas_timestamp" ON "registros_metricas" ("timestamp");`);
        await queryRunner.query(`CREATE INDEX "idx_registros_metricas_usuario_id" ON "registros_metricas" ("usuario_id");`);
        await queryRunner.query(`CREATE TABLE "metricas_seguranca" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tipo_evento" VARCHAR(100) NOT NULL,
    "timestamp" TIMESTAMP NOT NULL,
    "usuario_id" UUID,
    "perfil_usuario" VARCHAR(50),
    "ip_origem" VARCHAR(45),
    "user_agent" TEXT,
    "endpoint" VARCHAR(255),
    "dados_acessados" JSONB,
    "detalhes" JSONB,
    "nivel" "metricas_seguranca_nivel_enum" NOT NULL DEFAULT 'info'
);`);
        await queryRunner.query(`CREATE INDEX "idx_metricas_seguranca_tipo" ON "metricas_seguranca" ("tipo_evento");`);
        await queryRunner.query(`CREATE INDEX "idx_metricas_seguranca_timestamp" ON "metricas_seguranca" ("timestamp");`);
        await queryRunner.query(`CREATE INDEX "idx_metricas_seguranca_usuario" ON "metricas_seguranca" ("usuario_id");`);
        await queryRunner.query(`CREATE INDEX "idx_metricas_seguranca_ip" ON "metricas_seguranca" ("ip_origem");`);
        await queryRunner.query(`CREATE INDEX "idx_metricas_seguranca_nivel" ON "metricas_seguranca" ("nivel");`);
        await queryRunner.query(`CREATE TABLE "regras_alerta" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nome" VARCHAR(100) NOT NULL,
    "metrica_id" UUID NOT NULL,
    "nivel" "regras_alerta_nivel_enum" NOT NULL,
    "operador" VARCHAR(10) NOT NULL,
    "valor_limiar" DECIMAL(15, 2) NOT NULL,
    "mensagem_alerta" TEXT NOT NULL,
    "canais_notificacao" JSONB,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);`);
        await queryRunner.query(`CREATE INDEX "idx_regras_alerta_metrica" ON "regras_alerta" ("metrica_id");`);
        await queryRunner.query(`CREATE INDEX "idx_regras_alerta_nivel" ON "regras_alerta" ("nivel");`);
        await queryRunner.query(`CREATE INDEX "idx_regras_alerta_ativo" ON "regras_alerta" ("ativo");`);
        await queryRunner.query(`CREATE TABLE "metricas" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nome" VARCHAR(100) NOT NULL,
    "tipo" "metricas_tipo_enum" NOT NULL,
    "categoria" "metricas_categoria_enum" NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "unidade_medida" VARCHAR(50),
    "limiar_alerta" DECIMAL(15, 2),
    "limiar_critico" DECIMAL(15, 2),
    "tags" JSONB,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP
);`);
        await queryRunner.query(`CREATE TABLE "alertas_metricas" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "metrica_id" UUID NOT NULL,
    "timestamp" TIMESTAMP NOT NULL,
    "nivel" "alertas_metricas_nivel_enum" NOT NULL,
    "valor_atual" DECIMAL(15, 2) NOT NULL,
    "limiar_violado" DECIMAL(15, 2) NOT NULL,
    "mensagem" TEXT NOT NULL,
    "detalhes" JSONB,
    "resolvido" BOOLEAN NOT NULL DEFAULT false,
    "data_resolucao" TIMESTAMP,
    "notificacao_enviada" BOOLEAN NOT NULL DEFAULT false
);`);
        await queryRunner.query(`CREATE INDEX "idx_alertas_metricas_metrica" ON "alertas_metricas" ("metrica_id");`);
        await queryRunner.query(`CREATE INDEX "idx_alertas_metricas_timestamp" ON "alertas_metricas" ("timestamp");`);
        await queryRunner.query(`CREATE INDEX "idx_alertas_metricas_nivel" ON "alertas_metricas" ("nivel");`);
        await queryRunner.query(`CREATE INDEX "idx_alertas_metricas_resolvido" ON "alertas_metricas" ("resolvido");`);
        await queryRunner.query(`CREATE TABLE "configuracoes_notificacao" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tipo" VARCHAR(50) NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "configuracao" JSONB NOT NULL,
    "niveis_alerta" "configuracoes_notificacao_niveis_alerta_enum" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);`);
        await queryRunner.query(`CREATE TABLE "metrica_snapshot" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "definicao_id" UUID NOT NULL,
    "periodo_inicio" TIMESTAMP NOT NULL,
    "periodo_fim" TIMESTAMP NOT NULL,
    "granularidade" TEXT NOT NULL,
    "valor" DECIMAL(20, 6) NOT NULL,
    "valor_formatado" VARCHAR(100),
    "dimensoes" JSONB NOT NULL,
    "dimensoes_hash" VARCHAR(64) NOT NULL DEFAULT '',
    "metadados" JSONB,
    "validado" BOOLEAN NOT NULL DEFAULT true,
    "versao_definicao" TEXT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duracao_processamento_ms" TEXT NOT NULL DEFAULT 0,
    "status_coleta" VARCHAR(20) NOT NULL DEFAULT 'sucesso',
    "mensagem_status" TEXT
);`);
        await queryRunner.query(`CREATE INDEX "IDX_28017a1b71f1df9947eaeefc4f" ON "metrica_snapshot" ("periodo_inicio", "periodo_fim");`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9228627cb936ce9028373a14ad" ON "metrica_snapshot" ("definicao_id", "periodo_inicio", "periodo_fim", "dimensoes_hash");`);
        await queryRunner.query(`CREATE TABLE "metrica_definicao" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "codigo" VARCHAR(100) NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" "metrica_definicao_tipo_enum" NOT NULL DEFAULT 'contagem',
    "categoria" "metrica_definicao_categoria_enum" NOT NULL DEFAULT 'operacional',
    "unidade" VARCHAR(50),
    "prefixo" VARCHAR(10),
    "sufixo" VARCHAR(10),
    "casas_decimais" TEXT NOT NULL DEFAULT 2,
    "sql_consulta" TEXT,
    "formula_calculo" TEXT,
    "fonte_dados" VARCHAR(50) NOT NULL DEFAULT 'banco_dados',
    "agregacao_temporal" VARCHAR(20) NOT NULL DEFAULT 'soma',
    "granularidade" "metrica_definicao_granularidade_enum" NOT NULL DEFAULT 'dia',
    "metricas_dependentes" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "parametros_especificos" JSONB,
    "tags" TEXT,
    "versao" TEXT NOT NULL DEFAULT 1,
    "ultima_coleta" TIMESTAMP,
    "calculo_tempo_real" BOOLEAN NOT NULL DEFAULT false,
    "criado_por" VARCHAR(100),
    "atualizado_por" VARCHAR(100),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_269ed6729550ddf867490ed8bf" ON "metrica_definicao" ("codigo");`);
        await queryRunner.query(`CREATE TABLE "metrica_configuracao" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "metrica_id" UUID NOT NULL,
    "coleta_automatica" BOOLEAN NOT NULL DEFAULT true,
    "tipo_agendamento" "metrica_configuracao_tipo_agendamento_enum" NOT NULL DEFAULT 'intervalo',
    "intervalo_segundos" TEXT NOT NULL DEFAULT 86400,
    "expressao_cron" VARCHAR(100),
    "nome_evento" VARCHAR(100),
    "max_snapshots" TEXT NOT NULL DEFAULT 0,
    "periodo_retencao_dias" TEXT NOT NULL DEFAULT 365,
    "estrategia_amostragem" "metrica_configuracao_estrategia_amostragem_enum" NOT NULL DEFAULT 'completa',
    "tamanho_amostra" TEXT NOT NULL DEFAULT 0,
    "cacheamento_habilitado" BOOLEAN NOT NULL DEFAULT true,
    "cache_ttl" TEXT NOT NULL DEFAULT 300,
    "alertas" JSONB,
    "visualizacao" JSONB,
    "exibir_dashboard" BOOLEAN NOT NULL DEFAULT true,
    "prioridade_dashboard" TEXT NOT NULL DEFAULT 100,
    "criado_por" VARCHAR(100),
    "atualizado_por" VARCHAR(100),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);`);
        await queryRunner.query(`CREATE INDEX "IDX_c84d77e09e9396ec6c330624d7" ON "metrica_configuracao" ("metrica_id");`);
        await queryRunner.query(`CREATE TABLE "metricas_documentos" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "operacao" VARCHAR(50) NOT NULL,
    "timestamp" TIMESTAMP NOT NULL,
    "documento_id" UUID,
    "usuario_id" UUID,
    "tamanho_bytes" BIGINT,
    "duracao_ms" INTEGER,
    "status" VARCHAR(50),
    "detalhes" JSONB
);`);
        await queryRunner.query(`CREATE INDEX "idx_metricas_documentos_operacao" ON "metricas_documentos" ("operacao");`);
        await queryRunner.query(`CREATE INDEX "idx_metricas_documentos_timestamp" ON "metricas_documentos" ("timestamp");`);
        await queryRunner.query(`CREATE INDEX "idx_metricas_documentos_documento" ON "metricas_documentos" ("documento_id");`);
        await queryRunner.query(`CREATE INDEX "idx_metricas_documentos_usuario" ON "metricas_documentos" ("usuario_id");`);
        await queryRunner.query(`CREATE TABLE "metricas_http" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "timestamp" TIMESTAMP NOT NULL,
    "endpoint" VARCHAR(255) NOT NULL,
    "metodo" VARCHAR(10) NOT NULL,
    "codigo_status" INTEGER NOT NULL,
    "duracao_ms" INTEGER NOT NULL,
    "tamanho_resposta_bytes" INTEGER,
    "ip_origem" VARCHAR(45),
    "usuario_id" UUID,
    "perfil_usuario" VARCHAR(50),
    "user_agent" TEXT,
    "detalhes" JSONB
);`);
        await queryRunner.query(`CREATE INDEX "idx_metricas_http_timestamp" ON "metricas_http" ("timestamp");`);
        await queryRunner.query(`CREATE INDEX "idx_metricas_http_endpoint" ON "metricas_http" ("endpoint");`);
        await queryRunner.query(`CREATE INDEX "idx_metricas_http_status" ON "metricas_http" ("codigo_status");`);
        await queryRunner.query(`CREATE INDEX "idx_metricas_http_usuario" ON "metricas_http" ("usuario_id");`);
        await queryRunner.query(`CREATE TABLE "metricas_sistema" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "timestamp" TIMESTAMP NOT NULL,
    "servidor" VARCHAR(100) NOT NULL,
    "uso_cpu_percentual" DECIMAL(5, 2),
    "uso_memoria_mb" INTEGER,
    "memoria_total_mb" INTEGER,
    "uso_disco_percentual" DECIMAL(5, 2),
    "carga_sistema" DECIMAL(5, 2),
    "detalhes" JSONB
);`);
        await queryRunner.query(`CREATE INDEX "idx_metricas_sistema_timestamp" ON "metricas_sistema" ("timestamp");`);
        await queryRunner.query(`CREATE INDEX "idx_metricas_sistema_servidor" ON "metricas_sistema" ("servidor");`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_c8349fdadc1bc791125bdd8c855" FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id");`);
        await queryRunner.query(`ALTER TABLE "setor" ADD CONSTRAINT "FK_b857a294dfc326b23926bce5ef5" FOREIGN KEY ("unidade_id") REFERENCES "unidade" ("id");`);
        await queryRunner.query(`ALTER TABLE "usuario" ADD CONSTRAINT "FK_5ae226ebff39eb6d1b2ba129248" FOREIGN KEY ("role_id") REFERENCES "role" ("id");`);
        await queryRunner.query(`ALTER TABLE "usuario" ADD CONSTRAINT "FK_5a56517544da4275c4795360727" FOREIGN KEY ("unidade_id") REFERENCES "unidade" ("id");`);
        await queryRunner.query(`ALTER TABLE "usuario" ADD CONSTRAINT "FK_02daf63c89aa78a7a1b84b1cbe3" FOREIGN KEY ("setor_id") REFERENCES "setor" ("id");`);
        await queryRunner.query(`ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "FK_115e409c8f4f906792458ca4e81" FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id");`);
        await queryRunner.query(`ALTER TABLE "role_permissao" ADD CONSTRAINT "FK_f80fcdc74b632b76c8a8300698f" FOREIGN KEY ("permissao_id") REFERENCES "permissao" ("id");`);
        await queryRunner.query(`ALTER TABLE "grupo_permissao" ADD CONSTRAINT "FK_a601413e4c78b796cda1309659c" FOREIGN KEY ("criado_por") REFERENCES "usuario" ("id");`);
        await queryRunner.query(`ALTER TABLE "grupo_permissao" ADD CONSTRAINT "FK_ef0915006ff0a06da353b555cc0" FOREIGN KEY ("atualizado_por") REFERENCES "usuario" ("id");`);
        await queryRunner.query(`ALTER TABLE "mapeamento_grupo_permissao" ADD CONSTRAINT "FK_36146aad01a79190a91d3f4e12a" FOREIGN KEY ("permissao_id") REFERENCES "permissao" ("id");`);
        await queryRunner.query(`ALTER TABLE "mapeamento_grupo_permissao" ADD CONSTRAINT "FK_409e0adcb54e6038446c3b63ef3" FOREIGN KEY ("grupo_id") REFERENCES "grupo_permissao" ("id");`);
        await queryRunner.query(`ALTER TABLE "mapeamento_grupo_permissao" ADD CONSTRAINT "FK_d260ae081916aaae470f8d6b9b2" FOREIGN KEY ("criado_por") REFERENCES "usuario" ("id");`);
        await queryRunner.query(`ALTER TABLE "usuario_permissao" ADD CONSTRAINT "FK_68ec4c570a03cc718131614d2d1" FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id");`);
        await queryRunner.query(`ALTER TABLE "usuario_permissao" ADD CONSTRAINT "FK_78fae70343b9b13b249b59a5873" FOREIGN KEY ("permissao_id") REFERENCES "permissao" ("id");`);
        await queryRunner.query(`ALTER TABLE "usuario_permissao" ADD CONSTRAINT "FK_853318b046ef9d17ed87702e297" FOREIGN KEY ("criado_por") REFERENCES "usuario" ("id");`);
        await queryRunner.query(`ALTER TABLE "usuario_permissao" ADD CONSTRAINT "FK_06d3a75c4cd1863970f1a9fa68d" FOREIGN KEY ("atualizado_por") REFERENCES "usuario" ("id");`);
        await queryRunner.query(`ALTER TABLE "escopo_permissao" ADD CONSTRAINT "FK_2214b692e096b210cd3526e8c0d" FOREIGN KEY ("permissao_id") REFERENCES "permissao" ("id");`);
        await queryRunner.query(`ALTER TABLE "escopo_permissao" ADD CONSTRAINT "FK_02ee05dae4bb92316c70c93feeb" FOREIGN KEY ("criado_por") REFERENCES "usuario" ("id");`);
        await queryRunner.query(`ALTER TABLE "escopo_permissao" ADD CONSTRAINT "FK_096e066bd57fc589e95e62abf54" FOREIGN KEY ("atualizado_por") REFERENCES "usuario" ("id");`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_76adac46b6075b2a28f1a7d1008" FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id");`);
        await queryRunner.query(`ALTER TABLE "setor_unidade" ADD CONSTRAINT "FK_ab40ea1ab5d1af76feea1751c28" FOREIGN KEY ("setor_id") REFERENCES "setor" ("id");`);
        await queryRunner.query(`ALTER TABLE "setor_unidade" ADD CONSTRAINT "FK_821e6cbd16d8f4b0e9cf975e13f" FOREIGN KEY ("unidade_id") REFERENCES "unidade" ("id");`);
        await queryRunner.query(`ALTER TABLE "composicao_familiar" ADD CONSTRAINT "FK_9a106182b82bae44c35cd819eb4" FOREIGN KEY ("cidadao_id") REFERENCES "cidadao" ("id");`);
        await queryRunner.query(`ALTER TABLE "papel_cidadao" ADD CONSTRAINT "FK_bd0781234e1cb13fb0f6021e48e" FOREIGN KEY ("cidadao_id") REFERENCES "cidadao" ("id");`);
        await queryRunner.query(`ALTER TABLE "papel_cidadao" ADD CONSTRAINT "FK_d8b7a395cb19d412d7b55c3fc48" FOREIGN KEY ("composicao_familiar_id") REFERENCES "composicao_familiar" ("id");`);
        await queryRunner.query(`ALTER TABLE "cidadao" ADD CONSTRAINT "FK_80ffc95cbb425a44b532fa13c9d" FOREIGN KEY ("unidade_id") REFERENCES "unidade" ("id");`);
        await queryRunner.query(`ALTER TABLE "dados_sociais" ADD CONSTRAINT "FK_7883370d870f6998b58c40888e4" FOREIGN KEY ("cidadao_id") REFERENCES "cidadao" ("id");`);
        await queryRunner.query(`ALTER TABLE "situacao_moradia" ADD CONSTRAINT "FK_79c329a5139ffcd20a38fd641ac" FOREIGN KEY ("cidadao_id") REFERENCES "cidadao" ("id");`);
        await queryRunner.query(`ALTER TABLE "historico_conversao_papel" ADD CONSTRAINT "FK_48a0a9971eb22fca7a0a61ac0e8" FOREIGN KEY ("cidadao_id") REFERENCES "cidadao" ("id");`);
        await queryRunner.query(`ALTER TABLE "regra_conflito_papel" ADD CONSTRAINT "FK_020bb9936a252d157336c13e86d" FOREIGN KEY ("papel_origem_id") REFERENCES "papel_cidadao" ("id");`);
        await queryRunner.query(`ALTER TABLE "regra_conflito_papel" ADD CONSTRAINT "FK_45e52a9f35536ae8be83205aa61" FOREIGN KEY ("papel_destino_id") REFERENCES "papel_cidadao" ("id");`);
        await queryRunner.query(`ALTER TABLE "requisitos_documento" ADD CONSTRAINT "FK_4470b95c81be5031312b7afc810" FOREIGN KEY ("tipo_beneficio_id") REFERENCES "tipo_beneficio" ("id");`);
        await queryRunner.query(`ALTER TABLE "documentos" ADD CONSTRAINT "FK_ea502e97b961cf420d08b44ac1e" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao" ("id");`);
        await queryRunner.query(`ALTER TABLE "historico_solicitacao" ADD CONSTRAINT "FK_999dc202160c9fee059158b1947" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao" ("id");`);
        await queryRunner.query(`ALTER TABLE "historico_solicitacao" ADD CONSTRAINT "FK_8f4d51b23050f7e446eab891ab4" FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id");`);
        await queryRunner.query(`ALTER TABLE "determinacao_judicial" ADD CONSTRAINT "FK_9653d429c481ebd35631a03255f" FOREIGN KEY ("processo_judicial_id") REFERENCES "processo_judicial" ("id");`);
        await queryRunner.query(`ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_68bb5274b8f615a371a6586da93" FOREIGN KEY ("beneficiario_id") REFERENCES "cidadao" ("id");`);
        await queryRunner.query(`ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_eb9aef15fbc52d46e35b5f1d9d8" FOREIGN KEY ("tipo_beneficio_id") REFERENCES "tipo_beneficio" ("id");`);
        await queryRunner.query(`ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_c6827516b5d297a09bd021922d4" FOREIGN KEY ("unidade_id") REFERENCES "unidade" ("id");`);
        await queryRunner.query(`ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_d3c6c57eca180d1e5c1cd8ea92c" FOREIGN KEY ("tecnico_id") REFERENCES "usuario" ("id");`);
        await queryRunner.query(`ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_3a0de86d61ee1e8fd7b8a3b4009" FOREIGN KEY ("aprovador_id") REFERENCES "usuario" ("id");`);
        await queryRunner.query(`ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_135fcc73739b564d3bd3b236a1c" FOREIGN KEY ("liberador_id") REFERENCES "usuario" ("id");`);
        await queryRunner.query(`ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_b9cab9c575ece58f6852cc9a41a" FOREIGN KEY ("processo_judicial_id") REFERENCES "processo_judicial" ("id");`);
        await queryRunner.query(`ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_d5a488ef197835d8268367bebed" FOREIGN KEY ("determinacao_judicial_id") REFERENCES "determinacao_judicial" ("id");`);
        await queryRunner.query(`ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_060381b19971dd3ec8d2a9e98fa" FOREIGN KEY ("solicitacao_original_id") REFERENCES "solicitacao" ("id");`);
        await queryRunner.query(`ALTER TABLE "campos_dinamicos_beneficio" ADD CONSTRAINT "FK_dfdf0ac2ad34a7e134bf5680907" FOREIGN KEY ("tipo_beneficio_id") REFERENCES "tipo_beneficio" ("id");`);
        await queryRunner.query(`ALTER TABLE "configuracao_renovacao" ADD CONSTRAINT "FK_459f2c63cfff01126699900e4e1" FOREIGN KEY ("tipo_beneficio_id") REFERENCES "tipo_beneficio" ("id");`);
        await queryRunner.query(`ALTER TABLE "especificacao_aluguel_social" ADD CONSTRAINT "FK_51dfaacd8461bea0fd2c7419416" FOREIGN KEY ("tipo_beneficio_id") REFERENCES "tipo_beneficio" ("id");`);
        await queryRunner.query(`ALTER TABLE "especificacao_cesta_basica" ADD CONSTRAINT "FK_8a8272603a6e783b87cbe6f39a4" FOREIGN KEY ("tipo_beneficio_id") REFERENCES "tipo_beneficio" ("id");`);
        await queryRunner.query(`ALTER TABLE "especificacao_funeral" ADD CONSTRAINT "FK_70062900aed393e99021dafa39d" FOREIGN KEY ("tipo_beneficio_id") REFERENCES "tipo_beneficio" ("id");`);
        await queryRunner.query(`ALTER TABLE "especificacao_natalidade" ADD CONSTRAINT "FK_2c21869318167ff370136e1e206" FOREIGN KEY ("tipo_beneficio_id") REFERENCES "tipo_beneficio" ("id");`);
        await queryRunner.query(`ALTER TABLE "fluxo_beneficio" ADD CONSTRAINT "FK_ad1468d20c1d84bbf1f4c0da1a7" FOREIGN KEY ("tipo_beneficio_id") REFERENCES "tipo_beneficio" ("id");`);
        await queryRunner.query(`ALTER TABLE "versoes_schema_beneficio" ADD CONSTRAINT "FK_5c1042d45f2ad478ffec777aa8c" FOREIGN KEY ("tipo_beneficio_id") REFERENCES "tipo_beneficio" ("id");`);
        await queryRunner.query(`ALTER TABLE "dados_beneficios" ADD CONSTRAINT "FK_b644080d63183daaaa8989eae42" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao" ("id");`);
        await queryRunner.query(`ALTER TABLE "pendencias" ADD CONSTRAINT "FK_cabd3034b48d1276780fd92f319" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao" ("id");`);
        await queryRunner.query(`ALTER TABLE "pendencias" ADD CONSTRAINT "FK_eee52af29453eeec81f0b1101c6" FOREIGN KEY ("registrado_por_id") REFERENCES "usuario" ("id");`);
        await queryRunner.query(`ALTER TABLE "pendencias" ADD CONSTRAINT "FK_4bb669746a96b026a563fc32110" FOREIGN KEY ("resolvido_por_id") REFERENCES "usuario" ("id");`);
        await queryRunner.query(`ALTER TABLE "documentos_enviados" ADD CONSTRAINT "FK_17685e8f599fe57053c9f928b2d" FOREIGN KEY ("documento_id") REFERENCES "documentos" ("id");`);
        await queryRunner.query(`ALTER TABLE "documentos_enviados" ADD CONSTRAINT "FK_8c994f4d63c04ae6ec60f70b6dd" FOREIGN KEY ("enviado_por_id") REFERENCES "usuario" ("id");`);
        await queryRunner.query(`ALTER TABLE "documentos_enviados" ADD CONSTRAINT "FK_99cefcf033b0e3319a8620adb82" FOREIGN KEY ("verificado_por_id") REFERENCES "usuario" ("id");`);
        await queryRunner.query(`ALTER TABLE "notificacoes_sistema" ADD CONSTRAINT "FK_557b4bae92e70d84f68b4bb38a7" FOREIGN KEY ("template_id") REFERENCES "notification_templates" ("id");`);
        await queryRunner.query(`ALTER TABLE "ocorrencia" ADD CONSTRAINT "FK_b2e2cae6dd0257c17ae1427a908" FOREIGN KEY ("cidadao_id") REFERENCES "cidadao" ("id");`);
        await queryRunner.query(`ALTER TABLE "ocorrencia" ADD CONSTRAINT "FK_d7f45b8d5c47e45e19a724f6a0b" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao" ("id");`);
        await queryRunner.query(`ALTER TABLE "ocorrencia" ADD CONSTRAINT "FK_69b16108b8296336ac76be802a9" FOREIGN KEY ("registrado_por_id") REFERENCES "usuario" ("id");`);
        await queryRunner.query(`ALTER TABLE "ocorrencia" ADD CONSTRAINT "FK_9aa6b04a2974b2e064b5046e845" FOREIGN KEY ("demanda_motivo_id") REFERENCES "demanda_motivos" ("id");`);
        await queryRunner.query(`ALTER TABLE "ocorrencia" ADD CONSTRAINT "FK_6a9ecee25d256ba3c8e0c203090" FOREIGN KEY ("responsavel_id") REFERENCES "usuario" ("id");`);
        await queryRunner.query(`ALTER TABLE "integrador_tokens" ADD CONSTRAINT "FK_d6e6522bb2ec15b9dc178d5d13c" FOREIGN KEY ("integrador_id") REFERENCES "integradores" ("id");`);
        await queryRunner.query(`ALTER TABLE "pagamento" ADD CONSTRAINT "FK_07d2e40a3dc70a4ae9cbafa43d5" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao" ("id");`);
        await queryRunner.query(`ALTER TABLE "pagamento" ADD CONSTRAINT "FK_af7a2c40fbe13f5e2e3060fdbf5" FOREIGN KEY ("liberado_por") REFERENCES "usuario" ("id");`);
        await queryRunner.query(`ALTER TABLE "comprovante_pagamento" ADD CONSTRAINT "FK_a3518bf273907bd6ac06fe3fc31" FOREIGN KEY ("pagamento_id") REFERENCES "pagamento" ("id");`);
        await queryRunner.query(`ALTER TABLE "confirmacao_recebimento" ADD CONSTRAINT "FK_bac71169d7641ff2d649ca252ff" FOREIGN KEY ("pagamento_id") REFERENCES "pagamento" ("id");`);
        await queryRunner.query(`ALTER TABLE "registros_metricas" ADD CONSTRAINT "FK_7cd87debb8bdad16d3189e74df8" FOREIGN KEY ("metrica_id") REFERENCES "metricas" ("id");`);
        await queryRunner.query(`ALTER TABLE "regras_alerta" ADD CONSTRAINT "FK_27b519ea7bb04ef3e7358d890b6" FOREIGN KEY ("metrica_id") REFERENCES "metricas" ("id");`);
        await queryRunner.query(`ALTER TABLE "alertas_metricas" ADD CONSTRAINT "FK_2b4d95a67b9fab233d021bd856a" FOREIGN KEY ("metrica_id") REFERENCES "metricas" ("id");`);
        await queryRunner.query(`ALTER TABLE "metrica_snapshot" ADD CONSTRAINT "FK_21d368bba59ac978e9c5231a196" FOREIGN KEY ("definicao_id") REFERENCES "metrica_definicao" ("id");`);
        await queryRunner.query(`ALTER TABLE "metrica_configuracao" ADD CONSTRAINT "FK_c84d77e09e9396ec6c330624d79" FOREIGN KEY ("metrica_id") REFERENCES "metrica_definicao" ("id");`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "metrica_configuracao" DROP CONSTRAINT IF EXISTS "FK_c84d77e09e9396ec6c330624d79";`);
        await queryRunner.query(`ALTER TABLE "metrica_snapshot" DROP CONSTRAINT IF EXISTS "FK_21d368bba59ac978e9c5231a196";`);
        await queryRunner.query(`ALTER TABLE "alertas_metricas" DROP CONSTRAINT IF EXISTS "FK_2b4d95a67b9fab233d021bd856a";`);
        await queryRunner.query(`ALTER TABLE "regras_alerta" DROP CONSTRAINT IF EXISTS "FK_27b519ea7bb04ef3e7358d890b6";`);
        await queryRunner.query(`ALTER TABLE "registros_metricas" DROP CONSTRAINT IF EXISTS "FK_7cd87debb8bdad16d3189e74df8";`);
        await queryRunner.query(`ALTER TABLE "confirmacao_recebimento" DROP CONSTRAINT IF EXISTS "FK_bac71169d7641ff2d649ca252ff";`);
        await queryRunner.query(`ALTER TABLE "comprovante_pagamento" DROP CONSTRAINT IF EXISTS "FK_a3518bf273907bd6ac06fe3fc31";`);
        await queryRunner.query(`ALTER TABLE "pagamento" DROP CONSTRAINT IF EXISTS "FK_af7a2c40fbe13f5e2e3060fdbf5";`);
        await queryRunner.query(`ALTER TABLE "pagamento" DROP CONSTRAINT IF EXISTS "FK_07d2e40a3dc70a4ae9cbafa43d5";`);
        await queryRunner.query(`ALTER TABLE "integrador_tokens" DROP CONSTRAINT IF EXISTS "FK_d6e6522bb2ec15b9dc178d5d13c";`);
        await queryRunner.query(`ALTER TABLE "ocorrencia" DROP CONSTRAINT IF EXISTS "FK_6a9ecee25d256ba3c8e0c203090";`);
        await queryRunner.query(`ALTER TABLE "ocorrencia" DROP CONSTRAINT IF EXISTS "FK_9aa6b04a2974b2e064b5046e845";`);
        await queryRunner.query(`ALTER TABLE "ocorrencia" DROP CONSTRAINT IF EXISTS "FK_69b16108b8296336ac76be802a9";`);
        await queryRunner.query(`ALTER TABLE "ocorrencia" DROP CONSTRAINT IF EXISTS "FK_d7f45b8d5c47e45e19a724f6a0b";`);
        await queryRunner.query(`ALTER TABLE "ocorrencia" DROP CONSTRAINT IF EXISTS "FK_b2e2cae6dd0257c17ae1427a908";`);
        await queryRunner.query(`ALTER TABLE "notificacoes_sistema" DROP CONSTRAINT IF EXISTS "FK_557b4bae92e70d84f68b4bb38a7";`);
        await queryRunner.query(`ALTER TABLE "documentos_enviados" DROP CONSTRAINT IF EXISTS "FK_99cefcf033b0e3319a8620adb82";`);
        await queryRunner.query(`ALTER TABLE "documentos_enviados" DROP CONSTRAINT IF EXISTS "FK_8c994f4d63c04ae6ec60f70b6dd";`);
        await queryRunner.query(`ALTER TABLE "documentos_enviados" DROP CONSTRAINT IF EXISTS "FK_17685e8f599fe57053c9f928b2d";`);
        await queryRunner.query(`ALTER TABLE "pendencias" DROP CONSTRAINT IF EXISTS "FK_4bb669746a96b026a563fc32110";`);
        await queryRunner.query(`ALTER TABLE "pendencias" DROP CONSTRAINT IF EXISTS "FK_eee52af29453eeec81f0b1101c6";`);
        await queryRunner.query(`ALTER TABLE "pendencias" DROP CONSTRAINT IF EXISTS "FK_cabd3034b48d1276780fd92f319";`);
        await queryRunner.query(`ALTER TABLE "dados_beneficios" DROP CONSTRAINT IF EXISTS "FK_b644080d63183daaaa8989eae42";`);
        await queryRunner.query(`ALTER TABLE "versoes_schema_beneficio" DROP CONSTRAINT IF EXISTS "FK_5c1042d45f2ad478ffec777aa8c";`);
        await queryRunner.query(`ALTER TABLE "fluxo_beneficio" DROP CONSTRAINT IF EXISTS "FK_ad1468d20c1d84bbf1f4c0da1a7";`);
        await queryRunner.query(`ALTER TABLE "especificacao_natalidade" DROP CONSTRAINT IF EXISTS "FK_2c21869318167ff370136e1e206";`);
        await queryRunner.query(`ALTER TABLE "especificacao_funeral" DROP CONSTRAINT IF EXISTS "FK_70062900aed393e99021dafa39d";`);
        await queryRunner.query(`ALTER TABLE "especificacao_cesta_basica" DROP CONSTRAINT IF EXISTS "FK_8a8272603a6e783b87cbe6f39a4";`);
        await queryRunner.query(`ALTER TABLE "especificacao_aluguel_social" DROP CONSTRAINT IF EXISTS "FK_51dfaacd8461bea0fd2c7419416";`);
        await queryRunner.query(`ALTER TABLE "configuracao_renovacao" DROP CONSTRAINT IF EXISTS "FK_459f2c63cfff01126699900e4e1";`);
        await queryRunner.query(`ALTER TABLE "campos_dinamicos_beneficio" DROP CONSTRAINT IF EXISTS "FK_dfdf0ac2ad34a7e134bf5680907";`);
        await queryRunner.query(`ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_060381b19971dd3ec8d2a9e98fa";`);
        await queryRunner.query(`ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_d5a488ef197835d8268367bebed";`);
        await queryRunner.query(`ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_b9cab9c575ece58f6852cc9a41a";`);
        await queryRunner.query(`ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_135fcc73739b564d3bd3b236a1c";`);
        await queryRunner.query(`ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_3a0de86d61ee1e8fd7b8a3b4009";`);
        await queryRunner.query(`ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_d3c6c57eca180d1e5c1cd8ea92c";`);
        await queryRunner.query(`ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_c6827516b5d297a09bd021922d4";`);
        await queryRunner.query(`ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_eb9aef15fbc52d46e35b5f1d9d8";`);
        await queryRunner.query(`ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_68bb5274b8f615a371a6586da93";`);
        await queryRunner.query(`ALTER TABLE "determinacao_judicial" DROP CONSTRAINT IF EXISTS "FK_9653d429c481ebd35631a03255f";`);
        await queryRunner.query(`ALTER TABLE "historico_solicitacao" DROP CONSTRAINT IF EXISTS "FK_8f4d51b23050f7e446eab891ab4";`);
        await queryRunner.query(`ALTER TABLE "historico_solicitacao" DROP CONSTRAINT IF EXISTS "FK_999dc202160c9fee059158b1947";`);
        await queryRunner.query(`ALTER TABLE "documentos" DROP CONSTRAINT IF EXISTS "FK_ea502e97b961cf420d08b44ac1e";`);
        await queryRunner.query(`ALTER TABLE "requisitos_documento" DROP CONSTRAINT IF EXISTS "FK_4470b95c81be5031312b7afc810";`);
        await queryRunner.query(`ALTER TABLE "regra_conflito_papel" DROP CONSTRAINT IF EXISTS "FK_45e52a9f35536ae8be83205aa61";`);
        await queryRunner.query(`ALTER TABLE "regra_conflito_papel" DROP CONSTRAINT IF EXISTS "FK_020bb9936a252d157336c13e86d";`);
        await queryRunner.query(`ALTER TABLE "historico_conversao_papel" DROP CONSTRAINT IF EXISTS "FK_48a0a9971eb22fca7a0a61ac0e8";`);
        await queryRunner.query(`ALTER TABLE "situacao_moradia" DROP CONSTRAINT IF EXISTS "FK_79c329a5139ffcd20a38fd641ac";`);
        await queryRunner.query(`ALTER TABLE "dados_sociais" DROP CONSTRAINT IF EXISTS "FK_7883370d870f6998b58c40888e4";`);
        await queryRunner.query(`ALTER TABLE "cidadao" DROP CONSTRAINT IF EXISTS "FK_80ffc95cbb425a44b532fa13c9d";`);
        await queryRunner.query(`ALTER TABLE "papel_cidadao" DROP CONSTRAINT IF EXISTS "FK_d8b7a395cb19d412d7b55c3fc48";`);
        await queryRunner.query(`ALTER TABLE "papel_cidadao" DROP CONSTRAINT IF EXISTS "FK_bd0781234e1cb13fb0f6021e48e";`);
        await queryRunner.query(`ALTER TABLE "composicao_familiar" DROP CONSTRAINT IF EXISTS "FK_9a106182b82bae44c35cd819eb4";`);
        await queryRunner.query(`ALTER TABLE "setor_unidade" DROP CONSTRAINT IF EXISTS "FK_821e6cbd16d8f4b0e9cf975e13f";`);
        await queryRunner.query(`ALTER TABLE "setor_unidade" DROP CONSTRAINT IF EXISTS "FK_ab40ea1ab5d1af76feea1751c28";`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "FK_76adac46b6075b2a28f1a7d1008";`);
        await queryRunner.query(`ALTER TABLE "role_permissao" DROP CONSTRAINT IF EXISTS "FK_81b906af5fe36ca740a222f8b41";`);
        await queryRunner.query(`ALTER TABLE "role_permissao" DROP CONSTRAINT IF EXISTS "FK_f80fcdc74b632b76c8a8300698f";`);
        await queryRunner.query(`ALTER TABLE "escopo_permissao" DROP CONSTRAINT IF EXISTS "FK_096e066bd57fc589e95e62abf54";`);
        await queryRunner.query(`ALTER TABLE "escopo_permissao" DROP CONSTRAINT IF EXISTS "FK_02ee05dae4bb92316c70c93feeb";`);
        await queryRunner.query(`ALTER TABLE "escopo_permissao" DROP CONSTRAINT IF EXISTS "FK_2214b692e096b210cd3526e8c0d";`);
        await queryRunner.query(`ALTER TABLE "usuario_permissao" DROP CONSTRAINT IF EXISTS "FK_06d3a75c4cd1863970f1a9fa68d";`);
        await queryRunner.query(`ALTER TABLE "usuario_permissao" DROP CONSTRAINT IF EXISTS "FK_853318b046ef9d17ed87702e297";`);
        await queryRunner.query(`ALTER TABLE "usuario_permissao" DROP CONSTRAINT IF EXISTS "FK_78fae70343b9b13b249b59a5873";`);
        await queryRunner.query(`ALTER TABLE "usuario_permissao" DROP CONSTRAINT IF EXISTS "FK_68ec4c570a03cc718131614d2d1";`);
        await queryRunner.query(`ALTER TABLE "mapeamento_grupo_permissao" DROP CONSTRAINT IF EXISTS "FK_d260ae081916aaae470f8d6b9b2";`);
        await queryRunner.query(`ALTER TABLE "mapeamento_grupo_permissao" DROP CONSTRAINT IF EXISTS "FK_409e0adcb54e6038446c3b63ef3";`);
        await queryRunner.query(`ALTER TABLE "mapeamento_grupo_permissao" DROP CONSTRAINT IF EXISTS "FK_36146aad01a79190a91d3f4e12a";`);
        await queryRunner.query(`ALTER TABLE "grupo_permissao" DROP CONSTRAINT IF EXISTS "FK_ef0915006ff0a06da353b555cc0";`);
        await queryRunner.query(`ALTER TABLE "grupo_permissao" DROP CONSTRAINT IF EXISTS "FK_a601413e4c78b796cda1309659c";`);
        await queryRunner.query(`ALTER TABLE "role_permissao" DROP CONSTRAINT IF EXISTS "FK_f80fcdc74b632b76c8a8300698f";`);
        await queryRunner.query(`ALTER TABLE "password_reset_tokens" DROP CONSTRAINT IF EXISTS "FK_115e409c8f4f906792458ca4e81";`);
        await queryRunner.query(`ALTER TABLE "usuario" DROP CONSTRAINT IF EXISTS "FK_02daf63c89aa78a7a1b84b1cbe3";`);
        await queryRunner.query(`ALTER TABLE "usuario" DROP CONSTRAINT IF EXISTS "FK_5a56517544da4275c4795360727";`);
        await queryRunner.query(`ALTER TABLE "usuario" DROP CONSTRAINT IF EXISTS "FK_5ae226ebff39eb6d1b2ba129248";`);
        await queryRunner.query(`ALTER TABLE "setor" DROP CONSTRAINT IF EXISTS "FK_b857a294dfc326b23926bce5ef5";`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "FK_c8349fdadc1bc791125bdd8c855";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_metricas_sistema_servidor";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_metricas_sistema_timestamp";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "metricas_sistema" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_metricas_http_usuario";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_metricas_http_status";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_metricas_http_endpoint";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_metricas_http_timestamp";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "metricas_http" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_metricas_documentos_usuario";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_metricas_documentos_documento";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_metricas_documentos_timestamp";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_metricas_documentos_operacao";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "metricas_documentos" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_c84d77e09e9396ec6c330624d7";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "metrica_configuracao" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_269ed6729550ddf867490ed8bf";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "metrica_definicao" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_9228627cb936ce9028373a14ad";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_28017a1b71f1df9947eaeefc4f";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "metrica_snapshot" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "configuracoes_notificacao" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_alertas_metricas_resolvido";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_alertas_metricas_nivel";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_alertas_metricas_timestamp";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_alertas_metricas_metrica";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "alertas_metricas" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "metricas" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_regras_alerta_ativo";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_regras_alerta_nivel";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_regras_alerta_metrica";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "regras_alerta" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_metricas_seguranca_nivel";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_metricas_seguranca_ip";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_metricas_seguranca_usuario";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_metricas_seguranca_timestamp";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_metricas_seguranca_tipo";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "metricas_seguranca" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_registros_metricas_usuario_id";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_registros_metricas_timestamp";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_registros_metricas_metrica_id";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "registros_metricas" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "confirmacao_recebimento" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "comprovante_pagamento" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "pagamento" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_894528549ad89b4e5b89ff62bd";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_f63299dcd135b4b8ece4fab4de";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tokens_revogados" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "integradores" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "integrador_tokens" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_workflow_tipo_beneficio";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "configuracao_workflow_beneficio" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_template_tipo";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_template_codigo";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "configuracao_template" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_parametro_categoria";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_parametro_chave";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "configuracao_parametro" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_integracao_tipo";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_integracao_codigo";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "configuracao_integracao" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_c1441cccaa2df49048748bd844";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_a5a61318966f91f30ce13146e4";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ocorrencia" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_07b71a7ca343f40ac8394e34d9";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "demanda_motivos" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_2a8be9a941bfa7f8f057b27dc1";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_fb39a0eb48e68bf9e15a2f27dc";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "notificacoes_sistema" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "notification_templates" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_17685e8f599fe57053c9f928b2";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "documentos_enviados" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_81d2bbea84d4582d06ddfc6d03";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "pendencias" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_b644080d63183daaaa8989eae4";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "dados_beneficios" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_707389f7bd340d8200a104d70b";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "versoes_schema_beneficio" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_fdcd9333fee6a1b1cb6fd43ac0";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "fluxo_beneficio" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_2c21869318167ff370136e1e20";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "especificacao_natalidade" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_70062900aed393e99021dafa39";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "especificacao_funeral" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_8a8272603a6e783b87cbe6f39a";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "especificacao_cesta_basica" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_51dfaacd8461bea0fd2c741941";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "especificacao_aluguel_social" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_459f2c63cfff01126699900e4e";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "configuracao_renovacao" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_eeebd551e2fdb3e68d8abe747c";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tipo_beneficio" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_45d57d728a7eaf0460aafadbc3";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "campos_dinamicos_beneficio" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_5dc7df7681656f0ba74bde89d3";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cbd28d0589d5b4b12a3826ecb2";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_2747a04e73abb61ad4b79c5248";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_88cebd57ae2cb9e98563390b44";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bd8ea92071e65588f8648a96f5";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_7de9716e7bf9aa8bfe3fe193d9";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_decb6f4f02bef1985afb9de824";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "solicitacao" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_9653d429c481ebd35631a03255";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_39e77fffefeb955e81a10e4bf1";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_5fd5c6f18205c2832ef9775534";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_f3f25ae401d795ef9bce6479ad";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "determinacao_judicial" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "processo_judicial" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_918f391d9f3e55a53b1502e30b";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "historico_solicitacao" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_a135626285538e1567d3adba36";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_b22ef8e71d5a27327f7974548b";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_f5a1d483d8f9312eb1e512d2af";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_3bfbfff4ab942ab46ec78cc9e3";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "documentos" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_5614b2f577c7cefded0e4bf13b";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "requisitos_documento" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "regra_conflito_papel" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_8d02b2dedb65806a31029c1963";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "historico_conversao_papel" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_79c329a5139ffcd20a38fd641a";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "situacao_moradia" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_7883370d870f6998b58c40888e";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "dados_sociais" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_a78dc107708ca989c1ab256e02";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dcc6ac9afe54f5a0c88ee75446";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_1d0e02cabec5b1eaf0b943dbf5";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_4645cf71e6c5578cf62f875e7c";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_270382aed2d93f9e8e219d6556";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_80ffc95cbb425a44b532fa13c9";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_cidadao_endereco_bairro";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_cidadao_endereco_cidade";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_cidadao_nome_trgm";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_859e5af984f5d9f57c3a641682";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "cidadao" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_12c613386fe90593e8ce0cac59";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "papel_cidadao" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_4678b12c2b834c458b252733ff";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "composicao_familiar" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "setor_unidade" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_2102aacc049d0ceadc98e67c4e";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_5d0b8d3a7c0d3b3334a19bdd5e";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bd1b541500964e345f86694bef";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "logs_auditoria" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "categoria_log" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_6adb17e9f4abd83df9e4f2fba1";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_99fca4a3a4a93c26a756c5aca5";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_c3f3be5f9937b5309b26c15f7f";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_3d04b6f2b05825501c1427f0d9";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_d4e5a2ad76a3dfc8ac639068d4";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "role_permissao" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "escopo_permissao" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "usuario_permissao" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "mapeamento_grupo_permissao" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "permissao" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "grupo_permissao" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_e3cf3fdcfb6d5b291e84bbaea8";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_63f232965c4f68044255ae83a9";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "permissao" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_3555f461e1a2314067993070e8";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_f80fcdc74b632b76c8a8300698";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "role_permissao" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ab673f0e63eac966762155508e";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_2723bda24c4145021e54e269c2";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_7c038e5a589b06cbe4320cc88b";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_tokens" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_2863682842e688ca198eb25c12";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_28cd8597e57c8197d4929a98e7";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_8907b27b6312769f5b846975ab";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_5a56517544da4275c479536072";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_02daf63c89aa78a7a1b84b1cbe";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_5ae226ebff39eb6d1b2ba12924";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_df0630b069ecca09c829b53700";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "usuario" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "role" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_a8bb7b4183a8038197be4f3e73";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_0c2402a8569bba71cc1e311b65";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_63e5fa185b2b1fd65721f9f5d8";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_d4597b9996d51d2d3afaa9140e";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "unidade" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_0d9d3f7f072e028a5601e07a97";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_b857a294dfc326b23926bce5ef";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_4095c1294fca5deaef67242e93";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "setor" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens" CASCADE;`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_8e34500df0db639fa951586676";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_d7fae2264c0c24e3ccd0b66ccd";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_06b923535c4764253c786d04d6";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ef28645667d5965ce79b307ac6";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_8e34500df0db639fa951586676";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "jwt_blacklist" CASCADE;`);
        await queryRunner.query(`DROP TYPE IF EXISTS "metrica_configuracao_estrategia_amostragem_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "metrica_configuracao_tipo_agendamento_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "metrica_definicao_granularidade_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "metrica_definicao_categoria_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "metrica_definicao_tipo_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "configuracoes_notificacao_niveis_alerta_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "alertas_metricas_nivel_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "metricas_categoria_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "metricas_tipo_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "regras_alerta_nivel_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "metricas_seguranca_nivel_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "confirmacao_recebimento_metodoConfirmacao_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "pagamento_metodoPagamento_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "pagamento_status_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "configuracao_template_tipo_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "configuracao_parametro_tipo_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "configuracao_integracao_tipo_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "ocorrencia_status_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "demanda_motivos_tipo_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "notificacoes_sistema_status_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "notification_templates_canais_suportados_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "pendencias_status_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "dados_beneficios_tipo_beneficio_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "fluxo_beneficio_perfil_responsavel_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "fluxo_beneficio_tipo_etapa_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "especificacao_cesta_basica_periodicidade_cesta_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "especificacao_cesta_basica_periodicidade_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "especificacao_cesta_basica_tipo_entrega_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "tipo_beneficio_periodicidade_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "campos_dinamicos_beneficio_tipo_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "solicitacao_status_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "determinacao_judicial_tipo_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "processo_judicial_status_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "documentos_tipo_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "requisitos_documento_tipo_documento_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "historico_conversao_papel_papel_novo_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "historico_conversao_papel_papel_anterior_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "situacao_moradia_tipo_moradia_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "dados_sociais_situacao_trabalho_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "dados_sociais_escolaridade_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "cidadao_sexo_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "papel_cidadao_tipo_papel_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "composicao_familiar_parentesco_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "composicao_familiar_escolaridade_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "audit_logs_severity_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "audit_logs_action_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "role_permissao_role_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "usuario_status_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "unidade_status_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "unidade_tipo_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "jwt_blacklist_token_type_enum";`);
    }
}
