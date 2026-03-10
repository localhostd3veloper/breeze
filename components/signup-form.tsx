'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ComponentProps, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { signupUser } from '@/lib/actions/auth';
import { cn } from '@/lib/utils';
import { type SignupInput, signupSchema } from '@/lib/validations/auth';

export function SignupForm({ className, ...props }: ComponentProps<'div'>) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: SignupInput) => {
    setError(null);
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('email', data.email);
    formData.append('password', data.password);
    formData.append('confirmPassword', data.confirmPassword);

    const result = await signupUser(null, formData);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      // Redirect to login after a short delay
      setTimeout(() => router.push('/login'), 1500);
    }
  };

  return (
    <div
      className={cn(
        'animate-in fade-in slide-in-from-bottom-4 flex flex-col gap-6 duration-500',
        className
      )}
      {...props}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup>
          <div className="mb-4 flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="text-muted-foreground text-sm text-balance">
              Fill in the form below to create your account
            </p>
          </div>

          {error && (
            <div className="mb-4 text-center text-sm font-medium text-red-500">{error}</div>
          )}

          {success && (
            <div className="mb-4 text-center text-sm font-medium text-green-500">
              Account created! Redirecting to login...
            </div>
          )}

          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Full Name</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="text"
                  placeholder="John Doe"
                  className="bg-background"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="email"
                  placeholder="m@example.com"
                  className="bg-background"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : (
                  <FieldDescription>
                    We&apos;ll use this to contact you. We will not share your email with anyone
                    else.
                  </FieldDescription>
                )}
              </Field>
            )}
          />

          <Controller
            name="password"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="password"
                  className="bg-background"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : (
                  <FieldDescription>Must be at least 8 characters long.</FieldDescription>
                )}
              </Field>
            )}
          />

          <Controller
            name="confirmPassword"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Confirm Password</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="password"
                  className="bg-background"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : (
                  <FieldDescription>Please confirm your password.</FieldDescription>
                )}
              </Field>
            )}
          />

          <Field className="mt-2">
            <Button type="submit" disabled={isSubmitting || success}>
              {isSubmitting ? 'Creating...' : 'Create Account'}
            </Button>
          </Field>

          <Field className="">
            <FieldDescription className="mt-4 px-6 text-center">
              Already have an account?{' '}
              <Link href="/login" className="underline underline-offset-4">
                Sign in
              </Link>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
