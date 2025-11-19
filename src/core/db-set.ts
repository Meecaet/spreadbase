import { SpreadsheetService } from '../services/spreadsheet-service';
import { UnitOfWork } from './unit-of-work';
import { metadataStorage } from './metadata-storage';

export class DbSet<T extends object> {
  private readonly entityType: new () => T;
  private readonly unitOfWork: UnitOfWork;
  private readonly spreadsheetService: SpreadsheetService;

  constructor(
    entityType: new () => T,
    unitOfWork: UnitOfWork,
    spreadsheetService: SpreadsheetService
  ) {
    this.entityType = entityType;
    this.unitOfWork = unitOfWork;
    this.spreadsheetService = spreadsheetService;
  }

  public add(entity: T): void {
    this.unitOfWork.registerNew(entity);
  }

  public update(entity: T): void {
    this.unitOfWork.registerDirty(entity);
  }

  public remove(entity: T): void {
    this.unitOfWork.registerRemoved(entity);
  }

  /**
   * Finds an entity by its primary key.
   */
  public find(id: any): T | null {
    const entity = this.spreadsheetService.findRowById<T>(this.entityType, id);
    
    if (entity) {
      this._hydrateRelations(entity);
    }
    return entity;
  }

  /**
   * Returns all entities from the sheet.
   */
  public all(): T[] {
    const entities = this.spreadsheetService.getAllRows<T>(this.entityType);
    
    for (const entity of entities) {
      this._hydrateRelations(entity);
    }
    return entities;
  }

  /**
   * Filters entities based on a predicate.
   */
  public where(predicate: (item: T) => boolean): T[] {
    const allItems = this.all();
    return allItems.filter(predicate);
  }

  /**
   * Populates navigation properties based on metadata.
   */
  private _hydrateRelations(entity: T): void {
    const meta = metadataStorage.entities.find(e => e.target === this.entityType);
    if (!meta || !meta.relations.length) return;

    // We need the Primary Key value of the current entity for 1:N lookups
    const pkProp = meta.columns.find(c => c.isPrimaryKey)?.propertyName;
    const myId = pkProp ? (entity as any)[pkProp] : null;

    for (const rel of meta.relations) {
      
      const relatedEntityClass = rel.relatedTypeFunc();
      
      if (rel.relationType === '1:1') {
        // --- One-to-One ---
        // Determine if we are the "Owner" (we hold the FK) or "Inverse"
        const isOwner = meta.columns.some(c => c.propertyName === rel.foreignKeyColumn);

        if (isOwner) {
          // Case A: Owner Side (e.g., UserProfile.userId)
          // We hold the key, so we find the related entity by ID.
          const fkValue = (entity as any)[rel.foreignKeyColumn];
          if (fkValue) {
            const related = this.spreadsheetService.findRowById(relatedEntityClass, fkValue);
            (entity as any)[rel.propertyKey] = related;
          }
        } else {
          // Case B: Inverse Side (e.g., User.profile)
          // They hold the key, so we search their sheet for our ID.
          if (myId) {
            // We use findRowsByColumn, but since it's 1:1, we take the first result
            const rows = this.spreadsheetService.findRowsByColumn(
              relatedEntityClass, 
              rel.foreignKeyColumn, 
              myId
            );
            (entity as any)[rel.propertyKey] = rows.length > 0 ? rows[0] : null;
          }
        }
      }
      else if (rel.relationType === 'N:1') {
        // --- Many-to-One ---
        // 1. Get the foreign key value from THIS entity (e.g., post.userId)
        const fkValue = (entity as any)[rel.foreignKeyColumn];
        
        if (fkValue) {
          // 2. Find the related parent by its ID
          const related = this.spreadsheetService.findRowById(relatedEntityClass, fkValue);
          // 3. Assign to the navigation property
          (entity as any)[rel.propertyKey] = related;
        }
      } 
      
      else if (rel.relationType === '1:N') {
        // --- One-to-Many ---
        // 1. Need our own ID
        if (myId) {
          // 2. Find all children where THEIR foreign key matches OUR id
          const children = this.spreadsheetService.findRowsByColumn(
            relatedEntityClass, 
            rel.foreignKeyColumn, 
            myId
          );
          // 3. Assign array to navigation property
          (entity as any)[rel.propertyKey] = children;
        }
      }      
    }
  }
}