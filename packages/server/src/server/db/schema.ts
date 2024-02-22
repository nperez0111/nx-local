import { relations, sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgTableCreator,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { type AdapterAccount } from 'next-auth/adapters';

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `nx-local_${name}`);

export const projects = createTable('project', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 256 }),
  createdById: varchar('created_by_id', { length: 255 })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp('updated_at'),
});

export const projectRelations = relations(projects, ({ many }) => ({
  caches: many(projectCaches),
  members: many(usersToProjects),
}));

export const projectCaches = createTable(
  'cache',
  {
    hash: varchar('hash', { length: 20 }).notNull(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    size: integer('size').notNull(),
    nxProject: varchar('nx_project', { length: 256 }),
    nxTarget: varchar('nx_target', { length: 256 }),
    startTime: timestamp('start_time'),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at'),
    expiresAt: timestamp('expires_at'),
    downloads: integer('downloads').notNull(),
  },
  (projectCache) => ({
    id: primaryKey({ columns: [projectCache.hash, projectCache.projectId] }),
    projectIdIdx: index('projectId_Idx').on(projectCache.projectId),
  }),
);

export const projectCacheRelations = relations(projectCaches, ({ one }) => ({
  project: one(projects, { fields: [projectCaches.projectId], references: [projects.id] }),
}));

export const users = createTable('user', {
  id: varchar('id', { length: 255 }).notNull().primaryKey(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull(),
  emailVerified: timestamp('emailVerified', {
    mode: 'date',
  }).default(sql`CURRENT_TIMESTAMP`),
  image: varchar('image', { length: 255 }),
});

export const usersToProjects = createTable(
  'users_to_projects',
  {
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
  },
  (userProject) => ({
    pk: primaryKey({ columns: [userProject.userId, userProject.projectId] }),
  }),
);

export const usersToProjectsRelations = relations(usersToProjects, ({ one }) => ({
  project: one(projects, {
    fields: [usersToProjects.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [usersToProjects.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  projects: many(usersToProjects),
}));

export const accounts = createTable(
  'account',
  {
    userId: varchar('userId', { length: 255 })
      .notNull()
      .references(() => users.id),
    type: varchar('type', { length: 255 }).$type<AdapterAccount['type']>().notNull(),
    provider: varchar('provider', { length: 255 }).notNull(),
    providerAccountId: varchar('providerAccountId', { length: 255 }).notNull(),
    refresh_token: text('refresh_token'),
    refresh_token_expires_in: integer('refresh_token_expires_in'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: varchar('token_type', { length: 255 }),
    scope: varchar('scope', { length: 255 }),
    id_token: text('id_token'),
    session_state: varchar('session_state', { length: 255 }),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    userIdIdx: index('account_userId_idx').on(account.userId),
  }),
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
  'session',
  {
    sessionToken: varchar('sessionToken', { length: 255 }).notNull().primaryKey(),
    userId: varchar('userId', { length: 255 })
      .notNull()
      .references(() => users.id),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (session) => ({
    userIdIdx: index('session_userId_idx').on(session.userId),
  }),
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  'verificationToken',
  {
    identifier: varchar('identifier', { length: 255 }).notNull(),
    token: varchar('token', { length: 255 }).notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);
