const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB...');

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'eazydonprints@gmail.com';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Eazy1122#';

    // Check if Super Admin already exists
    const existingAdmin = await User.findOne({ email: superAdminEmail });

    if (existingAdmin) {
      console.log(`Super Admin already exists with email: ${superAdminEmail}`);
      // Ensure role is superadmin and account is active
      existingAdmin.role = 'superadmin';
      existingAdmin.accountStatus = 'active';
      await existingAdmin.save();
      console.log('Verified superadmin role and active status on existing user.');
      process.exit(0);
    }

    // Create Super Admin User (Pass plain text password; let the schema pre-save hook handle hashing)
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: superAdminEmail,
      password: superAdminPassword, // Plain text; User.js pre-save hook will hash it automatically
      role: 'superadmin',
      accountStatus: 'active',
      usage: {
        maxScans: 999999,
        maxPhotos: 999999,
      },
    });

    console.log('--------------------------------------------------');
    console.log('Super Admin Created Successfully!');
    console.log(`Email:    ${superAdmin.email}`);
    console.log(`Password: ${superAdminPassword}`);
    console.log('Role:     superadmin');
    console.log('--------------------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding Super Admin:', error.message);
    process.exit(1);
  }
};

seedSuperAdmin();