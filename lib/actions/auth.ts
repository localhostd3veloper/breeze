'use server';

import { loginSchema, signupSchema } from '@/lib/validations/auth';
import { signUpAction } from '@/app/actions/auth';

type ActionState = {
  success?: boolean;
  message?: string;
  error?: string;
} | null;

export async function loginUser(prevState: ActionState, formData: FormData) {
  try {
    const data = Object.fromEntries(formData.entries());
    const validatedData = loginSchema.safeParse(data);

    if (!validatedData.success) {
      return { error: 'Invalid fields' };
    }

    // signIn is a client-side function so it cannot be called in a server action directly.
    // The LoginForm component calls signIn("credentials", ...) from the client.
    // This action is a stub to satisfy the import in login-form.tsx.
    return { success: true, message: 'Redirecting...' };
  } catch {
    return { error: 'Something went wrong. Please try again.' };
  }
}

export async function signupUser(prevState: ActionState, formData: FormData) {
  try {
    const data = Object.fromEntries(formData.entries());
    const validatedData = signupSchema.safeParse(data);

    if (!validatedData.success) {
      return {
        error: validatedData.error.issues[0]?.message ?? 'Invalid fields',
      };
    }

    const result = await signUpAction({
      name: validatedData.data.name,
      email: validatedData.data.email,
      password: validatedData.data.password,
    });

    if (!result.success) {
      return { error: result.error };
    }

    return {
      success: true,
      message: 'Account created successfully! Please log in.',
    };
  } catch {
    return { error: 'Something went wrong. Please try again.' };
  }
}
