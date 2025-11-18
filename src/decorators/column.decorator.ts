// src/decorators/column.decorators.ts
import { metadataStorage } from '../core/metadata-storage';

export type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'json';

export interface ColumnOptions {
  type?: ColumnType;
}

export function Column(options?: ColumnOptions): PropertyDecorator {
  // 'target' is the prototype of the class, 'propertyName' is the name of the property.
  return (target: Object, propertyName: string | symbol) => {
    metadataStorage.addColumn({
      target: target,
      propertyName: propertyName.toString(),
      type: options?.type!
    });
  };
}

export interface PrimaryKeyOptions {
  autoIncrement?: boolean;
}

export function PrimaryKey(options?: PrimaryKeyOptions): PropertyDecorator {
  return (target: Object, propertyName: string | symbol) => {
    const propNameStr = propertyName.toString();
    
    // Pass the new options to the metadata storage
    metadataStorage.addPrimaryKey(target, propNameStr, options);
  };
}

/**
 * Options for defining a foreign key relationship.
 */
export interface ForeignKeyOptions {
  /** A function returning the parent entity class. */
  parent: () => new () => any;
  /** Action to perform on parent deletion. Defaults to 'RESTRICT'. */
  onDelete?: 'CASCADE' | 'RESTRICT';
}

/**
 * Decorator to mark a property as a foreign key.
 */
export function ForeignKey(options: ForeignKeyOptions): PropertyDecorator {
  return (target: Object, propertyName: string | symbol) => {
    metadataStorage.addColumn({
      target: target,
      propertyName: propertyName.toString(),
    });
  };
}