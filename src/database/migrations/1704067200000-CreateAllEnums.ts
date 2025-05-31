import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAllEnums1704067200000 implements MigrationInterface {
    name = 'CreateAllEnums1704067200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Criar todos os enums necessários baseados nas entities
        // Usando sintaxe compatível com PostgreSQL 14

        // Enum para status de solicitação
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_solicitacao_enum" AS ENUM (
                   'RASCUNHO', 'rascunho', 'ABERTA', 'aberta', 'LIBERADA', 'liberada', 'ARQUIVADA', 'arquivada', 'PENDENTE', 'pendente', 'EM_ANALISE', 'em_analise', 'APROVADO', 'aprovado', 'REJEITADO', 'rejeitado', 'CANCELADO', 'cancelado'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipos de benefício
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_beneficio_enum" AS ENUM (
                    'NATALIDADE', 'natalidade', 'FUNERAL', 'funeral', 'ALUGUEL_SOCIAL', 'aluguel_social', 'CESTA_BASICA', 'cesta_basica'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipos de unidade
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_unidade_enum" AS ENUM (
                    'SEDE', 'sede', 'FILIAL', 'filial', 'REGIONAL', 'regional'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para status de unidade
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_unidade_enum" AS ENUM (
                    'ATIVO', 'ativo', 'INATIVO', 'inativo', 'MANUTENCAO', 'manutencao'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para sexo
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "sexo_enum" AS ENUM (
                    'MASCULINO', 'masculino', 'FEMININO', 'feminino', 'OUTRO', 'outro'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para escolaridade
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "escolaridade_enum" AS ENUM (
                    'ANALFABETO', 'analfabeto', 'FUNDAMENTAL_INCOMPLETO', 'fundamental_incompleto', 'FUNDAMENTAL_COMPLETO', 'fundamental_completo', 
                    'MEDIO_INCOMPLETO', 'medio_incompleto', 'MEDIO_COMPLETO', 'medio_completo', 'SUPERIOR_INCOMPLETO', 'superior_incompleto', 
                    'SUPERIOR_COMPLETO', 'superior_completo', 'POS_GRADUACAO', 'pos_graduacao'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para parentesco
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "parentesco_enum" AS ENUM (
                    'PAI', 'pai', 'MAE', 'mae', 'FILHO', 'filho', 'FILHA', 'filha', 'CONJUGE', 'conjuge', 'IRMAO', 'irmao', 'IRMA', 'irma', 'OUTRO', 'outro'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para situação de trabalho
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "situacao_trabalho_enum" AS ENUM (
                    'EMPREGADO', 'empregado', 'DESEMPREGADO', 'desempregado', 'AUTONOMO', 'autonomo', 'APOSENTADO', 'aposentado', 'PENSIONISTA', 'pensionista'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para periodicidade
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "periodicidade_enum" AS ENUM (
                    'UNICA', 'unica', 'MENSAL', 'mensal', 'TRIMESTRAL', 'trimestral', 'SEMESTRAL', 'semestral', 'ANUAL', 'anual'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para status de pendência
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_pendencia_enum" AS ENUM (
                    'ABERTA', 'aberta', 'EM_RESOLUCAO', 'em_resolucao', 'RESOLVIDA', 'resolvida', 'CANCELADA', 'cancelada'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para método de confirmação
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "metodo_confirmacao_enum" AS ENUM (
                    'PRESENCIAL', 'presencial', 'TELEFONE', 'telefone', 'EMAIL', 'email', 'SMS', 'sms'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para status de pagamento
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_pagamento_enum" AS ENUM (
                    'PENDENTE', 'pendente', 'PROCESSANDO', 'processando', 'PAGO', 'pago', 'CANCELADO', 'cancelado', 'ESTORNADO', 'estornado'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para método de pagamento
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "metodo_pagamento_enum" AS ENUM (
                    'PIX', 'pix', 'TED', 'ted', 'DINHEIRO', 'dinheiro', 'CARTAO', 'cartao'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de métrica
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_metrica_enum" AS ENUM (
                    'COUNTER', 'counter', 'GAUGE', 'gauge', 'HISTOGRAM', 'histogram', 'SUMMARY', 'summary'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para categoria de métrica
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "categoria_metrica_enum" AS ENUM (
                    'SISTEMA', 'sistema', 'NEGOCIO', 'negocio', 'PERFORMANCE', 'performance', 'SEGURANCA', 'seguranca'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para nível de alerta
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "nivel_alerta_enum" AS ENUM (
                    'INFO', 'info', 'WARNING', 'warning', 'ERROR', 'error', 'CRITICAL', 'critical'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de documento
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_documento_enum" AS ENUM (
                    'CPF', 'cpf', 'RG', 'rg', 'CNH', 'cnh', 'PASSAPORTE', 'passaporte', 'CERTIDAO_NASCIMENTO', 'certidao_nascimento', 
                    'CERTIDAO_CASAMENTO', 'certidao_casamento', 'COMPROVANTE_RESIDENCIA', 'comprovante_residencia', 'COMPROVANTE_RENDA', 'comprovante_renda'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de papel
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_papel_enum" AS ENUM (
                    'BENEFICIARIO', 'beneficiario', 'REQUERENTE', 'requerente', 'REPRESENTANTE_LEGAL', 'representante_legal'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de moradia
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_moradia_enum" AS ENUM (
                    'PROPRIA', 'propria', 'ALUGADA', 'alugada', 'CEDIDA', 'cedida', 'FINANCIADA', 'financiada', 'OUTROS', 'outros'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de integração
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "integracao_tipo_enum" AS ENUM (
                    'REST', 'rest', 'SOAP', 'soap', 'GRAPHQL', 'graphql', 'WEBHOOK', 'webhook'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de urna funerária
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_urna_funeraria_enum" AS ENUM (
                    'PADRAO', 'padrao', 'ESPECIAL', 'especial', 'LUXO', 'luxo', 'SUPER_LUXO', 'super_luxo', 'INFANTIL', 'infantil'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para periodicidade de entrega
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "periodicidade_entrega_enum" AS ENUM (
                    'UNICA', 'unica', 'SEMANAL', 'semanal', 'QUINZENAL', 'quinzenal', 'MENSAL', 'mensal', 'BIMESTRAL', 'bimestral', 'TRIMESTRAL', 'trimestral'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de avaliação
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_avaliacao_enum" AS ENUM (
                    'TECNICA', 'tecnica', 'SOCIAL', 'social', 'FINANCEIRA', 'financeira', 'JURIDICA', 'juridica'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para resultado de avaliação
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "resultado_avaliacao_enum" AS ENUM (
                    'APROVADO', 'aprovado', 'REPROVADO', 'reprovado', 'PENDENTE', 'pendente', 'EM_ANALISE', 'em_analise'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para origem de solicitação
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "origem_solicitacao_enum" AS ENUM (
                    'PRESENCIAL', 'presencial', 'ONLINE', 'online', 'TELEFONE', 'telefone', 'EMAIL', 'email', 'OFICIO', 'oficio'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de solicitação
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_solicitacao_enum" AS ENUM (
                    'BENEFICIO', 'beneficio', 'SERVICO', 'servico', 'INFORMACAO', 'informacao', 'DENUNCIA', 'denuncia', 'RECLAMACAO', 'reclamacao'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para formato de relatório
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "formato_relatorio_enum" AS ENUM (
                    'PDF', 'pdf', 'EXCEL', 'excel', 'CSV', 'csv', 'HTML', 'html', 'JSON', 'json'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de relatório
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_relatorio_enum" AS ENUM (
                    'GERENCIAL', 'gerencial', 'OPERACIONAL', 'operacional', 'ESTATISTICO', 'estatistico', 'FINANCEIRO', 'financeiro', 'AUDITORIA', 'auditoria'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para status de geração
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_geracao_enum" AS ENUM (
                    'PENDENTE', 'pendente', 'EM_PROCESSAMENTO', 'em_processamento', 'CONCLUIDO', 'concluido', 'ERRO', 'erro'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para estratégia de amostragem
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "estrategia_amostragem_enum" AS ENUM (
                    'COMPLETA', 'completa', 'ALEATORIA', 'aleatoria', 'INTERVALO', 'intervalo', 'PERCENTUAL', 'percentual'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de agendamento
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_agendamento_enum" AS ENUM (
                    'UNICO', 'unico', 'RECORRENTE', 'recorrente', 'CONDICIONAL', 'condicional'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para canal de notificação
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "canal_notificacao_enum" AS ENUM (
                    'EMAIL', 'email', 'SMS', 'sms', 'PUSH', 'push', 'WHATSAPP', 'whatsapp', 'INTERNO', 'interno'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de escopo
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_escopo_enum" AS ENUM (
                    'GLOBAL', 'global', 'UNIDADE', 'unidade', 'SETOR', 'setor', 'USUARIO', 'usuario'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de evento de integração
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_evento_integracao_enum" AS ENUM (
                    'CRIACAO', 'criacao', 'ATUALIZACAO', 'atualizacao', 'EXCLUSAO', 'exclusao', 'CONSULTA', 'consulta'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para motivo de aluguel social
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "motivo_aluguel_social_enum" AS ENUM (
                    'DESASTRE_NATURAL', 'desastre_natural', 'INCENDIO', 'incendio', 'DESABAMENTO', 'desabamento', 'RISCO_ESTRUTURAL', 'risco_estrutural', 
                    'REMOCAO_AREA_RISCO', 'remocao_area_risco', 'VIOLENCIA_DOMESTICA', 'violencia_domestica', 'VULNERABILIDADE_EXTREMA', 'vulnerabilidade_extrema'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de entrega de cesta básica
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_entrega_cesta_basica_enum" AS ENUM (
                    'PRESENCIAL', 'presencial', 'DOMICILIAR', 'domiciliar', 'PONTO_COLETA', 'ponto_coleta', 'PARCEIRO', 'parceiro'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para periodicidade de cesta básica
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "periodicidade_cesta_basica_enum" AS ENUM (
                    'UNICA', 'unica', 'SEMANAL', 'semanal', 'QUINZENAL', 'quinzenal', 'MENSAL', 'mensal'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para status de verificação de documento
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_verificacao_documento_enum" AS ENUM (
                    'PENDENTE', 'pendente', 'EM_ANALISE', 'em_analise', 'VERIFICADO', 'verificado', 'REJEITADO', 'rejeitado'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para resultado de verificação de malware
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "resultado_verificacao_malware_enum" AS ENUM (
                    'SEGURO', 'seguro', 'SUSPEITO', 'suspeito', 'INFECTADO', 'infectado', 'ERRO_VERIFICACAO', 'erro_verificacao'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de documento enviado
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_documento_enviado_enum" AS ENUM (
                    'IDENTIFICACAO', 'identificacao', 'COMPROVANTE', 'comprovante', 'DECLARACAO', 'declaracao', 'LAUDO', 'laudo', 'FORMULARIO', 'formulario'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de configuração
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_configuracao_enum" AS ENUM (
                    'SISTEMA', 'sistema', 'MODULO', 'modulo', 'FUNCIONALIDADE', 'funcionalidade', 'INTEGRACAO', 'integracao', 'NOTIFICACAO', 'notificacao'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para visibilidade de configuração
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "visibilidade_configuracao_enum" AS ENUM (
                    'PUBLICA', 'publica', 'PRIVADA', 'privada', 'RESTRITA', 'restrita', 'ADMIN', 'admin'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de trabalho
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_trabalho_enum" AS ENUM (
                    'CLT', 'clt', 'AUTONOMO', 'autonomo', 'SERVIDOR_PUBLICO', 'servidor_publico', 'EMPRESARIO', 'empresario', 'INFORMAL', 'informal', 'OUTRO', 'outro'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para fase de requisito
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "fase_requisito_enum" AS ENUM (
                    'INSCRICAO', 'inscricao', 'ANALISE', 'analise', 'APROVACAO', 'aprovacao', 'CONCESSAO', 'concessao'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de campo
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_campo_enum" AS ENUM (
                    'TEXTO', 'texto', 'NUMERO', 'numero', 'DATA', 'data', 'BOOLEANO', 'booleano', 'SELECAO', 'selecao', 'MULTIPLA_ESCOLHA', 'multipla_escolha', 'ARQUIVO', 'arquivo'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de operação
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_operacao_enum" AS ENUM (
                    'CRIACAO', 'criacao', 'LEITURA', 'leitura', 'ATUALIZACAO', 'atualizacao', 'EXCLUSAO', 'exclusao', 'AUTENTICACAO', 'autenticacao'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para status ativo
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_ativo_enum" AS ENUM (
                    'ATIVO', 'ativo', 'INATIVO', 'inativo'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para status de usuário
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_usuario_enum" AS ENUM (
                    'ATIVO', 'ativo', 'INATIVO', 'inativo', 'SUSPENSO', 'suspenso', 'BLOQUEADO', 'bloqueado'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para prioridade
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "prioridade_enum" AS ENUM (
                    'BAIXA', 'baixa', 'MEDIA', 'media', 'ALTA', 'alta', 'CRITICA', 'critica'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para status de notificação
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_notificacao_enum" AS ENUM (
                    'PENDENTE', 'pendente', 'ENVIADA', 'enviada', 'ENTREGUE', 'entregue', 'LIDA', 'lida', 'ERRO', 'erro', 'CANCELADA', 'cancelada'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remover todos os enums
        const enumsToRemove = [
            'status_notificacao_enum',
            'prioridade_enum',
            'status_usuario_enum',
            'status_ativo_enum',
            'tipo_operacao_enum',
            'tipo_campo_enum',
            'fase_requisito_enum',
            'tipo_trabalho_enum',
            'visibilidade_configuracao_enum',
            'tipo_configuracao_enum',
            'tipo_documento_enviado_enum',
            'resultado_verificacao_malware_enum',
            'status_verificacao_documento_enum',
            'periodicidade_cesta_basica_enum',
            'tipo_entrega_cesta_basica_enum',
            'motivo_aluguel_social_enum',
            'tipo_evento_integracao_enum',
            'tipo_escopo_enum',
            'canal_notificacao_enum',
            'tipo_agendamento_enum',
            'estrategia_amostragem_enum',
            'status_geracao_enum',
            'tipo_relatorio_enum',
            'formato_relatorio_enum',
            'tipo_solicitacao_enum',
            'origem_solicitacao_enum',
            'resultado_avaliacao_enum',
            'tipo_avaliacao_enum',
            'periodicidade_entrega_enum',
            'tipo_urna_funeraria_enum',
            'integracao_tipo_enum',
            'tipo_moradia_enum',
            'tipo_papel_enum',
            'tipo_documento_enum',
            'nivel_alerta_enum',
            'categoria_metrica_enum',
            'tipo_metrica_enum',
            'metodo_pagamento_enum',
            'status_pagamento_enum',
            'metodo_confirmacao_enum',
            'status_pendencia_enum',
            'periodicidade_enum',
            'situacao_trabalho_enum',
            'parentesco_enum',
            'escolaridade_enum',
            'sexo_enum',
            'status_unidade_enum',
            'tipo_unidade_enum',
            'tipo_beneficio_enum',
            'status_solicitacao_enum'
        ];

        for (const enumName of enumsToRemove) {
            await queryRunner.query(`DROP TYPE IF EXISTS "${enumName}" CASCADE;`);
        }
    }
}