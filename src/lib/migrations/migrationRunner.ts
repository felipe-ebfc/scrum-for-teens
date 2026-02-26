import { supabase } from '../supabase';
import { SchemaInspector } from './schemaInspector';
import { Migration, SchemaDifference } from './types';

export class MigrationRunner {
  static async detectMigrations(): Promise<Migration[]> {
    const migrations: Migration[] = [];
    
    try {
      // Check tasks table schema
      const tasksDifferences = await SchemaInspector.compareSchemas('tasks');
      
      for (const diff of tasksDifferences) {
        migrations.push(this.createMigrationFromDifference(diff));
      }
    } catch (error) {
      console.error('Error detecting migrations:', error);
      migrations.push({
        id: `error-${Date.now()}`,
        name: 'Schema Detection Error',
        description: `Failed to detect schema differences: ${error}`,
        sql: '-- Error occurred during schema detection',
        type: 'schema_fix'
      });
    }

    return migrations;
  }

  private static createMigrationFromDifference(diff: SchemaDifference): Migration {
    switch (diff.type) {
      case 'column_missing':
        return {
          id: `add-column-${diff.tableName}-${diff.columnName}`,
          name: `Add ${diff.columnName} to ${diff.tableName}`,
          description: `Add missing column ${diff.columnName} to ${diff.tableName} table`,
          sql: this.generateAddColumnSQL(diff.tableName, diff.columnName!, diff.expectedColumn!),
          type: 'schema_fix'
        };
      
      case 'type_mismatch':
        return {
          id: `fix-type-${diff.tableName}-${diff.columnName}`,
          name: `Fix ${diff.columnName} type in ${diff.tableName}`,
          description: `Convert ${diff.columnName} from ${diff.currentColumn?.data_type} to ${diff.expectedColumn?.type}`,
          sql: this.generateAlterColumnSQL(diff.tableName, diff.columnName!, diff.expectedColumn!),
          type: 'schema_fix'
        };
      
      default:
        return {
          id: `unknown-${Date.now()}`,
          name: 'Unknown Schema Issue',
          description: diff.details,
          sql: '-- Manual intervention required',
          type: 'schema_fix'
        };
    }
  }

  private static generateAddColumnSQL(tableName: string, columnName: string, expectedColumn: any): string {
    let sql = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${expectedColumn.type}`;
    
    if (!expectedColumn.nullable) {
      sql += ' NOT NULL';
    }
    
    if (expectedColumn.default) {
      sql += ` DEFAULT ${expectedColumn.default}`;
    }
    
    sql += ';';
    
    if (expectedColumn.constraint) {
      sql += `\nALTER TABLE ${tableName} ADD CONSTRAINT ${tableName}_${columnName}_check ${expectedColumn.constraint};`;
    }
    
    return sql;
  }

  private static generateAlterColumnSQL(tableName: string, columnName: string, expectedColumn: any): string {
    let sql = `ALTER TABLE ${tableName} ALTER COLUMN ${columnName} TYPE ${expectedColumn.type}`;
    
    // Add conversion logic for specific types
    if (expectedColumn.type === 'jsonb' && columnName === 'tags') {
      sql += ` USING CASE 
        WHEN ${columnName} IS NULL THEN '[]'::jsonb
        WHEN ${columnName}::text = '' THEN '[]'::jsonb
        ELSE to_jsonb(string_to_array(${columnName}::text, ','))
      END`;
    } else if (expectedColumn.type === 'date') {
      sql += ` USING ${columnName}::date`;
    }
    
    sql += ';';
    
    if (expectedColumn.default) {
      sql += `\nALTER TABLE ${tableName} ALTER COLUMN ${columnName} SET DEFAULT ${expectedColumn.default};`;
    }
    
    if (!expectedColumn.nullable) {
      sql += `\nALTER TABLE ${tableName} ALTER COLUMN ${columnName} SET NOT NULL;`;
    }
    
    return sql;
  }

  static async runMigration(migration: Migration): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Running migration: ${migration.name}`);
      console.log(`SQL: ${migration.sql}`);
      
      const { error } = await supabase.functions.invoke('execute-sql', {
        body: { sql: migration.sql }
      });

      if (error) {
        console.error('Migration failed:', error);
        return { success: false, error: error.message || 'Unknown error' };
      }

      console.log(`Migration completed: ${migration.name}`);
      return { success: true };
    } catch (error) {
      console.error('Migration error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async runAllMigrations(): Promise<{ success: boolean; results: Array<{ migration: Migration; success: boolean; error?: string }> }> {
    const migrations = await this.detectMigrations();
    const results = [];
    let allSuccess = true;

    for (const migration of migrations) {
      const result = await this.runMigration(migration);
      results.push({ migration, ...result });
      
      if (!result.success) {
        allSuccess = false;
      }
    }

    return { success: allSuccess, results };
  }

  // Alias for clearer API - specifically for syncing tasks schema
  static async syncTasksSchema(): Promise<{ success: boolean; migrationsRun: string[]; error?: string }> {
    try {
      const result = await this.runAllMigrations();
      return {
        success: result.success,
        migrationsRun: result.results.map(r => r.migration.name),
        error: result.success ? undefined : result.results.find(r => !r.success)?.error
      };
    } catch (error) {
      return {
        success: false,
        migrationsRun: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
