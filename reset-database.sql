-- Script para resetar o banco de dados completamente
-- ATENÇÃO: Este script irá apagar TODAS as tabelas e dados!

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Desabilitar restrições de chave estrangeira temporariamente
    SET CONSTRAINTS ALL DEFERRED;
    
    -- Dropar todos os triggers
    FOR r IN (SELECT trigger_name, event_object_table 
              FROM information_schema.triggers 
              WHERE trigger_schema = 'public') 
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I CASCADE', 
                       r.trigger_name, 
                       r.event_object_table);
    END LOOP;
    
    -- Dropar todas as tabelas
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    
    -- Dropar todas as sequences
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') 
    LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
    END LOOP;
    
    -- Dropar todas as funções customizadas (exceto as que começam com pg_)
    FOR r IN (SELECT proname FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
    LOOP
        IF r.proname NOT LIKE 'pg_%' THEN
            EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || ' CASCADE';
        END IF;
    END LOOP;
    
    -- Dropar todos os tipos customizados (exceto os que começam com pg_)
    FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
    LOOP
        IF r.typname NOT LIKE 'pg_%' AND r.typname NOT LIKE '_%' THEN
            BEGIN
                EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Erro ao tentar dropar tipo %: %', r.typname, SQLERRM;
            END;
        END IF;
    END LOOP;
    
    -- Reabilitar restrições de chave estrangeira
    SET CONSTRAINTS ALL IMMEDIATE;
END $$;
