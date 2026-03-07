'use server';

import { loginSchema, signupSchema } from '@/lib/validations/auth';

export async function loginUser(prevState: any, formData: FormData) {
  try {
    const data = Object.fromEntries(formData.entries());
    const validatedData = loginSchema.safeParse(data);

    if (!validatedData.success) {
      return {
        error: 'Invalid fields',
        errors: validatedData.error.flatten().fieldErrors,
      };
    }

    // Replace with real authentication logic
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simulating successful login
    return { success: true, message: 'Logged in successfully' };
  } catch (error) {
    return { error: 'Something went wrong. Please try again.' };
  }
}

export async function signupUser(prevState: any, formData: FormData) {
  try {
    const data = Object.fromEntries(formData.entries());
    const validatedData = signupSchema.safeParse(data);

    if (!validatedData.success) {
      return {
        error: 'Invalid fields',
        errors: validatedData.error.flatten().fieldErrors,
      };
    }

    // Replace with real user creation logic
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simulating successful signup
    return { success: true, message: 'Account created successfully' };
  } catch (error) {
    return { error: 'Something went wrong. Please try again.' };
  }
}
