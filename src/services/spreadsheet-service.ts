import { metadataStorage, EntityMetadata } from '../core/metadata-storage';

// This is a type alias for the global GAS object
// This gives us type safety and intellisense in VS Code
// You'll need to install the types: @types/google-apps-script
type Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;
type Sheet = GoogleAppsScript.Spreadsheet.Sheet;

export class SpreadsheetService {
  private readonly spreadsheetId: string;
  private spreadsheet: Spreadsheet | null;

  constructor(spreadsheetId: string) {
    this.spreadsheetId = spreadsheetId;
    this.spreadsheet = null;
  }

  /**
   * Lazily opens and returns the Google Spreadsheet file.
   */
  private getSpreadsheet(): Spreadsheet {
    if (!this.spreadsheet) {
      try {
        this.spreadsheet = SpreadsheetApp.openById(this.spreadsheetId);
      } catch (e: unknown) {
        if(e instanceof Error){
          throw new Error(`Failed to open spreadsheet with ID ${this.spreadsheetId}. Error: ${e.message}`);
        }        
      }
    }
    return this.spreadsheet!;
  }

  /**
   * Gets a specific sheet (tab) by name, creating it if it doesn't exist.
   */
  private getSheet(sheetName: string): Sheet {
    const ss = this.getSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    return sheet;
  }

  /**
   * Creates the header row in a sheet based on entity metadata.
   * e.g., | id | name | email |
   */
  private createHeader(sheet: Sheet, columns: string[]): void {
    const range = sheet.getRange(1, 1, 1, columns.length);
    range.setValues([columns]);
    range.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  /**
   * Creates a mapping of { columnName: columnIndex } from a sheet's header row.
   * e.g., { id: 0, name: 1, email: 2 }
   */
  private getHeaderMap(sheet: Sheet): { [key: string]: number } {
    const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const map: { [key: string]: number } = {};
    headerRow!.forEach((columnName: string, index: number) => {
      map[columnName] = index;
    });
    return map;
  }

  /**
   * Fetches all data rows from a sheet and maps them to entities.
   */
  public getAllRows<T extends object>(entityType: Function): T[] {
    const meta = metadataStorage.entities.find(e => e.target === entityType);
    if (!meta) {
      throw new Error(`No metadata found for entity ${entityType.name}`);
    }

    const sheet = this.getSheet(meta.sheetName);
    const dataRange = sheet.getDataRange();
    
    // If sheet is empty (or just a header), return empty array
    if (dataRange.getNumRows() <= 1) {
      return [];
    }
    
    // Get all values *except* the header row
    const values = dataRange.offset(1, 0, dataRange.getNumRows() - 1).getValues();
    const headerMap = this.getHeaderMap(sheet);

    return values.map(row => this._mapRowToEntity<T>(entityType, row, headerMap));
  }
  
/**
   * Finds a single row by its Primary Key.
   * NOTE: This is an inefficient scan. It will be replaced by an index lookup.
   */
  public findRowById<T extends object>(entityType: Function, id: any): T | null {
    const meta = metadataStorage.entities.find(e => e.target === entityType);
    if (!meta) {
      throw new Error(`No metadata found for entity ${entityType.name}`);
    }

    const pkColumns = meta.columns
      .filter(c => c.isPrimaryKey)
      .map(c => c.propertyName);
      
    if (pkColumns.length === 0) {
      throw new Error(`Entity ${meta.target.name} has no primary key defined.`);
    }

    const sheet = this.getSheet(meta.sheetName);
    if (sheet.getLastRow() <= 1) {
      return null; // Sheet is empty or just has a header
    }

    const headerMap = this.getHeaderMap(sheet);

    if (pkColumns.length === 1) {
      const pkColName = pkColumns[0];
      const pkColIndex = headerMap[pkColName!];
      
      if (pkColIndex === undefined) {
        throw new Error(`Primary key column "${pkColName}" not found in sheet.`);
      }

      // Get the range for *only* the PK column
      const pkColumnRange = sheet.getRange(
        2,                // Start at row 2 (skip header)
        pkColIndex + 1,   // Column index (1-based)
        sheet.getLastRow() - 1 // Number of rows to search
      );

      // Use TextFinder to find the ID
      const finder = pkColumnRange
        .createTextFinder(id.toString()) // Find the ID (as a string)
        .matchEntireCell(true);          // Must match the whole cell

      const foundRange = finder.findNext();
      
      if (foundRange) {
        // We found the cell. Now get its entire row.
        const rowNum = foundRange.getRow();
        const rowValues = sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).getValues()[0];
        
        // Use our new helper to map it
        return this._mapRowToEntity<T>(entityType, rowValues!, headerMap);
      }
      
      return null; // Not found

    } else {
      // --- FALLBACK LOGIC (Composite PK) ---
      // This is the old, slow scan for composite keys.
      const allValues = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

      for (const row of allValues) {
        const isMatch = pkColumns.every(pkColName => {
          const colIndex = headerMap[pkColName];
          return row[colIndex!] == id[pkColName]; // 'id' must be an object
        });

        if (isMatch) {
          return this._mapRowToEntity<T>(entityType, row, headerMap);
        }
      }

      return null; // Not found
    }
  }

  /**
   * Finds all rows where a specific column matches a value.
   * Used for loading 1:N relationships.
   */
  public findRowsByColumn<T extends object>(
    entityType: Function, 
    columnName: string, 
    value: any
  ): T[] {
    const meta = metadataStorage.entities.find(e => e.target === entityType);
    if (!meta) throw new Error(`No metadata for ${entityType.name}`);

    const sheet = this.getSheet(meta.sheetName);
    if (sheet.getLastRow() <= 1) return [];

    const headerMap = this.getHeaderMap(sheet);
    const colIndex = headerMap[columnName];

    if (colIndex === undefined) {
      throw new Error(`Column '${columnName}' not found on entity '${meta.target.name}'`);
    }

    // TODO: OPTIMIZATION - Use TextFinder here for faster lookups (similar to findRowById)
    // For now, we'll use the simpler scan to ensure correctness first.
    const allValues = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

    const matchingRows = allValues.filter(row => {
      // Loose equality (==) handles number vs string issues common in Sheets
      return row[colIndex] == value; 
    });

    return matchingRows.map(row => this._mapRowToEntity<T>(entityType, row, headerMap));
  }

  /**
   * Inserts new entities into the spreadsheet.
   */
  public insertRows<T extends object>(entityType: Function, entities: T[]): void {
    const meta = metadataStorage.entities.find(e => e.target === entityType);
    if (!meta) throw new Error(`No metadata found for ${entityType.name}`);
    if (entities.length === 0) return; // Nothing to insert

    // 1. Assign auto-incrementing keys *before* doing anything else
    this._assignAutoIncrementingKeys(meta, entities);

    const sheet = this.getSheet(meta.sheetName);

    // Ensure header exists if sheet is new
    if (sheet.getLastRow() === 0) {
      const columnNames = meta.columns.map(c => c.propertyName);
      this.createHeader(sheet, columnNames);
    }

    const headerMap = this.getHeaderMap(sheet);
      
    // 2. Get the map of all existing PKs in the sheet.
    // We only need the map, not all the values.
    const { pkRowMap } = this._buildPkRowMap(sheet, meta, headerMap);

    const pkColumns = meta.columns
      .filter(c => c.isPrimaryKey)
      .map(c => c.propertyName);
    
    const duplicates: any[] = [];

    // 3. Check each new entity's PK against the existing map
    for (const entity of entities) {
      let entityPkValue: any;
      if (pkColumns.length === 1) {
        entityPkValue = (entity as any)[pkColumns[0]!];
      } else {
        entityPkValue = pkColumns.map(colName => (entity as any)[colName]).join('::');
      }

      // If the map *has* this key, it's a duplicate.
      if (pkRowMap.has(entityPkValue)) {
        duplicates.push(entityPkValue);
      }
    }

    // 4. If any duplicates were found, throw an error and stop.
    if (duplicates.length > 0) {
      throw new Error(`Primary Key Constraint Violation: The following key(s) already exist: ${duplicates.join(', ')}`);
    }
    
    // 5. If we're here, no duplicates were found. Proceed with insertion.
    
    const newRows: any[][] = [];
    
    for (const entity of entities) {
      const row = this._mapEntityToRow(entity, meta, headerMap);
      newRows.push(row);
    }

    if (newRows.length > 0) {
      sheet.getRange(
        sheet.getLastRow() + 1,
        1,
        newRows.length,
        newRows[0]!.length
      ).setValues(newRows);
    }
  }
  
  public updateRows<T extends object>(entityType: Function, entities: T[]): void {
    const meta = metadataStorage.entities.find(e => e.target === entityType);
    if (!meta) throw new Error(`No metadata found for ${entityType.name}`);
    if (entities.length === 0) return;

    const sheet = this.getSheet(meta.sheetName);
    const headerMap = this.getHeaderMap(sheet);
    
    const { pkRowMap, allValues } = this._buildPkRowMap(sheet, meta, headerMap);

    const pkColumns = meta.columns
      .filter(c => c.isPrimaryKey)
      .map(c => c.propertyName);
      
    // Create a set of PK column names for fast lookup
    const pkColumnSet = new Set(pkColumns);
    
    // Get ALL column names
    const allColumnNames = meta.columns.map(c => c.propertyName);

    for (const entity of entities) {
      let entityPkValue: any;
      if (pkColumns.length === 1) {
        entityPkValue = (entity as any)[pkColumns[0]!];
      } else {
        entityPkValue = pkColumns.map(colName => (entity as any)[colName]).join('::');
      }

      const rowNumber = pkRowMap.get(entityPkValue);
      
      if (rowNumber !== undefined) {
        // We found the row. Overwrite its values,
        // but ONLY for non-primary-key columns.
        const arrayIndexToUpdate = rowNumber - 1; 
        
        const serializedEntityRow = this._mapEntityToRow(entity, meta, headerMap);

        // Get the existing row to preserve data not in the entity (if any)
        const existingRow = allValues[arrayIndexToUpdate];
        const newRow = [...existingRow!];
        
        for (const colName of allColumnNames) {
          // If it's NOT a primary key, update its value
          if (!pkColumnSet.has(colName)) {
            const colIndex = headerMap[colName];
            if (colIndex !== undefined) {
              newRow[colIndex] = serializedEntityRow[colIndex];
            }
          }
        }
        allValues[arrayIndexToUpdate] = newRow;
      } else {
        // The PK was not found. This means the user changed it.
        // We MUST throw an error.
        throw new Error(`Update failed: Cannot find entity with Primary Key '${entityPkValue}'. Modifying primary keys is not allowed.`);
      }
    }

    // Write all data back
    sheet.getDataRange().setValues(allValues);
  }

  public deleteRows<T extends object>(entityType: Function, entities: T[]): void {
    const meta = metadataStorage.entities.find(e => e.target === entityType);
    if (!meta) throw new Error(`No metadata found for ${entityType.name}`);
    if (entities.length === 0) return;

    const sheet = this.getSheet(meta.sheetName);
    const headerMap = this.getHeaderMap(sheet);

    // 1. Get the map from our new helper (we don't need allValues here)
    const { pkRowMap } = this._buildPkRowMap(sheet, meta, headerMap);

    const pkColumns = meta.columns
      .filter(c => c.isPrimaryKey)
      .map(c => c.propertyName);

    // 2. Collect all row numbers that need to be deleted
    const rowsToDelete: number[] = [];
    for (const entity of entities) {
      let entityPkValue: any;
      if (pkColumns.length === 1) {
        entityPkValue = (entity as any)[pkColumns[0]!];
      } else {
        entityPkValue = pkColumns.map(colName => (entity as any)[colName]).join('::');
      }

      const rowNumber = pkRowMap.get(entityPkValue);
      
      if (rowNumber !== undefined) {
        rowsToDelete.push(rowNumber);
      } else {
        console.warn(`Spreadbase: Could not find entity with PK ${entityPkValue} to delete.`);
      }
    }

    // 3. Sort and delete
    rowsToDelete.sort((a, b) => b - a);

    for (const rowNum of rowsToDelete) {
      sheet.deleteRow(rowNum);
    }
  }

  /**
   * Reads the entire sheet and builds a map of {PK -> 1-based row number}.
   * Returns the map and all the values read from the sheet.
   */
  private _buildPkRowMap(
    sheet: GoogleAppsScript.Spreadsheet.Sheet, 
    meta: EntityMetadata, 
    headerMap: { [key: string]: number }
  ): { pkRowMap: Map<any, number>, allValues: any[][] } {
    
    // 1. Find the primary key column(s)
    const pkColumns = meta.columns
      .filter(c => c.isPrimaryKey)
      .map(c => c.propertyName);
      
    if (pkColumns.length === 0) {
      throw new Error(`Entity ${meta.target.name} has no primary key defined.`);
    }

    const pkIndices = pkColumns.map(colName => headerMap[colName]);

    // 2. Read all data
    const allValues = sheet.getDataRange().getValues();
    const pkRowMap = new Map<any, number>();

    // 3. Build the map
    // Start at i = 1 to skip the header row
    for (let i = 1; i < allValues.length; i++) {
      const row = allValues[i];
      let pkValue: any;
      
      if (pkIndices.length === 1) {
        pkValue = row![pkIndices[0]!];
      } else {
        pkValue = pkIndices.map(index => row![index!]).join('::');
      }
      
      // Map the PK to its 1-based spreadsheet row number
      pkRowMap.set(pkValue, i + 1); 
    }

    return { pkRowMap, allValues };
  }

  /**
   * Helper function to map a single row of values to an entity object.
   */
  private _mapRowToEntity<T extends object>(
    entityType: Function, 
    rowValues: any[], 
    headerMap: { [key: string]: number }
  ): T {
    const meta = metadataStorage.entities.find(e => e.target === entityType);
    if (!meta) throw new Error(`No metadata found for ${entityType.name}`);

    const entity = new (entityType as any)();

    for (const col of meta.columns) {
      const colIndex = headerMap[col.propertyName];
      if (colIndex !== undefined) {
        let value = rowValues[colIndex];

        // --- Deserialization Logic ---
        if (value !== '' && value !== null && value !== undefined) {
          if (col.type === 'json') {
            try {
              // If it's already an object (rare in Sheets, but possible via script), leave it.
              // Otherwise, parse string.
              value = (typeof value === 'string') ? JSON.parse(value) : value;
            } catch (e) {
              console.warn(`Spreadbase: Failed to parse JSON for column ${col.propertyName}`, e);
              value = null;
            }
          } else if (col.type === 'date') {
            // Sheets usually returns a Date object, but sometimes a string or number
            if (!(value instanceof Date)) {
              value = new Date(value);
            }
          }
        }

        (entity as any)[col.propertyName] = value;
      }
    }
    return entity;
  }

  /**
   * Helper: Converts a typed Entity into a raw sheet row array.
   * Handles JSON stringification.
   */
  private _mapEntityToRow(
    entity: object, 
    meta: EntityMetadata, 
    headerMap: { [key: string]: number }
  ): any[] {
    const row = new Array(Object.keys(headerMap).length);
    
    for (const colName in headerMap) {
      const colIndex = headerMap[colName];
      const colMeta = meta.columns.find(c => c.propertyName === colName);
      let value = (entity as any)[colName];

      // --- Serialization Logic ---
      if (value !== null && value !== undefined) {
        if (colMeta?.type === 'json') {
          value = JSON.stringify(value);
        } 
      }
      // ---------------------------

      row[colIndex!] = value;
    }
    return row;
  }

  /**
   * Handles auto-incrementing logic for entities.
   */
  private _assignAutoIncrementingKeys(meta: EntityMetadata, entities: object[]): void {
    const autoIncrementColumn = meta.columns.find(c => c.isAutoIncrement);
    
    // If no auto-increment column, do nothing.
    if (!autoIncrementColumn) {
      return;
    }
    
    // Get a document-level lock to prevent race conditions
    const lock = LockService.getDocumentLock();
    try {
      lock.waitLock(10000); // Wait 10s for lock, then fail
      
      const properties = PropertiesService.getDocumentProperties();
      const propertyKey = `SPREADBASE_LAST_ID_${meta.sheetName}`;
      
      let lastId = parseInt(properties.getProperty(propertyKey) || '0', 10);
      
      for (const entity of entities) {
        // Only assign an ID if the user hasn't set one (e.g., ID is 0, null, or undefined)
        if (!(entity as any)[autoIncrementColumn.propertyName]) {
          lastId++;
          (entity as any)[autoIncrementColumn.propertyName] = lastId;
        }
      }
      
      // Save the new lastId back to the properties
      properties.setProperty(propertyKey, lastId.toString());
      
    } catch (e: any) {
      throw new Error(`Could not get document lock to assign auto-incrementing ID. ${e.message}`);
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Checks the sheet headers against the entity metadata.
   * Appends any missing columns to the right side of the header row.
   */
  public syncSheetHeaders(entityType: Function): void {
    const meta = metadataStorage.entities.find(e => e.target === entityType);
    if (!meta) throw new Error(`No metadata found for ${entityType.name}`);

    const sheet = this.getSheet(meta.sheetName);
    
    // Case 1: New Sheet (Empty)
    if (sheet.getLastRow() === 0) {
      const columnNames = meta.columns.map(c => c.propertyName);
      this.createHeader(sheet, columnNames);
      return;
    }

    // Case 2: Existing Sheet - Check for missing columns
    const lastCol = sheet.getLastColumn();
    
    // Read existing headers
    // If lastCol is 0 (sheet exists but is empty), handled by Case 1 or safe to assume empty
    if (lastCol === 0) return; 

    const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0] as string[];
    const currentHeaderSet = new Set(currentHeaders);

    // Find which columns from metadata are missing in the sheet
    const missingColumns = meta.columns
      .map(c => c.propertyName)
      .filter(propName => !currentHeaderSet.has(propName));

    if (missingColumns.length > 0) {
      // Append missing columns to the right
      const startCol = lastCol + 1;
      const range = sheet.getRange(1, startCol, 1, missingColumns.length);
      
      range.setValues([missingColumns]);
      range.setFontWeight('bold');
      
      Logger.log(`Spreadbase: Synced schema for '${meta.sheetName}'. Added columns: ${missingColumns.join(', ')}`);
    }
  }
}