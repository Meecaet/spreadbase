// This MUST be imported once for the decorators to work.
import 'reflect-metadata';

// --- Public API Exports ---
// The main context
export { SpreadbaseContext } from './core/spreadbase-context';
export type { ContextOptions } from './core/spreadbase-context';

// Entity decorators
export { Entity } from './decorators/entity.decorator';
export type { EntityOptions } from './decorators/entity.decorator';

// Column & Key decorators
export {
    Column, PrimaryKey,
    ForeignKey
} from './decorators/column.decorator';

export type { ColumnOptions, ForeignKeyOptions } from './decorators/column.decorator';

// Relationship decorators
export { OneToOne, OneToMany, ManyToOne } from './decorators/relationship.decorators';

export type { RelationOptions } from './decorators/relationship.decorators';

// We do NOT export internal classes like UnitOfWork, SpreadsheetService, etc.