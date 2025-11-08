// src/core/spreadbase-context.ts

import { DbSet } from './db-set';
import { metadataStorage } from './metadata-storage';
import { UnitOfWork } from './unit-of-work';
import { SpreadsheetService } from '../services/spreadsheet-service';

/**
 * Configuration for the SpreadbaseContext.
 */
export interface ContextOptions {
  /** The ID of the master Google Spreadsheet to use as a database. */
  spreadsheetId: string;
  // We removed folderId for simplicity, but it can be added back later
}

export class SpreadbaseContext {
  private readonly options: ContextOptions;
  private readonly unitOfWork: UnitOfWork;
  private readonly spreadsheetService: SpreadsheetService;

  constructor(options: ContextOptions) {
    if (!options.spreadsheetId) {
      throw new Error('A spreadsheetId must be provided.');
    }
    this.options = options;

    // 1. Initialize the low-level service
    this.spreadsheetService = new SpreadsheetService(this.options.spreadsheetId);

    // 2. Initialize the change tracker, giving it the service
    this.unitOfWork = new UnitOfWork(this.spreadsheetService);

    // 3. Dynamically create DbSet properties
    // This loop reads from the metadata we collected with decorators
    for (const entity of metadataStorage.entities) {
      // Get the entity's class name (e.g., "User")
      const className = entity.target.name;
      
      // Create the property name (e.g., "Users")
      // This is a common convention, but can be configured
      const propName = `${className}s`; 

      // Create a new DbSet for this entity type
      const dbSet = new DbSet(
        entity.target as new () => any, // The entity's constructor (e.g., User)
        this.unitOfWork,
        this.spreadsheetService
      );

      // Attach the new DbSet to the context instance
      // 'this' as any allows us to add properties dynamically
      (this as any)[propName] = dbSet;
    }
  }

  /**
   * Saves all changes (inserts, updates, deletes) made in this context
   * to the Google Spreadsheet.
   */
  public SaveChanges(): void {
    try {
      // All the hard work is delegated to the UnitOfWork
      this.unitOfWork.commit();
      console.log('Spreadbase: Changes saved successfully.');
    } catch (e) {
      console.error('Spreadbase: SaveChanges failed.', e);
      // We re-throw so the user's code can handle the failure
      throw e;
    }
  }
}