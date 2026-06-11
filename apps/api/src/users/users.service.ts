import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { isUniqueViolation } from '../common/utils/database-error.util';
import { escapeLike } from '../common/utils/escape-like.util';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async create(
    dto: CreateUserDto,
    createdById: string,
  ): Promise<UserResponseDto> {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const user = this.usersRepository.create({
      email: dto.email,
      passwordHash: await this.hashPassword(dto.password),
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      mustChangePassword: true,
      createdBy: { id: createdById } as User,
      updatedBy: { id: createdById } as User,
    });

    try {
      const saved = await this.usersRepository.save(user);
      return UserResponseDto.fromEntity(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Email already in use');
      }
      throw error;
    }
  }

  async findAll(
    query: QueryUsersDto,
  ): Promise<PaginatedResponseDto<UserResponseDto>> {
    const { page, limit, search, role, isActive } = query;
    const qb = this.usersRepository.createQueryBuilder('user');

    if (search) {
      qb.andWhere(
        "(user.email ILIKE :search ESCAPE '\\' OR user.firstName ILIKE :search ESCAPE '\\' OR user.lastName ILIKE :search ESCAPE '\\')",
        { search: `%${escapeLike(search)}%` },
      );
    }

    if (role) {
      qb.andWhere('user.role = :role', { role });
    }

    if (isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive });
    }

    qb.orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [users, total] = await qb.getManyAndCount();

    return {
      data: users.map((user) => UserResponseDto.fromEntity(user)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    updatedById: string,
  ): Promise<UserResponseDto> {
    const user = await this.findOne(id);

    if (dto.isActive === false && id === updatedById) {
      throw new BadRequestException('You cannot deactivate your own account.');
    }

    if (
      dto.role !== undefined &&
      dto.role !== UserRole.ADMIN &&
      id === updatedById &&
      user.role === UserRole.ADMIN
    ) {
      throw new BadRequestException('You cannot change your own admin role.');
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.findByEmail(dto.email);
      if (existing && existing.id !== id) {
        throw new ConflictException('Email already in use');
      }
      user.email = dto.email;
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.password) {
      user.passwordHash = await this.hashPassword(dto.password);
      user.mustChangePassword = true;
    }

    user.updatedBy = { id: updatedById } as User;

    try {
      const saved = await this.usersRepository.save(user);
      return UserResponseDto.fromEntity(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Email already in use');
      }
      throw error;
    }
  }

  async remove(id: string, requestUserId: string): Promise<void> {
    if (id === requestUserId) {
      throw new BadRequestException('You cannot delete your own account.');
    }

    const user = await this.findOne(id);
    await this.usersRepository.softRemove(user);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.usersRepository.update(id, { lastLoginAt: new Date() });
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<User> {
    const user = await this.findOne(id);

    const valid = await this.validatePassword(
      currentPassword,
      user.passwordHash,
    );
    if (!valid) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.passwordHash = await this.hashPassword(newPassword);
    user.mustChangePassword = false;
    user.updatedBy = { id } as User;

    return this.usersRepository.save(user);
  }

  async hashPassword(password: string): Promise<string> {
    const rounds = Number(
      this.configService.get<string>('BCRYPT_ROUNDS', '10'),
    );
    return bcrypt.hash(password, rounds);
  }

  async validatePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
