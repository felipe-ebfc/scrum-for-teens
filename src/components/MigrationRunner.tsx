import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { MigrationRunner } from '../lib/migrations/migrationRunner';
import { SchemaInspector } from '../lib/migrations/schemaInspector';
import { Loader2, CheckCircle, AlertTriangle, Database } from 'lucide-react';

export function MigrationRunnerComponent() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [schemaDiff, setSchemaDiff] = useState<any>(null);

  const checkSchema = async () => {
    try {
      const differences = await SchemaInspector.compareSchemas('tasks');
      
      // Transform differences into the format expected by the UI
      const missingColumns = differences
        .filter(diff => diff.type === 'column_missing')
        .map(diff => ({
          name: diff.columnName,
          type: diff.expectedColumn?.type
        }));
      
      const typeMismatches = differences
        .filter(diff => diff.type === 'type_mismatch')
        .map(diff => ({
          column: diff.columnName,
          expected: diff.expectedColumn?.type,
          actual: diff.currentColumn?.data_type
        }));

      setSchemaDiff({
        missingColumns,
        typeMismatches,
        hasIssues: differences.length > 0
      });
    } catch (error) {
      setSchemaDiff({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const runMigrations = async () => {
    setIsRunning(true);
    try {
      const migrationResult = await MigrationRunner.syncTasksSchema();
      setResult(migrationResult);
      // Refresh schema diff after migration
      await checkSchema();
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        migrationsRun: []
      });
    } finally {
      setIsRunning(false);
    }
  };

  React.useEffect(() => {
    checkSchema();
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Migration Runner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={checkSchema} variant="outline">
              Check Schema
            </Button>
            <Button 
              onClick={runMigrations} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning && <Loader2 className="h-4 w-4 animate-spin" />}
              Run Migrations
            </Button>
          </div>

          {schemaDiff && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Schema Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {schemaDiff.error ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{schemaDiff.error}</AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div>
                      <span className="text-sm font-medium">Missing Columns: </span>
                      {schemaDiff.missingColumns?.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {schemaDiff.missingColumns.map((col: any) => (
                            <Badge key={col.name} variant="destructive">
                              {col.name} ({col.type})
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <Badge variant="secondary">None</Badge>
                      )}
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium">Type Mismatches: </span>
                      {schemaDiff.typeMismatches?.length > 0 ? (
                        <div className="space-y-1 mt-1">
                          {schemaDiff.typeMismatches.map((mismatch: any) => (
                            <Badge key={mismatch.column} variant="outline">
                              {mismatch.column}: {mismatch.expected} ≠ {mismatch.actual}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <Badge variant="secondary">None</Badge>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {result && (
            <Alert className={result.success ? 'border-green-200' : 'border-red-200'}>
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription>
                {result.success ? (
                  <>
                    Migration completed successfully!
                    {result.migrationsRun.length > 0 && (
                      <div className="mt-2">
                        <span className="font-medium">Migrations run: </span>
                        {result.migrationsRun.join(', ')}
                      </div>
                    )}
                  </>
                ) : (
                  `Migration failed: ${result.error}`
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}