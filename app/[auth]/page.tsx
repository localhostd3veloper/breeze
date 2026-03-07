import { notFound } from 'next/navigation';
import { LoginForm } from '@/components/login-form';
import { SignupForm } from '@/components/signup-form';
import Image from 'next/image';

export default async function AuthPage({
  params,
}: {
  params: Promise<{ auth: string }>;
}) {
  const { auth } = await params;

  if (auth !== 'login' && auth !== 'signup') {
    notFound();
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a
            href="#"
            className="flex items-center gap-2 font-medium font-satisfy"
          >
            <Image
              src="/favicon.svg"
              alt="Breeze Logo"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-2xl"> Breeze.</span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            {auth === 'login' ? <LoginForm /> : <SignupForm />}
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="relative hidden bg-muted lg:block h-full w-full rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-700">
          <Image
            width={1000}
            height={1000}
            src={auth === 'login' ? '/login.jpg' : '/signup.jpeg'}
            alt={`${auth === 'login' ? 'Login' : 'Signup'} background image`}
            className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.5]"
          />
        </div>
      </div>
    </div>
  );
}
