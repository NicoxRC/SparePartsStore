import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { SkipPasswordCheck } from '../common/decorators/skip-password-check.decorator';
import { JwtRefreshAuthGuard } from '../common/guards/jwt-refresh-auth.guard';
import { LocalAuthGuard } from '../common/guards/local-auth.guard';
import { User } from '../users/entities/user.entity';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { AuthResponseDto, TokenPairDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(
    @Body() _dto: LoginDto,
    @CurrentUser() user: User,
  ): Promise<AuthResponseDto> {
    return this.authService.login(user);
  }

  @Public()
  @UseGuards(JwtRefreshAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(
    @Body() _dto: RefreshTokenDto,
    @CurrentUser() user: User,
  ): Promise<TokenPairDto> {
    return this.authService.refresh(user);
  }

  @SkipPasswordCheck()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  logout(): void {}

  @SkipPasswordCheck()
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    const entity = await this.usersService.findOne(user.id);
    return UserResponseDto.fromEntity(entity);
  }

  @SkipPasswordCheck()
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TokenPairDto> {
    const updated = await this.usersService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return this.authService.refresh(updated);
  }
}
