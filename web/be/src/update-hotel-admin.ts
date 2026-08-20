import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { User } from './users/user.entity';
import { UserRole } from './users/user-role.enum';
import * as bcrypt from 'bcrypt';

const NEW_EMAIL = 'hoteladmin_1@gmail.com';
const NEW_PASSWORD = 'admin123';

async function run() {
  console.log('--- Updating Hotel Admin Credentials ---');
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const userRepository = dataSource.getRepository(User);

  // Find the existing hotel_admin user
  const admin = await userRepository.findOne({
    where: { role: UserRole.HOTEL_ADMIN },
  });

  if (!admin) {
    console.error('ERROR: No hotel_admin user found in the database.');
    await app.close();
    process.exit(1);
  }

  console.log(`Found hotel_admin: ID=${admin.id}, current email="${admin.email}"`);

  // Check the new email is not already taken by a different user
  const emailConflict = await userRepository.findOne({ where: { email: NEW_EMAIL } });
  if (emailConflict && emailConflict.id !== admin.id) {
    console.error(`ERROR: Email "${NEW_EMAIL}" is already used by user ID ${emailConflict.id}.`);
    await app.close();
    process.exit(1);
  }

  // Hash the new password using same bcrypt logic (salt rounds = 10)
  const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);

  // Update ONLY email and password — no other field touched
  admin.email = NEW_EMAIL;
  admin.password = hashedPassword;
  await userRepository.save(admin);

  console.log(`✓ Email updated to: ${NEW_EMAIL}`);
  console.log(`✓ Password hashed and updated.`);
  console.log(`✓ Role preserved as: ${admin.role}`);
  console.log(`✓ Hotel assignment and all other data left unchanged.`);

  // Verify: re-fetch and confirm bcrypt compare works
  const updatedAdmin = await userRepository.findOne({ where: { email: NEW_EMAIL } });
  if (!updatedAdmin) {
    console.error('ERROR: Could not re-fetch admin after update.');
    await app.close();
    process.exit(1);
  }

  const passwordValid = await bcrypt.compare(NEW_PASSWORD, updatedAdmin.password);
  if (!passwordValid) {
    console.error('ERROR: Password verification failed after update!');
    await app.close();
    process.exit(1);
  }

  console.log(`✓ Login verification passed — bcrypt compare successful.`);
  console.log('--- Update Completed Successfully ---');
  await app.close();
}

run().catch((err) => {
  console.error('Update script failed:', err);
  process.exit(1);
});
