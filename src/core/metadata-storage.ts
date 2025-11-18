import { PrimaryKeyOptions, ColumnType } from "../decorators/column.decorator";

export interface ColumnMetadata {
  target: Function;
  propertyName: string;
  isPrimaryKey: boolean;
  isAutoIncrement: boolean;
  type?: ColumnType
}

export interface EntityMetadata {
  target: Function;
  sheetName: string;
  columns: ColumnMetadata[];
  relations: RelationMetadata[];
}

export type RelationType = '1:1' | '1:N' | 'N:1';

export interface RelationMetadata {
  target: Function;       
  propertyKey: string;
  relationType: RelationType;
  relatedTypeFunc: () => Function;
  foreignKeyColumn: string;
}

class MetadataStorage {
  readonly entities: EntityMetadata[] = [];

  /**
   * Helper to find an entity or create a "shell" version if it doesn't exist.
   * This makes our decorators order-independent.
   */
  private findOrCreateEntity(entityConstructor: Function): EntityMetadata {
    let entity = this.entities.find(e => e.target === entityConstructor);
    if (!entity) {
      entity = {
        target: entityConstructor,
        sheetName: '', // Placeholder, will be filled by @Entity
        columns: [],
        relations: []
      };
      this.entities.push(entity);
    }
    return entity;
  }

  /**
   * Called by @Entity decorator
   */
  public addEntity(metadata: Omit<EntityMetadata, 'columns' | 'relations'>) {
    // Find the entity (it might be a shell) and update it
    const entity = this.findOrCreateEntity(metadata.target);
    entity.sheetName = metadata.sheetName;
  }

  /**
   * Called by @Column decorator
   */
  public addColumn(metadata: { target: Object; propertyName: string; type?: ColumnType}) {
    const entity = this.findOrCreateEntity(metadata.target.constructor);
    
    // Avoid adding duplicate columns
    if (!entity.columns.find(c => c.propertyName === metadata.propertyName)) {
        entity.columns.push({ 
            target: metadata.target.constructor,
            propertyName: metadata.propertyName, 
            isPrimaryKey: false,
            isAutoIncrement: false,
            type: metadata.type!
        });
    }
  }

  /**
   * Called by @PrimaryKey decorator
   */
  public addPrimaryKey(target: Object, propertyName: string, options?: PrimaryKeyOptions) {
    const entity = this.findOrCreateEntity(target.constructor);
    
    let column = entity.columns.find(c => c.propertyName === propertyName);
    const isAuto = options?.autoIncrement ?? false;

    // Check for our constraint (single column PK)
    const otherPks = entity.columns.filter(c => c.isPrimaryKey);
    if (isAuto && otherPks.length > 0) {
      throw new Error(`AutoIncrement can only be used on a single primary key. Entity ${entity.target.name} already has a primary key.`);
    }
    
    if (column) {
      // Column already exists (from @Column), just mark it as PK
      column.isPrimaryKey = true;
      column.isAutoIncrement = isAuto;
    } else {
      // Column doesn't exist (e.g., only @PrimaryKey was used)
      // Add it as a new column, already marked as PK
      entity.columns.push({
        target: target.constructor,
        propertyName: propertyName,
        isPrimaryKey: true,
        isAutoIncrement: isAuto 
      });
    }
  }

/**
 * Called by @PrimaryKey decorator
 */
  public addRelation(metadata: RelationMetadata) {
    const entity = this.findOrCreateEntity(metadata.target);
    entity.relations.push(metadata);
  }
}
  
export const metadataStorage = new MetadataStorage();