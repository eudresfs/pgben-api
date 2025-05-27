import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAllEnums1716533861000 implements MigrationInterface {
    name = 'CreateAllEnums1716533861000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Criar todos os enums necessários baseados nas entities
        // Usando sintaxe compatível com PostgreSQL 14

        // Enum para status de solicitação
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_solicitacao_enum" AS ENUM (
                   'RASCUNHO', 'ABERTA', 'LIBERADA', 'ARQUIVADA', 'PENDENTE', 'EM_ANALISE', 'APROVADO', 'REJEITADO', 'CANCELADO'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipos de benefício
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_beneficio_enum" AS ENUM (
                    'NATALIDADE', 'FUNERAL', 'ALUGUEL_SOCIAL', 'CESTA_BASICA'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipos de unidade
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_unidade_enum" AS ENUM (
                    'SEDE', 'FILIAL', 'REGIONAL'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para status de unidade
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_unidade_enum" AS ENUM (
                    'ATIVO', 'INATIVO', 'MANUTENCAO'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para sexo
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "sexo_enum" AS ENUM (
                    'MASCULINO', 'FEMININO', 'OUTRO'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para escolaridade
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "escolaridade_enum" AS ENUM (
                    'ANALFABETO', 'FUNDAMENTAL_INCOMPLETO', 'FUNDAMENTAL_COMPLETO', 
                    'MEDIO_INCOMPLETO', 'MEDIO_COMPLETO', 'SUPERIOR_INCOMPLETO', 
                    'SUPERIOR_COMPLETO', 'POS_GRADUACAO'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para parentesco
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "parentesco_enum" AS ENUM (
                    'PAI', 'MAE', 'FILHO', 'FILHA', 'CONJUGE', 'IRMAO', 'IRMA', 'OUTRO'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para situação de trabalho
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "situacao_trabalho_enum" AS ENUM (
                    'EMPREGADO', 'DESEMPREGADO', 'AUTONOMO', 'APOSENTADO', 'PENSIONISTA'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para periodicidade
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "periodicidade_enum" AS ENUM (
                    'UNICA', 'MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para status de pendência
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_pendencia_enum" AS ENUM (
                    'ABERTA', 'EM_RESOLUCAO', 'RESOLVIDA', 'CANCELADA'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para método de confirmação
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "metodo_confirmacao_enum" AS ENUM (
                    'PRESENCIAL', 'TELEFONE', 'EMAIL', 'SMS'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para status de pagamento
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_pagamento_enum" AS ENUM (
                    'PENDENTE', 'PROCESSANDO', 'PAGO', 'CANCELADO', 'ESTORNADO'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para método de pagamento
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "metodo_pagamento_enum" AS ENUM (
                    'PIX', 'TED', 'DINHEIRO', 'CARTAO'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de métrica
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_metrica_enum" AS ENUM (
                    'COUNTER', 'GAUGE', 'HISTOGRAM', 'SUMMARY'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para categoria de métrica
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "categoria_metrica_enum" AS ENUM (
                    'SISTEMA', 'NEGOCIO', 'PERFORMANCE', 'SEGURANCA'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para nível de alerta
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "nivel_alerta_enum" AS ENUM (
                    'INFO', 'WARNING', 'ERROR', 'CRITICAL'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de documento
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_documento_enum" AS ENUM (
                    'CPF', 'RG', 'CNH', 'PASSAPORTE', 'CERTIDAO_NASCIMENTO', 
                    'CERTIDAO_CASAMENTO', 'COMPROVANTE_RESIDENCIA', 'COMPROVANTE_RENDA'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de papel
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_papel_enum" AS ENUM (
                    'BENEFICIARIO', 'REQUERENTE', 'REPRESENTANTE_LEGAL'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de moradia
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_moradia_enum" AS ENUM (
                    'PROPRIA', 'ALUGADA', 'CEDIDA', 'FINANCIADA', 'OUTROS'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de integração
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "integracao_tipo_enum" AS ENUM (
                    'REST', 'SOAP', 'GRAPHQL', 'WEBHOOK'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de urna funerária
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_urna_funeraria_enum" AS ENUM (
                    'PADRAO', 'ESPECIAL', 'LUXO', 'SUPER_LUXO', 'INFANTIL'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para periodicidade de entrega
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "periodicidade_entrega_enum" AS ENUM (
                    'UNICA', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de avaliação
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_avaliacao_enum" AS ENUM (
                    'TECNICA', 'SOCIAL', 'FINANCEIRA', 'JURIDICA'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para resultado de avaliação
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "resultado_avaliacao_enum" AS ENUM (
                    'APROVADO', 'REPROVADO', 'PENDENTE', 'EM_ANALISE'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para origem de solicitação
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "origem_solicitacao_enum" AS ENUM (
                    'PRESENCIAL', 'ONLINE', 'TELEFONE', 'EMAIL', 'OFICIO'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de solicitação
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_solicitacao_enum" AS ENUM (
                    'BENEFICIO', 'SERVICO', 'INFORMACAO', 'DENUNCIA', 'RECLAMACAO'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para formato de relatório
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "formato_relatorio_enum" AS ENUM (
                    'PDF', 'EXCEL', 'CSV', 'HTML', 'JSON'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de relatório
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_relatorio_enum" AS ENUM (
                    'GERENCIAL', 'OPERACIONAL', 'ESTATISTICO', 'FINANCEIRO', 'AUDITORIA'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para status de geração
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_geracao_enum" AS ENUM (
                    'PENDENTE', 'EM_PROCESSAMENTO', 'CONCLUIDO', 'ERRO'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para estratégia de amostragem
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "estrategia_amostragem_enum" AS ENUM (
                    'COMPLETA', 'ALEATORIA', 'INTERVALO', 'PERCENTUAL'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de agendamento
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_agendamento_enum" AS ENUM (
                    'UNICO', 'RECORRENTE', 'CONDICIONAL'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para canal de notificação
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "canal_notificacao_enum" AS ENUM (
                    'EMAIL', 'SMS', 'PUSH', 'WHATSAPP', 'INTERNO'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de escopo
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_escopo_enum" AS ENUM (
                    'GLOBAL', 'UNIDADE', 'SETOR', 'USUARIO'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de evento de integração
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_evento_integracao_enum" AS ENUM (
                    'CRIACAO', 'ATUALIZACAO', 'EXCLUSAO', 'CONSULTA'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para motivo de aluguel social
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "motivo_aluguel_social_enum" AS ENUM (
                    'DESASTRE_NATURAL', 'INCENDIO', 'DESABAMENTO', 'RISCO_ESTRUTURAL', 
                    'REMOCAO_AREA_RISCO', 'VIOLENCIA_DOMESTICA', 'VULNERABILIDADE_EXTREMA'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de entrega de cesta básica
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_entrega_cesta_basica_enum" AS ENUM (
                    'PRESENCIAL', 'DOMICILIAR', 'PONTO_COLETA', 'PARCEIRO'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para periodicidade de cesta básica
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "periodicidade_cesta_basica_enum" AS ENUM (
                    'UNICA', 'SEMANAL', 'QUINZENAL', 'MENSAL'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para status de verificação de documento
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_verificacao_documento_enum" AS ENUM (
                    'PENDENTE', 'EM_ANALISE', 'VERIFICADO', 'REJEITADO'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para resultado de verificação de malware
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "resultado_verificacao_malware_enum" AS ENUM (
                    'SEGURO', 'SUSPEITO', 'INFECTADO', 'ERRO_VERIFICACAO'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de documento enviado
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_documento_enviado_enum" AS ENUM (
                    'IDENTIFICACAO', 'COMPROVANTE', 'DECLARACAO', 'LAUDO', 'FORMULARIO'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de configuração
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_configuracao_enum" AS ENUM (
                    'SISTEMA', 'MODULO', 'FUNCIONALIDADE', 'INTEGRACAO', 'NOTIFICACAO'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para visibilidade de configuração
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "visibilidade_configuracao_enum" AS ENUM (
                    'PUBLICA', 'PRIVADA', 'RESTRITA', 'ADMIN'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de trabalho
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_trabalho_enum" AS ENUM (
                    'CLT', 'AUTONOMO', 'SERVIDOR_PUBLICO', 'EMPRESARIO', 'INFORMAL', 'OUTRO'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para fase de requisito
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "fase_requisito_enum" AS ENUM (
                    'INSCRICAO', 'ANALISE', 'APROVACAO', 'CONCESSAO'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de campo
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_campo_enum" AS ENUM (
                    'TEXTO', 'NUMERO', 'DATA', 'BOOLEANO', 'SELECAO', 'MULTIPLA_ESCOLHA', 'ARQUIVO'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para tipo de operação
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_operacao_enum" AS ENUM (
                    'CRIACAO', 'LEITURA', 'ATUALIZACAO', 'EXCLUSAO', 'AUTENTICACAO'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para status ativo
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_ativo_enum" AS ENUM (
                    'ATIVO', 'INATIVO'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para status de usuário
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_usuario_enum" AS ENUM (
                    'ATIVO', 'INATIVO', 'SUSPENSO', 'BLOQUEADO'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para prioridade
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "prioridade_enum" AS ENUM (
                    'BAIXA', 'MEDIA', 'ALTA', 'CRITICA'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Enum para status de notificação
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_notificacao_enum" AS ENUM (
                    'PENDENTE', 'ENVIADA', 'ENTREGUE', 'LIDA', 'ERRO', 'CANCELADA'
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