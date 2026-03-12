'use server';

import { signUpAction } from '@/app/actions/auth';
import { signupSchema } from '@/lib/validations/auth';

type ActionState = {
  success?: boolean;
  message?: string;
  error?: string;
} | null;

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
