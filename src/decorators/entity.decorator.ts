// src/decorators/entity.decorator.ts
import { metadataStorage } from '../core/metadata-storage';

export interface EntityOptions {
  sheetName: string;
}

export function Entity(options: EntityOptions): ClassDecorator {
  return (target) => {
    metadataStorage.addEntity({
      target: target,
      sheetName: options.sheetName,
    });
  };
}