-- Script para criar a tabela papel_cidadao e remover o campo tipo_cidadao da tabela cidadao

-- Criar tabela papel_cidadao se não existir
CREATE TABLE IF NOT EXISTS papel_cidadao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cidadao_id UUID NOT NULL,
    tipo_papel VARCHAR(50) NOT NULL,
    metadados JSONB DEFAULT '{}',
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    removed_at TIMESTAMP,
    CONSTRAINT fk_papel_cidadao_cidadao FOREIGN KEY (cidadao_id) REFERENCES cidadao(id) ON DELETE CASCADE,
    CONSTRAINT uk_cidadao_tipo_papel UNIQUE (cidadao_id, tipo_papel)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_papel_cidadao_cidadao_id ON papel_cidadao(cidadao_id);
CREATE INDEX IF NOT EXISTS idx_papel_cidadao_tipo_papel ON papel_cidadao(tipo_papel);
CREATE INDEX IF NOT EXISTS idx_papel_cidadao_ativo ON papel_cidadao(ativo);

-- Migrar dados existentes para a nova estrutura (se a coluna tipo_cidadao existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'cidadao' AND column_name = 'tipo_cidadao'
    ) THEN
        -- Migrar dados
        INSERT INTO papel_cidadao (cidadao_id, tipo_papel)
        SELECT id, tipo_cidadao FROM cidadao WHERE tipo_cidadao IS NOT NULL;
        
        -- Remover a coluna tipo_cidadao
        ALTER TABLE cidadao DROP COLUMN tipo_cidadao;
    END IF;
END $$;

-- Garantir que a coluna ativo existe na tabela cidadao
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'cidadao' AND column_name = 'ativo'
    ) THEN
        ALTER TABLE cidadao ADD COLUMN ativo BOOLEAN DEFAULT TRUE;
    END IF;
END $$;
