import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Page() {
  return (
    <div className="flex h-dvh min-h-screen flex-col items-center justify-center">
      <div>Welcome to Breeze</div>
      <Link href="/chat" className="mt-4">
        <Button>Get Started</Button>
      </Link>
    </div>
  );
}
