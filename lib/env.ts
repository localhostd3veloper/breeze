import { z } from 'zod';

const envSchema = z.object({
  OLLAMA_API_URL: z.url().describe('Ollama API URL'),
  OLLAMA_API_KEY: z.string().describe('Ollama API Key'),
  PLATFORM_PASSWORD: z.string().describe('Platform Password'),
  MONGO_URI: z.url().describe('MongoDB URI'),
  MONGO_DB_NAME: z.string().describe('MongoDB Database Name'),
});

export const env = envSchema.parse(process.env);
