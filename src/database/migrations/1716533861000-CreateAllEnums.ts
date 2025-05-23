import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAllEnums1716533861000 implements MigrationInterface {
    name = 'CreateAllEnums1716533861000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Criar todos os enums necessários baseados nas entities
        // NOTA: O enum 'role' foi removido e será substituído por uma tabela

        // Enum para status de solicitação
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "status_solicitacao_enum" AS ENUM (
                'PENDENTE', 'EM_ANALISE', 'APROVADO', 'REJEITADO', 'CANCELADO'
            );
        `);

        // Enum para tipos de benefício
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "tipo_beneficio_enum" AS ENUM (
                'NATALIDADE', 'FUNERAL', 'ALUGUEL_SOCIAL', 'CESTA_BASICA'
            );
        `);

        // Enum para tipos de unidade
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "tipo_unidade" AS ENUM (
                'SEDE', 'FILIAL', 'REGIONAL'
            );
        `);

        // Enum para status de unidade
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "status_unidade" AS ENUM (
                'ATIVO', 'INATIVO', 'MANUTENCAO'
            );
        `);

        // Enum para sexo
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "sexo" AS ENUM (
                'MASCULINO', 'FEMININO', 'OUTRO'
            );
        `);

        // Enum para escolaridade
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "escolaridade_enum" AS ENUM (
                'ANALFABETO', 'FUNDAMENTAL_INCOMPLETO', 'FUNDAMENTAL_COMPLETO', 
                'MEDIO_INCOMPLETO', 'MEDIO_COMPLETO', 'SUPERIOR_INCOMPLETO', 
                'SUPERIOR_COMPLETO', 'POS_GRADUACAO'
            );
        `);

        // Enum para parentesco
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "parentesco" AS ENUM (
                'PAI', 'MAE', 'FILHO', 'FILHA', 'CONJUGE', 'IRMAO', 'IRMA', 'OUTRO'
            );
        `);

        // Enum para situação de trabalho
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "situacao_trabalho_enum" AS ENUM (
                'EMPREGADO', 'DESEMPREGADO', 'AUTONOMO', 'APOSENTADO', 'PENSIONISTA'
            );
        `);

        // Enum para periodicidade
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "periodicidade_enum" AS ENUM (
                'UNICA', 'MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'
            );
        `);

        // Enum para status de pendência
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "status_pendencia_enum" AS ENUM (
                'ABERTA', 'EM_RESOLUCAO', 'RESOLVIDA', 'CANCELADA'
            );
        `);

        // Enum para método de confirmação
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "metodo_confirmacao_enum" AS ENUM (
                'PRESENCIAL', 'TELEFONE', 'EMAIL', 'SMS'
            );
        `);

        // Enum para status de pagamento
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "status_pagamento_enum" AS ENUM (
                'PENDENTE', 'PROCESSANDO', 'PAGO', 'CANCELADO', 'ESTORNADO'
            );
        `);

        // Enum para método de pagamento
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "metodo_pagamento_enum" AS ENUM (
                'PIX', 'TED', 'DINHEIRO', 'CARTAO'
            );
        `);

        // Enum para tipo de métrica
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "tipo_metrica_enum" AS ENUM (
                'COUNTER', 'GAUGE', 'HISTOGRAM', 'SUMMARY'
            );
        `);

        // Enum para categoria de métrica
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "categoria_metrica_enum" AS ENUM (
                'SISTEMA', 'NEGOCIO', 'PERFORMANCE', 'SEGURANCA'
            );
        `);

        // Enum para nível de alerta
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "nivel_alerta_enum" AS ENUM (
                'INFO', 'WARNING', 'ERROR', 'CRITICAL'
            );
        `);

        // Enum para tipo de documento
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "tipo_documento" AS ENUM (
                'CPF', 'RG', 'CNH', 'PASSAPORTE', 'CERTIDAO_NASCIMENTO', 
                'CERTIDAO_CASAMENTO', 'COMPROVANTE_RESIDENCIA', 'COMPROVANTE_RENDA'
            );
        `);

        // Enum para tipo de papel
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "tipo_papel" AS ENUM (
                'TITULAR', 'DEPENDENTE', 'REPRESENTANTE_LEGAL'
            );
        `);

        // Enum para tipo de moradia
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "tipo_moradia_enum" AS ENUM (
                'PROPRIA', 'ALUGADA', 'CEDIDA', 'FINANCIADA', 'OUTROS'
            );
        `);

        // Enum para tipo de integração
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "integracao_tipo_enum" AS ENUM (
                'REST', 'SOAP', 'GRAPHQL', 'WEBHOOK'
            );
        `);

        // IMPORTANTE: Criar alias para compatibilidade
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "status_solicitacao" AS ENUM (
                'PENDENTE', 'EM_ANALISE', 'APROVADO', 'REJEITADO', 'CANCELADO'
            );
        `);

        // Enums adicionais encontrados em outras migrations
        
        // Enum para tipo de urna funerária
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "tipo_urna_funeraria_enum" AS ENUM (
                'PADRAO', 'ESPECIAL', 'LUXO', 'SUPER_LUXO', 'INFANTIL'
            );
        `);

        // Enum para periodicidade de entrega
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "periodicidade_entrega_enum" AS ENUM (
                'UNICA', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL'
            );
        `);

        // Enum para tipo de avaliação
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "tipo_avaliacao_enum" AS ENUM (
                'TECNICA', 'SOCIAL', 'FINANCEIRA', 'JURIDICA'
            );
        `);

        // Enum para resultado de avaliação
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "resultado_avaliacao_enum" AS ENUM (
                'APROVADO', 'REPROVADO', 'PENDENTE', 'EM_ANALISE'
            );
        `);

        // Enum para origem de solicitação
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "origem_solicitacao_enum" AS ENUM (
                'PRESENCIAL', 'ONLINE', 'TELEFONE', 'EMAIL', 'OFICIO'
            );
        `);

        // Enum para tipo de solicitação
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "tipo_solicitacao_enum" AS ENUM (
                'BENEFICIO', 'SERVICO', 'INFORMACAO', 'DENUNCIA', 'RECLAMACAO'
            );
        `);

        // Enum para formato de relatório
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "formato_relatorio_enum" AS ENUM (
                'PDF', 'EXCEL', 'CSV', 'HTML', 'JSON'
            );
        `);

        // Enum para tipo de relatório
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "tipo_relatorio_enum" AS ENUM (
                'GERENCIAL', 'OPERACIONAL', 'ESTATISTICO', 'FINANCEIRO', 'AUDITORIA'
            );
        `);

        // Enum para status de geração
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "status_geracao_enum" AS ENUM (
                'PENDENTE', 'EM_PROCESSAMENTO', 'CONCLUIDO', 'ERRO'
            );
        `);

        // Enum para estratégia de amostragem
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "estrategia_amostragem_enum" AS ENUM (
                'COMPLETA', 'ALEATORIA', 'INTERVALO', 'PERCENTUAL'
            );
        `);

        // Enum para tipo de agendamento
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "tipo_agendamento_enum" AS ENUM (
                'UNICO', 'RECORRENTE', 'CONDICIONAL'
            );
        `);

        // Enum para canal de notificação
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "canal_notificacao_enum" AS ENUM (
                'EMAIL', 'SMS', 'PUSH', 'WHATSAPP', 'INTERNO'
            );
        `);

        // Enum para escopo de acesso
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "escopo_acesso_enum" AS ENUM (
                'LEITURA', 'ESCRITA', 'ADMIN', 'COMPLETO'
            );
        `);

        // Enum para tipo de evento de integração
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "tipo_evento_integracao_enum" AS ENUM (
                'CRIACAO', 'ATUALIZACAO', 'EXCLUSAO', 'CONSULTA'
            );
        `);

        // Enum para motivo de aluguel social
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "motivo_aluguel_social_enum" AS ENUM (
                'DESASTRE_NATURAL', 'INCENDIO', 'DESABAMENTO', 'RISCO_ESTRUTURAL', 
                'REMOCAO_AREA_RISCO', 'VIOLENCIA_DOMESTICA', 'VULNERABILIDADE_EXTREMA'
            );
        `);

        // Enum para tipo de entrega de cesta básica
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "tipo_entrega_cesta_basica_enum" AS ENUM (
                'PRESENCIAL', 'DOMICILIAR', 'PONTO_COLETA', 'PARCEIRO'
            );
        `);

        // Enum para periodicidade de cesta básica
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "periodicidade_cesta_basica_enum" AS ENUM (
                'UNICA', 'SEMANAL', 'QUINZENAL', 'MENSAL'
            );
        `);

        // Enum para status de verificação de documento
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "status_verificacao_documento_enum" AS ENUM (
                'PENDENTE', 'EM_ANALISE', 'VERIFICADO', 'REJEITADO'
            );
        `);

        // Enum para resultado de verificação de malware
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "resultado_verificacao_malware_enum" AS ENUM (
                'SEGURO', 'SUSPEITO', 'INFECTADO', 'ERRO_VERIFICACAO'
            );
        `);

        // Enum para tipo de documento enviado
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "tipo_documento_enviado_enum" AS ENUM (
                'IDENTIFICACAO', 'COMPROVANTE', 'DECLARACAO', 'LAUDO', 'FORMULARIO'
            );
        `);

        // Enum para tipo de configuração
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "tipo_configuracao_enum" AS ENUM (
                'SISTEMA', 'MODULO', 'FUNCIONALIDADE', 'INTEGRACAO', 'NOTIFICACAO'
            );
        `);

        // Enum para visibilidade de configuração
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "visibilidade_configuracao_enum" AS ENUM (
                'PUBLICA', 'PRIVADA', 'RESTRITA', 'ADMIN'
            );
        `);

        // Enum para tipo de trabalho
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "tipo_trabalho_enum" AS ENUM (
                'CLT', 'AUTONOMO', 'SERVIDOR_PUBLICO', 'EMPRESARIO', 'INFORMAL', 'OUTRO'
            );
        `);

        // Enum para fase de requisito
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "fase_requisito_enum" AS ENUM (
                'INSCRICAO', 'ANALISE', 'APROVACAO', 'CONCESSAO'
            );
        `);

        // Enum para tipo de campo
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "tipo_campo_enum" AS ENUM (
                'TEXTO', 'NUMERO', 'DATA', 'BOOLEANO', 'SELECAO', 'MULTIPLA_ESCOLHA', 'ARQUIVO'
            );
        `);

        // Enum para tipo de operação
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "tipo_operacao" AS ENUM (
                'CRIACAO', 'LEITURA', 'ATUALIZACAO', 'EXCLUSAO', 'AUTENTICACAO'
            );
        `);

        // Enum para sexo (versão alternativa)
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "sexo_enum" AS ENUM (
                'masculino', 'feminino', 'outro'
            );
        `);

        // Enum para status ativo
        await queryRunner.query(`
            CREATE TYPE IF NOT EXISTS "status_ativo_enum" AS ENUM (
                'ativo', 'inativo'
            );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remover todos os enums na ordem inversa
        
        // Enums adicionais
        await queryRunner.query(`DROP TYPE IF EXISTS "status_ativo_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "sexo_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "tipo_operacao";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "tipo_campo_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "fase_requisito_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "tipo_trabalho_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "visibilidade_configuracao_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "tipo_configuracao_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "tipo_documento_enviado_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "resultado_verificacao_malware_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "status_verificacao_documento_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "periodicidade_cesta_basica_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "tipo_entrega_cesta_basica_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "motivo_aluguel_social_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "tipo_evento_integracao_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "escopo_acesso_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "canal_notificacao_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "tipo_agendamento_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "estrategia_amostragem_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "status_geracao_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "tipo_relatorio_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "formato_relatorio_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "tipo_solicitacao_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "origem_solicitacao_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "resultado_avaliacao_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "tipo_avaliacao_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "periodicidade_entrega_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "tipo_urna_funeraria_enum";`);
        
        // Enums originais
        await queryRunner.query(`DROP TYPE IF EXISTS "status_solicitacao";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "integracao_tipo_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "tipo_moradia_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "tipo_papel";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "tipo_documento";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "nivel_alerta_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "categoria_metrica_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "tipo_metrica_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "metodo_pagamento_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "status_pagamento_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "metodo_confirmacao_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "status_pendencia_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "periodicidade_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "situacao_trabalho_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "parentesco";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "escolaridade_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "sexo";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "status_unidade";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "tipo_unidade";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "tipo_beneficio_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "status_solicitacao_enum";`);
        
        // O enum 'role' foi removido e será substituído por uma tabela
    }
}
