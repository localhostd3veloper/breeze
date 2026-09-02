import { z } from 'zod';

const envSchema = z.object({
  OLLAMA_API_URL: z.url().describe('Ollama API URL'),
  OLLAMA_API_KEY: z.string().describe('Ollama API Key'),
  PLATFORM_PASSWORD: z.string().describe('Platform Password'),
  MONGO_URI: z.url().describe('MongoDB URI'),
  NEXTAUTH_SECRET: z.string().min(1).describe('NextAuth JWT secret'),
});

type Env = z.infer<typeof envSchema>;

const KEYS = new Set(Object.keys(envSchema.shape));

let parsed: Env | null = null;

/**
 * Validated on first *access*, not at import.
 *
 * `next build` imports this module while prerendering pages, and the Docker
 * build deliberately passes no secrets -- an eager `envSchema.parse` would
 * fail the image build rather than a misconfigured deploy. Reading any
 * property still throws the same zod error it always did, just at the point
 * where the value is genuinely needed.
 */
export const env = new Proxy({} as Env, {
  get(_target, key) {
    // Only a real schema key triggers validation. Everything else -- `toJSON`,
    // `then`, symbols -- is some runtime *inspecting* the object rather than
    // asking for a value, and answering that with a throw is what turned a
    // stray JSON.stringify into a failed production build.
    if (typeof key !== 'string' || !KEYS.has(key)) return undefined;
    parsed ??= envSchema.parse(process.env);
    return parsed[key as keyof Env];
  },
});
