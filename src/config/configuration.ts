import { parseModelChain } from './parse-model-chain';

export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  storage: {
    endpoint: process.env.STORAGE_ENDPOINT,
    publicEndpoint: process.env.STORAGE_PUBLIC_ENDPOINT,
    bucket: process.env.STORAGE_BUCKET,
    accessKey: process.env.STORAGE_ACCESS_KEY,
    secret: process.env.STORAGE_SECRET,
    region: process.env.STORAGE_REGION || 'us-east-1',
    presignTtl: parseInt(process.env.STORAGE_PRESIGN_TTL || '300', 10),
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  ai: {
    apiKey: process.env.OPENROUTER_API_KEY,
    modelChain: parseModelChain(
      process.env.AI_MODEL_CHAIN,
      process.env.AI_MODEL,
    ),
    baseUrl: process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1',
  },
});
