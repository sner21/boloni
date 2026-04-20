-- 初始化多维表格引擎所需的 PostgreSQL 表结构。

-- 启用 UUID 生成函数。
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 字段类型枚举，与 Drizzle schema 和 Zod schema 保持一致。
DO $$
BEGIN
  CREATE TYPE field_type AS ENUM (
    'text',
    'number',
    'tag',
    'singleSelect',
    'multiSelect',
    'link',
    'formula',
    'aiText',
    'aiScore'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 业务表元数据。
CREATE TABLE IF NOT EXISTS tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 字段定义表，config 保存选项、关联目标表、公式 AST 和 AI 配置。
CREATE TABLE IF NOT EXISTS fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  name text NOT NULL,
  type field_type NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 同一张表中字段名称不能重复。
CREATE UNIQUE INDEX IF NOT EXISTS fields_name_table_idx ON fields(table_id, name);

-- 记录表，每条记录归属于一张业务表。
CREATE TABLE IF NOT EXISTS records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 普通单元格值表，value 使用 JSONB 保存不同字段类型的值。
CREATE TABLE IF NOT EXISTS cell_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  value jsonb NOT NULL DEFAULT 'null'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(record_id, field_id)
);

-- 关联字段关系表，独立保存跨表记录链接。
CREATE TABLE IF NOT EXISTS record_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_record_id uuid NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  source_field_id uuid NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  target_record_id uuid NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(source_record_id, source_field_id, target_record_id)
);
