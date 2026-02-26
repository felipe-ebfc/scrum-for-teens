export interface Migration {
  id: string;
  name: string;
  version: number;
  sql: string;
  rollback?: string;
  createdAt: Date;
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
}

export interface TableSchema {
  tableName: string;
  columns: ColumnDefinition[];
}

export interface SchemaDiff {
  missingColumns: ColumnDefinition[];
  extraColumns: string[];
  typeMismatches: Array<{
    column: string;
    expected: string;
    actual: string;
  }>;
}

export interface MigrationResult {
  success: boolean;
  error?: string;
  migrationsRun: string[];
}