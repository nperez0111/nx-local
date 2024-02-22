import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { and, eq, sql } from 'drizzle-orm';
import { type IncomingMessage } from 'http';
import ms from 'ms';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Stream } from 'stream';
import { z } from 'zod';

import { env } from '@/env';
import { db } from '@/server/db';
import { projectCaches } from '@/server/db/schema';
import { s3Client } from '@/server/s3';

type ResponseData = {
  ok: boolean;
  id: string;
};

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '20mb',
  },
};

/**
 * TRPC doesn't support streaming requests/responses yet, so we have to use the raw Next.js API for this.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { hash, projectId } = z
    .object({
      hash: z.string(),
      projectId: z.string(),
    })
    .parse(req.query);

  if (req.method === 'POST') {
    const project = await db.query.projects.findFirst({
      where: (projects, { eq }) => eq(projects.id, projectId),
    });

    if (!project) {
      res.status(404).json({ ok: false, id: hash });
      return;
    }
    const body = new Stream.PassThrough();
    req.pipe(body);
    try {
      const contentLength = parseInt(req.headers['content-length'] ?? '0');
      await s3Client.send(
        new PutObjectCommand({
          Key: projectId + '/' + hash,
          Bucket: env.AWS_BUCKET_NAME,
          Body: body,
          ContentLength: contentLength,
          Expires: new Date(Date.now() + ms('1w')),
        }),
      );
      const {
        'x-nx-local-start-time': startTime,
        'x-nx-local-project-name': nxProject,
        'x-nx-local-target': nxTarget,
      } = z
        .object({
          'x-nx-local-start-time': z
            .string()
            .optional()
            .transform((v) => (v ? new Date(Number(v)) : undefined)),
          'x-nx-local-project-name': z.string().optional(),
          'x-nx-local-target': z.string().optional(),
        })
        .parse(req.headers);

      await db.insert(projectCaches).values({
        downloads: 0,
        projectId,
        hash,
        size: contentLength,
        nxTarget,
        nxProject,
        startTime: startTime,
        updatedAt: new Date(),
      });
      res.status(200).json({ ok: true, id: hash });
      return;
    } catch (e) {
      res.status(404).json({ ok: false, id: hash });
      return;
    }
  } else if (req.method === 'GET') {
    try {
      // Update download count & check if the cache exists
      const [projectCache] = await db
        .update(projectCaches)
        .set({
          downloads: sql`${projectCaches.downloads} + 1`,
          updatedAt: new Date(),
        })
        .where(and(eq(projectCaches.hash, hash), eq(projectCaches.projectId, projectId)))
        .returning({ downloads: projectCaches.downloads });
      if (!projectCache) {
        res.status(404).json({ ok: false, id: hash });
        return;
      }

      const data = await s3Client.send(
        new GetObjectCommand({
          Key: projectId + '/' + hash,
          Bucket: env.AWS_BUCKET_NAME,
        }),
      );
      if (!data.Body) {
        res.status(404).json({ ok: false, id: hash });
        return;
      }

      res.setHeader('Content-Length', data.ContentLength!);
      res.setHeader('Content-Type', data.ContentType!);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      (data.Body as IncomingMessage).pipe(res);
      return;
    } catch (e) {
      res.status(404).json({ ok: false, id: hash });
      return;
    }
  }

  res.status(404).json({ ok: false, id: hash });
  return;
}
