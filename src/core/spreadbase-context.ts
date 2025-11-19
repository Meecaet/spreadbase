import { DbSet } from './db-set';
import { metadataStorage } from './metadata-storage';
import { UnitOfWork } from './unit-of-work';
import { SpreadsheetService } from '../services/spreadsheet-service';

/**
 * Configuration for the SpreadbaseContext.
 */
export interface ContextOptions {
  /** * The ID of the master Google Spreadsheet.
   * If provided, this takes precedence over folderId/databaseName.
   */
  spreadsheetId?: string;
  /** * The ID of the Google Drive folder where the database should live.
   * Required if spreadsheetId is not provided.
   */
  folderId?: string;
  /**
   * The name of the spreadsheet file to find or create.
   * Required if spreadsheetId is not provided.
   */
  databaseName?: string;
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

    const finalSpreadsheetId = this._resolveSpreadsheetId(options);

    // 1. Initialize the low-level service
    this.spreadsheetService = new SpreadsheetService(finalSpreadsheetId);

    // 2. Initialize the change tracker, giving it the service
    this.unitOfWork = new UnitOfWork(this.spreadsheetService);

    // 3. Dynamically create DbSet properties
    // This loop reads from the metadata we collected with decorators
    for (const entity of metadataStorage.entities) {
      // Get the entity's class name
      const className = entity.target.name;
      
      // Create the property name
      // This is a common convention, but can be configured
      const propName = `${className}s`; 

      // Create a new DbSet for this entity type
      const dbSet = new DbSet(
        entity.target as new () => any, // The entity's constructor
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

  /**
   * Synchronizes the spreadsheet schema with the entity definitions.
   * Adds missing sheets and appends missing columns to headers.
   * Does NOT delete existing data or columns.
   */
  public sync(): void {
    try {
      for (const entity of metadataStorage.entities) {
        this.spreadsheetService.syncSheetHeaders(entity.target);
      }
      Logger.log('Spreadbase: Schema sync complete.');
    } catch (e) {
      console.error('Spreadbase: Schema sync failed.', e);
      throw e;
    }
  }

  /**
   * Logic to determine the Spreadsheet ID.
   * Finds or Creates the file if necessary.
   */
  private _resolveSpreadsheetId(options: ContextOptions): string {
    // 1. Direct ID provided? Use it.
    if (options.spreadsheetId) {
      return options.spreadsheetId;
    }

    // 2. Validation for creation mode
    if (!options.folderId || !options.databaseName) {
      throw new Error('Spreadbase config error: You must provide either a "spreadsheetId" OR both "folderId" and "databaseName".');
    }

    try {
      const folder = DriveApp.getFolderById(options.folderId);
      const name = options.databaseName;

      // 3. Search for existing file in the folder
      const files = folder.getFilesByName(name);
      if (files.hasNext()) {
        const file = files.next();
        Logger.log(`Spreadbase: Connected to existing database '${name}' (${file.getId()}).`);
        return file.getId();
      }

      // 4. Create new file
      // SpreadsheetApp.create() puts it in the Root folder by default
      const newSS = SpreadsheetApp.create(name);
      const newFile = DriveApp.getFileById(newSS.getId());
      
      // Move to the target folder
      // (We use moveTo for newer runtimes, or add/remove parents for older ones)
      newFile.moveTo(folder); 
      
      Logger.log(`Spreadbase: Created new database '${name}' in folder '${folder.getName()}'.`);
      return newSS.getId();

    } catch (e: unknown) {
      if(e instanceof Error){
        throw new Error(`Spreadbase: Failed to initialize database file. ${e.message}`);
      }else{
        throw new Error(`Spreadbase: Failed to initialize database file. Unknown error`);
      }      
    }
  }
}