import * as uuid from 'uuid';
import { z } from 'zod';

import { createTRPCRouter, protectedProcedure, publicProcedure } from '@/server/api/trpc';
import { projects, usersToProjects } from '@/server/db/schema';

export const projectRouter = createTRPCRouter({
  hello: publicProcedure.input(z.object({ text: z.string() })).query(({ input }) => {
    return {
      greeting: `Hello ${input.text}`,
    };
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .output(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .insert(projects)
        .values({
          id: uuid.v4(),
          name: input.name,
          createdById: ctx.session.user.id,
          updatedAt: new Date(),
        })
        .returning({ projectId: projects.id });
      if (!project) {
        throw new Error('Failed to create project');
      }
      await ctx.db.insert(usersToProjects).values({
        projectId: project.projectId,
        userId: ctx.session.user.id,
      });
      return { projectId: project.projectId };
    }),

  // getLatest: publicProcedure.query(({ ctx }) => {
  //   return ctx.db.query.posts.findFirst({
  //     orderBy: (posts, { desc }) => [desc(posts.createdAt)],
  //   });
  // }),

  getSecretMessage: protectedProcedure.query(() => {
    return 'you can now see this secret message!';
  }),
});
