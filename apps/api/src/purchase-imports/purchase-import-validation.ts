export const LINE_ISSUES = [
  'MISSING_QUANTITY',
  'MISSING_REFERENCE',
  'MISSING_DESCRIPTION',
  'MISSING_CLASSIFICATION',
  'INVALID_SALE_PRICE',
  'DUPLICATE_NEW_REFERENCE',
  'LINKED_PRODUCT_DELETED',
] as const;

export type LineIssue = (typeof LINE_ISSUES)[number];

export const MIN_NEW_PRODUCT_SALE_PRICE = 500;

export function isValidSalePrice(price: number): boolean {
  return Number.isInteger(price) && price >= MIN_NEW_PRODUCT_SALE_PRICE;
}

export interface DraftLine {
  id: string;
  lineNumber: number;
  quantity: number | null;
  reference: string | null;
  description: string | null;
  /**
   * Set when the line is linked to an existing product (exact or manual).
   * Then `newSalePrice` is an optional price CHANGE for that product;
   * otherwise it is the price the new product will be created with.
   */
  productId: string | null;
  /** The linked product was soft-deleted after the link was made. */
  linkedProductDeleted: boolean;
  newDepartmentId: string | null;
  newGroupId: string | null;
  newBrandId: string | null;
  newSalePrice: number | null;
}

export interface DraftValidation {
  issuesByLine: Map<string, LineIssue[]>;
  hasNoLines: boolean;
  readyToConfirm: boolean;
}

/**
 * One pure function shared by the detail DTO (to show what's pending) and by
 * confirm (to refuse a draft that isn't ready), so the two can never disagree.
 */
export function validateDraft(lines: DraftLine[]): DraftValidation {
  const newReferenceCounts = new Map<string, number>();
  for (const line of lines) {
    if (line.productId === null && line.reference) {
      newReferenceCounts.set(
        line.reference,
        (newReferenceCounts.get(line.reference) ?? 0) + 1,
      );
    }
  }

  const issuesByLine = new Map<string, LineIssue[]>();
  for (const line of lines) {
    const issues: LineIssue[] = [];

    if (line.quantity === null || line.quantity < 1) {
      issues.push('MISSING_QUANTITY');
    }

    if (line.productId !== null) {
      if (line.linkedProductDeleted) issues.push('LINKED_PRODUCT_DELETED');
      // Blank means "keep the product's current price"; a typed one must be valid.
      if (line.newSalePrice !== null && !isValidSalePrice(line.newSalePrice)) {
        issues.push('INVALID_SALE_PRICE');
      }
    } else {
      if (!line.reference) issues.push('MISSING_REFERENCE');
      if (!line.description) issues.push('MISSING_DESCRIPTION');
      if (!line.newDepartmentId || !line.newGroupId || !line.newBrandId) {
        issues.push('MISSING_CLASSIFICATION');
      }
      if (line.newSalePrice === null || !isValidSalePrice(line.newSalePrice)) {
        issues.push('INVALID_SALE_PRICE');
      }
      if (line.reference && (newReferenceCounts.get(line.reference) ?? 0) > 1) {
        issues.push('DUPLICATE_NEW_REFERENCE');
      }
    }

    issuesByLine.set(line.id, issues);
  }

  const hasNoLines = lines.length === 0;
  const readyToConfirm =
    !hasNoLines && [...issuesByLine.values()].every((i) => i.length === 0);

  return { issuesByLine, hasNoLines, readyToConfirm };
}
