import { config as loadEnv } from 'dotenv';
import * as Joi from 'joi';

loadEnv();

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('dev', 'production', 'test').default('dev'),
  APP_PORT: Joi.number().port().default(3000),
  APP_PREFIX: Joi.string().default('api'),
  JWT_ACCESS_SECRET: Joi.string().default('access_secret'),
  JWT_REFRESH_SECRET: Joi.string().default('refresh_secret'),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('1d'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
  JWT_REFRESH_TTL_SECONDS: Joi.number().integer().positive().default(2592000),
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().port().default(5432),
  DB_USER: Joi.string().default('postgres'),
  DB_PASSWORD: Joi.string().allow('').default(''),
  DB_NAME: Joi.string().default('hackathon_demo'),
  DB_SSL: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  GITLAB_API_URL: Joi.string().uri().default('https://git.netko.vn/api/v4'),
  GITLAB_API_TOKEN: Joi.string().allow('').default(''),
  GITLAB_PROJECT_ID: Joi.string().allow('').default(''),
  GITLAB_SAKURA_PROJECT_ID: Joi.string().allow('').default(''),
  GEMINI_API_KEY: Joi.string().allow('').default(''),
  GEMINI_MODEL: Joi.string().default('gemini-1.5-flash'),
  TEAMS_WORKFLOW_WEBHOOK_URL: Joi.string().allow('').default(''),
  /** `users.id` used when an issue has no assignee before enqueueing GitLab creation */
  DEFAULT_ISSUE_ASSIGNEE_USER_ID: Joi.number().integer().positive().default(25)
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
  jwt: {
    accessSecret: value.JWT_ACCESS_SECRET as string,
    refreshSecret: value.JWT_REFRESH_SECRET as string,
    accessExpiresIn: value.JWT_ACCESS_EXPIRES_IN as string,
    refreshExpiresIn: value.JWT_REFRESH_EXPIRES_IN as string,
    refreshTtlSeconds: value.JWT_REFRESH_TTL_SECONDS as number
  },
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
  teams: {
    workflowWebhookUrl: value.TEAMS_WORKFLOW_WEBHOOK_URL as string
  },
  issue: {
    defaultAssigneeUserId: value.DEFAULT_ISSUE_ASSIGNEE_USER_ID as number
  },
  isProduction: value.NODE_ENV === 'production'
};
