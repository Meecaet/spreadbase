// src/core/db-set.ts

import { SpreadsheetService } from '../services/spreadsheet-service';
import { UnitOfWork } from './unit-of-work';
import { metadataStorage } from './metadata-storage'; // We need this now

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

  // ... (add and remove methods are unchanged)
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
    // FIXED: This now calls our new service method
    return this.spreadsheetService.findRowById<T>(this.entityType, id);
  }

  /**
   * Returns all entities from the sheet.
   */
  public all(): T[] {
    // FIXED: This now passes the entityType, not a string
    return this.spreadsheetService.getAllRows<T>(this.entityType);
  }

  /**
   * Filters entities based on a predicate.
   */
  public where(predicate: (item: T) => boolean): T[] {
    const allItems = this.all();
    return allItems.filter(predicate);
  }
}