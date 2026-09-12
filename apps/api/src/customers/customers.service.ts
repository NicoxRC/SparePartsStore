import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { isUniqueViolation } from '../common/utils/database-error.util';
import { escapeLike } from '../common/utils/escape-like.util';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';

const DUPLICATE_MESSAGE = 'A customer with this identification already exists';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
  ) {}

  async create(
    dto: CreateCustomerDto,
    createdById: string,
  ): Promise<CustomerResponseDto> {
    const existing = await this.findByIdentification(
      dto.identificationType,
      dto.identification,
    );
    if (existing) {
      throw new ConflictException(DUPLICATE_MESSAGE);
    }

    const customer = this.customersRepository.create({
      identificationType: dto.identificationType,
      identification: dto.identification,
      partyType: dto.partyType,
      companyName: dto.companyName ?? null,
      firstName: dto.firstName ?? null,
      familyName: dto.familyName ?? null,
      taxLevelCode: dto.taxLevelCode ?? null,
      regimen: dto.regimen ?? null,
      countryCode: dto.countryCode ?? undefined,
      department: dto.department ?? null,
      city: dto.city ?? null,
      addressLine: dto.addressLine ?? null,
      email: dto.email,
      phone: dto.phone ?? null,
      responsableIva: dto.responsableIva ?? false,
      createdBy: { id: createdById } as Customer['createdBy'],
      updatedBy: { id: createdById } as Customer['updatedBy'],
    });

    try {
      const saved = await this.customersRepository.save(customer);
      return CustomerResponseDto.fromEntity(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(DUPLICATE_MESSAGE);
      }
      throw error;
    }
  }

  async findAll(
    query: QueryCustomersDto,
  ): Promise<PaginatedResponseDto<CustomerResponseDto>> {
    const { page, limit, search } = query;
    const qb = this.customersRepository.createQueryBuilder('customer');

    if (search) {
      qb.andWhere(
        "(customer.identification ILIKE :search ESCAPE '\\' OR customer.companyName ILIKE :search ESCAPE '\\' OR customer.firstName ILIKE :search ESCAPE '\\' OR customer.familyName ILIKE :search ESCAPE '\\')",
        { search: `%${escapeLike(search)}%` },
      );
    }

    qb.orderBy('customer.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [customers, total] = await qb.getManyAndCount();

    return {
      data: customers.map((customer) =>
        CustomerResponseDto.fromEntity(customer),
      ),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customersRepository.findOne({
      where: { id },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }

  async update(
    id: string,
    dto: UpdateCustomerDto,
    updatedById: string,
  ): Promise<CustomerResponseDto> {
    const customer = await this.findOne(id);

    const nextIdentificationType =
      dto.identificationType ?? customer.identificationType;
    const nextIdentification = dto.identification ?? customer.identification;
    const identificationChanged =
      nextIdentificationType !== customer.identificationType ||
      nextIdentification !== customer.identification;

    if (identificationChanged) {
      const existing = await this.findByIdentification(
        nextIdentificationType,
        nextIdentification,
      );
      if (existing && existing.id !== id) {
        throw new ConflictException(DUPLICATE_MESSAGE);
      }
    }

    if (dto.identificationType !== undefined) {
      customer.identificationType = dto.identificationType;
    }
    if (dto.identification !== undefined) {
      customer.identification = dto.identification;
    }
    if (dto.partyType !== undefined) customer.partyType = dto.partyType;
    if (dto.companyName !== undefined) customer.companyName = dto.companyName;
    if (dto.firstName !== undefined) customer.firstName = dto.firstName;
    if (dto.familyName !== undefined) customer.familyName = dto.familyName;
    if (dto.taxLevelCode !== undefined) {
      customer.taxLevelCode = dto.taxLevelCode;
    }
    if (dto.regimen !== undefined) customer.regimen = dto.regimen;
    if (dto.countryCode !== undefined) customer.countryCode = dto.countryCode;
    if (dto.department !== undefined) customer.department = dto.department;
    if (dto.city !== undefined) customer.city = dto.city;
    if (dto.addressLine !== undefined) customer.addressLine = dto.addressLine;
    if (dto.email !== undefined) customer.email = dto.email;
    if (dto.phone !== undefined) customer.phone = dto.phone;
    if (dto.responsableIva !== undefined) {
      customer.responsableIva = dto.responsableIva;
    }

    customer.updatedBy = { id: updatedById } as Customer['updatedBy'];

    try {
      const saved = await this.customersRepository.save(customer);
      return CustomerResponseDto.fromEntity(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(DUPLICATE_MESSAGE);
      }
      throw error;
    }
  }

  private async findByIdentification(
    identificationType: string,
    identification: string,
  ): Promise<Customer | null> {
    return this.customersRepository.findOne({
      where: { identificationType, identification },
    });
  }
}
