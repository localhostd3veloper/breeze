import bcrypt from 'bcryptjs';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

import dbConnect from '@/lib/db/mongodb';
import User from '@/lib/models/user';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        await dbConnect();

        const user = await User.findOne({
          email: credentials.email.toLowerCase(),
        }).lean();

        if (!user) {
          throw new Error('No account found with that email');
        }

        if (!user.password) {
          throw new Error('Invalid credentials');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error('Incorrect password');
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.profileURL ?? null,
          isDemo: user.isDemo,
          profileURL: user.profileURL ?? null,
          createdAt: (user.createdAt as Date).toISOString(),
          updatedAt: (user.updatedAt as Date).toISOString(),
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as typeof user & {
          isDemo: boolean;
          profileURL: string | null;
          createdAt: string;
          updatedAt: string;
        };
        token.id = u.id;
        token.isDemo = u.isDemo;
        token.profileURL = u.profileURL;
        token.createdAt = u.createdAt;
        token.updatedAt = u.updatedAt;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.isDemo = token.isDemo;
        session.user.profileURL = token.profileURL;
        session.user.createdAt = token.createdAt;
        session.user.updatedAt = token.updatedAt;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
