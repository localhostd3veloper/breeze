'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { ComponentProps, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { type LoginInput, loginSchema } from '@/lib/validations/auth';

export function LoginForm({ className, ...props }: ComponentProps<'div'>) {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextRoute = searchParams.get('next') ?? '/chat';
  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setError(null);
    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setError('Incorrect email or password. Please try again.');
    } else {
      router.push(nextRoute);
      router.refresh();
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
            <h1 className="text-2xl font-bold">Login to your account</h1>
            <p className="text-muted-foreground text-sm text-balance">
              Enter your email below to login to your account
            </p>
          </div>

          {error && (
            <div className="mb-4 text-center text-sm font-medium text-red-500">{error}</div>
          )}

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
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="password"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <div className="flex items-center">
                  <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                  <Link href="#" className="ml-auto text-xs underline-offset-4 hover:underline">
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  {...field}
                  id={field.name}
                  type="password"
                  className="bg-background"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Field className="mt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Logging in...' : 'Login'}
            </Button>
          </Field>

          <Field>
            <FieldDescription className="mt-4 text-center">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="underline underline-offset-4">
                Sign up
              </Link>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
