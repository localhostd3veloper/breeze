import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      isDemo: boolean;
      profileURL: string | null;
      createdAt: string;
      updatedAt: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    isDemo: boolean;
    profileURL: string | null;
    createdAt: string;
    updatedAt: string;
  }
}
