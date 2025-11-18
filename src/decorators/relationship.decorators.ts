import { metadataStorage } from '../core/metadata-storage';

export interface RelationOptions {
    foreignKey: string;
}

/**
 * Defines a One-to-Many relationship
 * @param typeFunc Function returning the related Class type.
 * @param options Configuration options.
 */
export function OneToMany(typeFunc: () => Function, options: RelationOptions): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol) => {
        metadataStorage.addRelation({
            target: target.constructor,
            propertyKey: propertyKey.toString(),
            relationType: '1:N',
            relatedTypeFunc: typeFunc,
            foreignKeyColumn: options.foreignKey
        });
    };
}

/**
 * Defines a Many-to-One relationship.
 * @param typeFunc Function returning the related Class type.
 * @param options Configuration options.
 */
export function ManyToOne(typeFunc: () => Function, options: RelationOptions): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol) => {
        metadataStorage.addRelation({
            target: target.constructor,
            propertyKey: propertyKey.toString(),
            relationType: 'N:1',
            relatedTypeFunc: typeFunc,
            foreignKeyColumn: options.foreignKey
        });
    };
}