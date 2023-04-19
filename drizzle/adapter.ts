import { accounts, users, sessions, verificationTokens } from "./schema";
import { and, eq } from "drizzle-orm/expressions";
import { type NodePgDatabase } from "drizzle-orm/node-postgres";
import { type InferModel } from "drizzle-orm";

export type TUser = InferModel<typeof users, "insert">;
export type TAccount = InferModel<typeof accounts, "insert">;
export type TSession = InferModel<typeof sessions, "insert">;
export type TVerificationToken = InferModel<
  typeof verificationTokens,
  "insert"
>;

export function DrizzleAdapter(client: NodePgDatabase) {
  return {
    createUser: async (data: TUser) => {
      return client
        .insert(users)
        .values({ ...data, id: "123" })
        .returning()
        .then((res) => res[0]);
    },
    getUser: async (id: string) => {
      return (
        client
          .select()
          .from(users)
          .where(eq(users.id, id))
          .then((res) => res[0]) ?? null
      );
    },
    getUserByEmail: async (email: string) => {
      return (
        client
          .select()
          .from(users)
          .where(eq(users.email, email))
          .then((res) => res[0]) ?? null
      );
    },
    createSession: async (data: TSession) => {
      return client
        .insert(sessions)
        .values(data)
        .returning()
        .then((res) => res[0]);
    },
    getSessionAndUser: async (sessionToken: string) => {
      return (
        client
          .select({
            session: sessions,
            user: users,
          })
          .from(sessions)
          .where(eq(sessions.sessionToken, sessionToken))
          .innerJoin(users, eq(users.id, sessions.userId))
          .then((res) => res[0]) ?? null
      );
    },
    updateUser: async (data: TUser) => {
      if (!data.id) {
        throw new Error("No user id.");
      }

      return client
        .update(users)
        .set(data)
        .where(eq(users.id, data.id))
        .returning()
        .then((res) => res[0]);
    },
    updateSession: async (data: TSession) => {
      return client
        .update(sessions)
        .set(data)
        .where(eq(sessions.sessionToken, data.sessionToken))
        .returning()
        .then((res) => res[0]);
    },
    linkAccount: async (rawAccount: TAccount) => {
      const updatedAccount = await client
        .insert(accounts)
        .values(rawAccount)
        .returning()
        .then((res) => res[0]);

      const account = {
        ...updatedAccount,
        access_token: updatedAccount?.access_token ?? undefined,
        token_type: updatedAccount?.token_type ?? undefined,
        id_token: updatedAccount?.id_token ?? undefined,
        refresh_token: updatedAccount?.refresh_token ?? undefined,
        scope: updatedAccount?.scope ?? undefined,
        expires_at: updatedAccount?.expires_at ?? undefined,
        session_state: updatedAccount?.session_state ?? undefined,
      };

      return account;
    },

    getUserByAccount: async (account: TAccount) => {
      return (
        client
          .select({
            id: users.id,
            email: users.email,
            emailVerified: users.emailVerified,
            image: users.image,
            name: users.name,
          })
          .from(users)
          .innerJoin(
            accounts,
            and(
              eq(accounts.providerAccountId, account.providerAccountId),
              eq(accounts.provider, account.provider)
            )
          )
          .then((res) => res[0]) ?? null
      );
    },
    deleteSession: async (sessionToken: string) => {
      await client
        .delete(sessions)
        .where(eq(sessions.sessionToken, sessionToken));
    },
    createVerificationToken: async (token: TVerificationToken) => {
      return client
        .insert(verificationTokens)
        .values(token)
        .returning()
        .then((res) => res[0]);
    },
    useVerificationToken: async (token: TVerificationToken) => {
      try {
        return (
          client
            .delete(verificationTokens)
            .where(
              and(
                eq(verificationTokens.identifier, token.identifier),
                eq(verificationTokens.token, token.token)
              )
            )
            .returning()
            .then((res) => res[0]) ?? null
        );
      } catch (err) {
        throw new Error("No verification token found.");
      }
    },
    deleteUser: async (id: string) => {
      await client
        .delete(users)
        .where(eq(users.id, id))
        .returning()
        .then((res) => res[0]);
    },
    unlinkAccount: async (account: TAccount) => {
      await client
        .delete(accounts)
        .where(
          and(
            eq(accounts.providerAccountId, account.providerAccountId),
            eq(accounts.provider, account.provider)
          )
        );

      return undefined;
    },
  };
}
