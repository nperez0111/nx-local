import { S3Client } from '@aws-sdk/client-s3';

import { env } from '@/env';

export const s3Client = new S3Client({
  region: env.AWS_REGION,
  endpoint: env.AWS_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    accessKeyId: env.AWS_ACCESS_KEY_ID,
  },
});
