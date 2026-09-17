import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn } from 'class-validator';
import {
  PERMISSIONS,
  Permission,
} from '../../common/constants/permission.constant';

/** Full replace, same convention as PATCH /quotations/:id/items — the
 * caller always sends the complete desired set, not a diff. */
export class UpdatePermissionsDto {
  @ApiProperty({ type: [String], enum: PERMISSIONS })
  @IsArray()
  @IsIn(PERMISSIONS, { each: true })
  permissions: Permission[];
}
