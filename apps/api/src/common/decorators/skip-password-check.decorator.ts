import { SetMetadata } from '@nestjs/common';

export const SKIP_PASSWORD_CHECK_KEY = 'skipPasswordCheck';

export const SkipPasswordCheck = () =>
  SetMetadata(SKIP_PASSWORD_CHECK_KEY, true);
