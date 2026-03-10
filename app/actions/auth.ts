'use server';

import bcrypt from 'bcryptjs';

import dbConnect from '@/lib/db/mongodb';
import User from '@/lib/models/user';

export type SignupResult = { success: true } | { success: false; error: string };

export async function signUpAction(data: {
  name: string;
  email: string;
  password: string;
}): Promise<SignupResult> {
  try {
    await dbConnect();

    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      return {
        success: false,
        error: 'An account with this email already exists.',
      };
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    await User.create({
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      password: hashedPassword,
      salt,
    });

    return { success: true };
  } catch (err) {
    console.error('[signUpAction] error:', err);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}
