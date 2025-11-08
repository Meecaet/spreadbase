import { SpreadsheetService } from '../services/spreadsheet-service';

// We'll use Map to group entities by their type (their constructor function)
// e.g., { User => [user1, user2], Post => [post1] }
type EntityMap = Map<Function, object[]>;

export class UnitOfWork {
  private readonly newEntities: EntityMap = new Map();
  private readonly dirtyEntities: EntityMap = new Map();
  private readonly removedEntities: EntityMap = new Map();

  private spreadsheetService: SpreadsheetService;

  constructor(spreadsheetService: SpreadsheetService) {
    this.spreadsheetService = spreadsheetService;
  }

  /**
   * Registers a new entity to be inserted on commit.
   */
  public registerNew<T extends object>(entity: T): void {
    const entityType = entity.constructor;
    this.addToList(this.newEntities, entityType, entity);
  }

  /**
   * Registers an existing entity as modified (to be updated on commit).
   */
  public registerDirty<T extends object>(entity: T): void {
    const entityType = entity.constructor;
    // Avoid marking a 'new' entity as 'dirty'
    if (this.isRegistered(this.newEntities, entity)) return;
    
    this.addToList(this.dirtyEntities, entityType, entity);
  }

  /**
   * Registers an existing entity to be deleted on commit.
   */
  public registerRemoved<T extends object>(entity: T): void {
    const entityType = entity.constructor;
    
    // If it was registered as 'new', just remove it from that list
    if (this.isRegistered(this.newEntities, entity)) {
      this.removeFromList(this.newEntities, entityType, entity);
      return;
    }
    
    // If it was 'dirty', remove it from that list
    if (this.isRegistered(this.dirtyEntities, entity)) {
      this.removeFromList(this.dirtyEntities, entityType, entity);
    }
    
    this.addToList(this.removedEntities, entityType, entity);
  }

  /**
   * Executes all pending changes (inserts, updates, deletes)
   * via the SpreadsheetService.
   */
  public commit(): void {
    // TODO: Implement transaction logic (all or nothing)
    try {
      // 1. Deletions
      for (const [entityType, entities] of this.removedEntities.entries()) {
        this.spreadsheetService.deleteRows(entityType, entities);
      }
      
      // 2. Updates
      for (const [entityType, entities] of this.dirtyEntities.entries()) {
        this.spreadsheetService.updateRows(entityType, entities);
      }

      // 3. Insertions
      for (const [entityType, entities] of this.newEntities.entries()) {
        this.spreadsheetService.insertRows(entityType, entities);
      }

      // If all succeeds, clear the lists
      this.clear();
      
    } catch (e: unknown) {
      // If anything fails, we should ideally roll back
      // For now, we'll just log the error and not clear the lists

      if(e instanceof Error){
        console.error("Spreadbase: Failed to commit changes.", e);
        throw new Error(`Commit failed: ${e.message}`);
      }      
    }
  }

  /**
   * Clears all change tracking lists.
   */
  private clear(): void {
    this.newEntities.clear();
    this.dirtyEntities.clear();
    this.removedEntities.clear();
  }

  // --- Helper Methods ---

  private addToList(map: EntityMap, type: Function, entity: object): void {
    if (!map.has(type)) {
      map.set(type, []);
    }
    const list = map.get(type);
    if (list != undefined && !list.includes(entity)) {
      list.push(entity);
    }
  }
  
  private removeFromList(map: EntityMap, type: Function, entity: object): void {
    if (!map.has(type)) return;
    const list = map.get(type);

    if(list != undefined){
        const index = list.indexOf(entity);
        
        if (index > -1) {
          list.splice(index, 1);
        }
    }
    
    
  }
  
  private isRegistered(map: EntityMap, entity: object): boolean {
    const list = map.get(entity.constructor);
    return list ? list.includes(entity) : false;
  }
}