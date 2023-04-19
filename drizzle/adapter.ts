import { type NodePgDatabase } from "drizzle-orm/node-postgres";
import { users, accounts, sessions, verificationTokens } from "./schema";
import { type InferModel } from "drizzle-orm";
import { eq } from "drizzle-orm/expressions";

export type TUser = InferModel<typeof users, "insert">;
export type TAccount = InferModel<typeof accounts, "insert">;
export type TSession = InferModel<typeof sessions, "insert">;
export type TVerificationToken = InferModel<
  typeof verificationTokens,
  "insert"
>;

export default function DrizzleAdapter(db: NodePgDatabase) {
  return {
    async createUser(user: TUser) {
      const insertedUsers = await db
        .insert(users)
        .values({ ...user })
        .returning();

      return insertedUsers[0];
    },

    async getUser(id: string) {
      const user = await db.select().from(users).where(eq(users.id, id));
      return user[0];
    },

    async getUserByEmail(email: string) {
      const user = await db.select().from(users).where(eq(users.email, email));
      return user[0];
    },

    async getUserByAccount(provider_providerAccountId: string) {
      const user = await db
        .select()
        .from(accounts)
        .where(eq(accounts.providerAccountId, provider_providerAccountId));
      return user[0];
    },

    async updateUser(id: string, data: TUser) {
      const updatedUsers = await db
        .update(users)
        .set(data)
        .where(eq(users.id, id))
        .returning();
      return updatedUsers[0];
    },

    async deleteUser(id: string) {
      const deletedUsers = await db
        .delete(users)
        .where(eq(users.id, id))
        .returning();
      return deletedUsers[0];
    },

    async linkAccount(data: TAccount) {
      const updatedAccount = await db.insert(accounts).values(data).returning();

      const account = {
        ...updatedAccount[0],
        access_token: updatedAccount[0]?.access_token ?? undefined,
        token_type: updatedAccount[0]?.token_type ?? undefined,
        id_token: updatedAccount[0]?.id_token ?? undefined,
        refresh_token: updatedAccount[0]?.refresh_token ?? undefined,
        scope: updatedAccount[0]?.scope ?? undefined,
        expires_at: updatedAccount[0]?.expires_at ?? undefined,
        session_state: updatedAccount[0]?.session_state ?? undefined,
      };

      return account;
    },

    async unlinkAccount(provider_providerAccountId: string) {
      const deletedAccounts = await db
        .delete(accounts)
        .where(eq(accounts.providerAccountId, provider_providerAccountId))
        .returning();
      return deletedAccounts[0];
    },

    async getSessionAndUser(sessionToken: string) {
      const session = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, sessionToken));
      if (!session[0]) return null;

      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, session[0].userId));
      return { user: user[0], session: session[0] };
    },

    async createSession(data: TSession) {
      const insertedSessions = await db
        .insert(sessions)
        .values(data)
        .returning();
      return insertedSessions[0];
    },

    async updateSession(sessionToken: string, data: TSession) {
      const updatedSessions = await db
        .update(sessions)
        .set(data)
        .where(eq(sessions.sessionToken, sessionToken))
        .returning();
      return updatedSessions[0];
    },

    async deleteSession(sessionToken: string) {
      const deletedSessions = await db
        .delete(sessions)
        .where(eq(sessions.sessionToken, sessionToken))
        .returning();
      return deletedSessions[0];
    },

    async createVerificationToken(data: TVerificationToken) {
      const insertedVerificationTokens = await db
        .insert(verificationTokens)
        .values(data)
        .returning();
      return insertedVerificationTokens[0];
    },

    async useVerificationToken(identifier_token: string) {
      const deletedVerificationTokens = await db
        .delete(verificationTokens)
        .where(eq(verificationTokens.identifier, identifier_token))
        .returning();
      return deletedVerificationTokens[0];
    },
  };
}
