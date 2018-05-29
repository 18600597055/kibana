import { schema, TypeOf } from '../../config/schema';

import { LogRecord } from '../log_record';
import { Layout } from './layouts';

const { literal, object } = schema;

const jsonLayoutSchema = object({
  kind: literal('json'),
});

/** @internal */
export type JsonLayoutConfigType = TypeOf<typeof jsonLayoutSchema>;

/**
 * Layout that just converts `LogRecord` into JSON string.
 * @internal
 */
export class JsonLayout implements Layout {
  public static configSchema = jsonLayoutSchema;

  public format(record: LogRecord): string {
    return JSON.stringify({
      '@timestamp': record.timestamp.toISOString(),
      context: record.context,
      error: JsonLayout.errorToSerializableObject(record.error),
      level: record.level.id.toUpperCase(),
      message: record.message,
      meta: record.meta,
    });
  }

  private static errorToSerializableObject(error: Error | undefined) {
    if (error === undefined) {
      return error;
    }

    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }
}
