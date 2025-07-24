import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';
dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log(' Admin déjà existant');
      process.exit();
    }

    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

    await User.create({
      username: 'Admin Farah',
      email: process.env.ADMIN_EMAIL,
      password: hashedPassword,
      role: 'admin',
      cbu: 'admin'
    });

    console.log('✅ Admin créé avec succès');
    process.exit();
  } catch (err) {
    console.error('Erreur création admin:', err);
    process.exit(1);
  }
};

createAdmin();
