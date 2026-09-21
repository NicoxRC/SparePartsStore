import { BadRequestException } from '@nestjs/common';

/**
 * A sale/quotation line is EITHER a catalog product (`productId`) OR a
 * one-off line typed on the document (`description` + `customUnitPrice`) —
 * never both, and a one-off line needs both of its fields. Shared by
 * invoices and quotations, which accept the same two kinds of line.
 */
export function assertLineKind(line: {
  productId?: string;
  description?: string;
  customUnitPrice?: number;
}): void {
  const hasCustomFields =
    line.description !== undefined || line.customUnitPrice !== undefined;

  if (line.productId && hasCustomFields) {
    throw new BadRequestException(
      'Una línea es de un producto del catálogo o es una línea libre, no las dos cosas.',
    );
  }
  if (
    !line.productId &&
    (!line.description || line.customUnitPrice === undefined)
  ) {
    throw new BadRequestException(
      'Una línea libre necesita descripción y precio.',
    );
  }
}
