import { SetMetadata } from '@nestjs/common';
import { Permission } from '../constants/permission.constant';

export const PERMISSIONS_KEY = 'permissions';

/** Refines an already role-eligible request (see `@Roles`) to a specific
 * granular action — only enforced for `employee` users, see
 * `PermissionsGuard`. */
export const RequirePermission = (...codes: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, codes);
