import { supabase } from '../supabase';
import { Task } from '@/types/Task';
import { DatabaseColumn, SchemaDifference, ExpectedSchema } from './types';

export class SchemaInspector {
  // Define expected schema based on Task interface
  private static expectedSchema: ExpectedSchema = {
    tasks: {
      id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      title: { type: 'text', nullable: false },
      description: { type: 'text', nullable: true },
      status: { 
        type: 'text', 
        nullable: false, 
        default: "'todo'",
        constraint: "CHECK (status IN ('backlog', 'todo', 'doing', 'done'))"
      },
      priority: { 
        type: 'text', 
        nullable: false, 
        default: "'medium'",
        constraint: "CHECK (priority IN ('low', 'medium', 'high'))"
      },
      estimated_hours: { type: 'numeric', nullable: false, default: '0' },
      actual_hours: { type: 'numeric', nullable: false, default: '0' },
      due_date: { type: 'date', nullable: true },
      created_at: { type: 'timestamptz', nullable: false, default: 'now()' },
      updated_at: { type: 'timestamptz', nullable: false, default: 'now()' },
      subject: { type: 'text', nullable: true },
      duration: { type: 'integer', nullable: true },
      start_time: { type: 'text', nullable: true },
      completed: { type: 'boolean', nullable: true, default: 'false' },
      color: { type: 'text', nullable: true },
      day: { type: 'integer', nullable: true },
      emoji: { type: 'text', nullable: true },
      tags: { type: 'jsonb', nullable: true, default: "'[]'::jsonb" },
      archived: { type: 'boolean', nullable: true, default: 'false' },
      user_id: { type: 'uuid', nullable: true }
    }
  };

  static async getCurrentSchema(tableName: string): Promise<DatabaseColumn[]> {
    const { data, error } = await supabase.rpc('get_table_schema', {
      table_name: tableName
    });

    if (error) {
      console.error('Error fetching schema:', error);
      throw error;
    }

    return data || [];
  }

  static async compareSchemas(tableName: string): Promise<SchemaDifference[]> {
    const currentSchema = await this.getCurrentSchema(tableName);
    const expectedColumns = this.expectedSchema[tableName];
    
    if (!expectedColumns) {
      return [{ type: 'table_missing', tableName, details: `Table ${tableName} not found in expected schema` }];
    }

    const differences: SchemaDifference[] = [];
    const currentColumnMap = new Map(currentSchema.map(col => [col.column_name, col]));

    // Check for missing columns
    for (const [columnName, expectedColumn] of Object.entries(expectedColumns)) {
      const currentColumn = currentColumnMap.get(columnName);
      
      if (!currentColumn) {
        differences.push({
          type: 'column_missing',
          tableName,
          columnName,
          details: `Column ${columnName} is missing`,
          expectedColumn
        });
      } else if (this.isTypeMismatch(currentColumn, expectedColumn)) {
        differences.push({
          type: 'type_mismatch',
          tableName,
          columnName,
          details: `Type mismatch: expected ${expectedColumn.type}, got ${currentColumn.data_type}`,
          currentColumn,
          expectedColumn
        });
      }
    }

    return differences;
  }

  private static isTypeMismatch(current: DatabaseColumn, expected: any): boolean {
    // Normalize type names for comparison
    const normalizeType = (type: string) => {
      const typeMap: Record<string, string> = {
        'character varying': 'text',
        'timestamp with time zone': 'timestamptz',
        'timestamp without time zone': 'timestamp'
      };
      return typeMap[type] || type;
    };

    return normalizeType(current.data_type) !== normalizeType(expected.type);
  }

  static getExpectedSchema(): ExpectedSchema {
    return this.expectedSchema;
  }

  // Alias for backward compatibility and clearer API
  static getExpectedTaskSchema() {
    return this.expectedSchema.tasks;
  }

  // Alias for clearer API
  static async getActualSchema(tableName: string): Promise<DatabaseColumn[]> {
    return this.getCurrentSchema(tableName);
  }
}
