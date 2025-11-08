// src/decorators/relationship.decorators.ts

/**
 * Decorator for a one-to-many relationship (navigation property).
 * Example: A User has many Posts. This goes on the User.posts property.
 * * @param typeFunction - A function that returns the related entity class.
 */
export function OneToMany(typeFunction: () => new () => any): PropertyDecorator {
    return (target, propertyKey) => {
        // Metadata storage will go here.
    };
}

/**
 * Decorator for a many-to-one relationship (navigation property).
 * Example: A Post belongs to one User. This goes on the Post.user property.
 * * @param typeFunction - A function that returns the related entity class.
 */
export function ManyToOne(typeFunction: () => new () => any): PropertyDecorator {
    return (target, propertyKey) => {
        // Metadata storage will go here.
    };
}