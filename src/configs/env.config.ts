import { config as loadEnv } from 'dotenv';
import * as Joi from 'joi';

loadEnv();

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('dev', 'production', 'test').default('dev'),
  APP_PORT: Joi.number().port().default(3000),
  APP_PREFIX: Joi.string().default('api'),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  GITLAB_API_URL: Joi.string().uri().default('https://git.netko.vn/api/v4'),
  GITLAB_API_TOKEN: Joi.string().allow('').default(''),
  GITLAB_PROJECT_ID: Joi.string().allow('').default(''),
  GITLAB_SAKURA_PROJECT_ID: Joi.string().allow('').default(''),
  GEMINI_API_KEY: Joi.string().allow('').default(''),
  GEMINI_MODEL: Joi.string().default('gemini-1.5-flash')
}).unknown(true);

const { error, value } = envSchema.validate(process.env, {
  abortEarly: false,
  convert: true
});

if (error) {
  throw new Error(`Environment validation failed: ${error.message}`);
}

export const env = {
  nodeEnv: value.NODE_ENV as string,
  appPort: value.APP_PORT as number,
  appPrefix: value.APP_PREFIX as string,
  db: {
    host: value.DB_HOST as string,
    port: value.DB_PORT as number,
    user: value.DB_USER as string,
    password: value.DB_PASSWORD as string,
    name: value.DB_NAME as string,
    ssl: value.DB_SSL as boolean,
    logging: value.DB_LOGGING as boolean
  },
  redis: {
    host: value.REDIS_HOST as string,
    port: value.REDIS_PORT as number,
  },
  gitlab: {
    apiUrl: value.GITLAB_API_URL as string,
    apiToken: value.GITLAB_API_TOKEN as string,
    projectId: value.GITLAB_PROJECT_ID as string,
    sakuraProjectId: value.GITLAB_SAKURA_PROJECT_ID as string
  },
  gemini: {
    apiKey: value.GEMINI_API_KEY as string,
    model: value.GEMINI_MODEL as string
  },
  isProduction: value.NODE_ENV === 'production'
};
