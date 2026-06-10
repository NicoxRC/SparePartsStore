import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../common/enums/user-role.enum';
import { User } from '../../users/entities/user.entity';
import dataSource from '../data-source';

async function seed(): Promise<void> {
  await dataSource.initialize();

  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@casarespuestos.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const firstName = process.env.SEED_ADMIN_FIRST_NAME ?? 'Admin';
  const lastName = process.env.SEED_ADMIN_LAST_NAME ?? 'User';

  const usersRepository = dataSource.getRepository(User);

  const existing = await usersRepository.findOne({ where: { email } });
  if (existing) {
    console.log(`Admin user "${email}" already exists, skipping seed.`);
    await dataSource.destroy();
    return;
  }

  const rounds = Number(process.env.BCRYPT_ROUNDS ?? '10');
  const passwordHash = await bcrypt.hash(password, rounds);

  const admin = usersRepository.create({
    email,
    passwordHash,
    firstName,
    lastName,
    role: UserRole.ADMIN,
    isActive: true,
    createdBy: null,
    updatedBy: null,
  });

  await usersRepository.save(admin);
  console.log(
    `Created admin user "${email}". Remember to change the default password.`,
  );

  await dataSource.destroy();
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
