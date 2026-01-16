import { pgEnum, pgTable } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const organizationStatusEnum = pgEnum('organization_status', ['active', 'archived', 'frozen'])

export const users = pgTable('users', (t) => ({
  id: t.serial('id').primaryKey(),
  kratosId: t.text('kratos_id').unique(), // UUID from Ory Kratos identity
  username: t.text().notNull().unique(),
  email: t.text().notNull().unique(),
  password: t.text().notNull().default('kratos-managed'), // Placeholder - auth handled by Kratos
  createdAt: t.timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: t.timestamp({ withTimezone: true, mode: 'string' }).defaultNow().$onUpdateFn(() => new Date().toISOString()).notNull()
}))

export const organizations = pgTable('organizations', (t) => ({
  id: t.serial('id').primaryKey(),
  title: t.text().notNull(),
  imageUrl: t.text(),
  description: t.text(),
  organizationTypeId: t.integer().notNull(),
  instagram: t.text(),
  telegramChannel: t.text(),
  telegramChat: t.text(),
  website: t.text(),
  youtube: t.text(),
  tiktok: t.text(),
  linkedin: t.text(),
  status: organizationStatusEnum().default('active'),
  createdAt: t.timestamp({ withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: t.timestamp({ withTimezone: true, mode: 'string' }).defaultNow().$onUpdateFn(() => new Date().toISOString())
}))

export const organizationTypes = pgTable('organization_types', (t) => ({
  id: t.serial('id').primaryKey(),
  title: t.text().notNull(),
  createdAt: t.timestamp({ withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: t.timestamp({ withTimezone: true, mode: 'string' }).defaultNow().$onUpdateFn(() => new Date().toISOString())
}))

export const formatEnum = pgEnum('format', ['online', 'offline'])
export const registrationStatusEnum = pgEnum('registration_status', ['registered', 'cancelled', 'waitlist'])
export const attendanceStatusEnum = pgEnum('attendance_status', ['attended', 'no_show', 'checked_in'])

export const events = pgTable('events', (t) => ({
  id: t.serial('id').primaryKey(),
  title: t.text().notNull(),
  description: t.text().notNull(),
  imageUrl: t.text(),
  userId: t.integer().notNull().references(() => users.id),
  organizationId: t.integer().notNull().references(() => organizations.id),
  location: t.text().notNull(),
  startTime: t.timestamp({ withTimezone: true, mode: 'string' }).notNull(),
  endTime: t.timestamp({ withTimezone: true, mode: 'string' }).notNull(),
  format: formatEnum().default('offline'),
  createdAt: t.timestamp({ withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: t.timestamp({ withTimezone: true, mode: 'string' }).defaultNow().$onUpdateFn(() => new Date().toISOString())
}))

export const tags = pgTable('tags', (t) => ({
  id: t.serial('id').primaryKey(),
  name: t.text().notNull().unique(),
  createdAt: t.timestamp({ withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: t.timestamp({ withTimezone: true, mode: 'string' }).defaultNow().$onUpdateFn(() => new Date().toISOString())
}))

export const eventTags = pgTable('event_tags', (t) => ({
  eventId: t.integer().notNull().references(() => events.id),
  tagId: t.integer().notNull().references(() => tags.id)
}))

export const roles = pgTable('roles', (t) => ({
  id: t.serial('id').primaryKey(),
  name: t.text().notNull().unique(),
  createdAt: t.timestamp({ withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: t.timestamp({ withTimezone: true, mode: 'string' }).defaultNow().$onUpdateFn(() => new Date().toISOString())
}))

export const userRoles = pgTable('user_roles', (t) => ({
  id: t.serial('id').primaryKey(),
  userId: t.integer().notNull().references(() => users.id),
  organizationId: t.integer().notNull().references(() => organizations.id),
  roleId: t.integer().notNull().references(() => roles.id)
}))

export const eventRegistrations = pgTable('event_registrations', (t) => ({
  id: t.serial('id').primaryKey(),
  eventId: t.integer().notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: t.integer().notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: registrationStatusEnum().default('registered').notNull(),
  registeredAt: t.timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  cancelledAt: t.timestamp({ withTimezone: true, mode: 'string' }),
  createdAt: t.timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: t.timestamp({ withTimezone: true, mode: 'string' }).defaultNow().$onUpdateFn(() => new Date().toISOString()).notNull()
}))

export const eventAttendance = pgTable('event_attendance', (t) => ({
  id: t.serial('id').primaryKey(),
  registrationId: t.integer().notNull().references(() => eventRegistrations.id, { onDelete: 'cascade' }).unique(),
  status: attendanceStatusEnum().default('checked_in').notNull(),
  checkedInAt: t.timestamp({ withTimezone: true, mode: 'string' }),
  checkedInBy: t.integer().references(() => users.id),
  notes: t.text(),
  createdAt: t.timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: t.timestamp({ withTimezone: true, mode: 'string' }).defaultNow().$onUpdateFn(() => new Date().toISOString()).notNull()
}))

export const usersRelations = relations(users, ({ many }) => ({
  roles: many(userRoles),
  eventRegistrations: many(eventRegistrations)
}))

export const eventsRelations = relations(events, ({ many, one }) => ({
  registrations: many(eventRegistrations),
  tags: many(eventTags),
  organization: one(organizations, {
    fields: [events.organizationId],
    references: [organizations.id]
  }),
  creator: one(users, {
    fields: [events.userId],
    references: [users.id]
  }),
}))

export const eventRegistrationsRelations = relations(eventRegistrations, ({ one }) => ({
  event: one(events, {
    fields: [eventRegistrations.eventId],
    references: [events.id]
  }),
  user: one(users, {
    fields: [eventRegistrations.userId],
    references: [users.id]
  }),
  attendance: one(eventAttendance, {
    fields: [eventRegistrations.id],
    references: [eventAttendance.registrationId]
  })
}))

export const eventAttendanceRelations = relations(eventAttendance, ({ one }) => ({
  registration: one(eventRegistrations, {
    fields: [eventAttendance.registrationId],
    references: [eventRegistrations.id]
  }),
  checkedInByUser: one(users, {
    fields: [eventAttendance.checkedInBy],
    references: [users.id]
  })
}))

export const organizationsRelations = relations(organizations, ({ many, one }) => ({
  roles: many(userRoles),
  organizationType: one(organizationTypes, {
    fields: [organizations.organizationTypeId],
    references: [organizationTypes.id]
  })
}))

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles)
}))

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  organization: one(organizations, { fields: [userRoles.organizationId], references: [organizations.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] })
}))

export const tagsRelations = relations(tags, ({ many }) => ({
  events: many(eventTags)
}))

export const eventTagsRelations = relations(eventTags, ({ one }) => ({
  event: one(events, { fields: [eventTags.eventId], references: [events.id] }),
  tag: one(tags, { fields: [eventTags.tagId], references: [tags.id] })
}))