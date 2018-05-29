import { SchemaTypeError } from '../errors';
import { Type } from './type';

export class MaybeType<V> extends Type<V | undefined> {
  private readonly type: Type<V>;

  constructor(type: Type<V>) {
    super();
    this.type = type;
  }

  public process(value: any, context?: string): V | undefined {
    if (value === undefined) {
      return value;
    }

    if (value === null) {
      throw new SchemaTypeError(
        `expected value to either be undefined or defined, but not [null]`,
        context
      );
    }

    return this.type.validate(value, context);
  }
}
