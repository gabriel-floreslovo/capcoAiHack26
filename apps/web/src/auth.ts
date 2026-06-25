import { getServerSession, type NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

const githubProviderIsConfigured = Boolean(
  process.env.GITHUB_ID &&
    process.env.GITHUB_SECRET &&
    process.env.NEXTAUTH_SECRET,
);

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: githubProviderIsConfigured
    ? [
        GitHubProvider({
          clientId: process.env.GITHUB_ID as string,
          clientSecret: process.env.GITHUB_SECRET as string,
          authorization: {
            params: {
              scope: "read:user repo",
            },
          },
        }),
      ]
    : [],
  callbacks: {
    async jwt({ token, account, profile }) {
      const githubProfile = profile as { login?: string } | undefined;

      if (account?.access_token) {
        token.accessToken = account.access_token;
      }

      if (typeof githubProfile?.login === "string") {
        token.githubLogin = githubProfile.login;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.login =
          typeof token.githubLogin === "string" ? token.githubLogin : undefined;
      }

      if (typeof token.accessToken === "string") {
        session.accessToken = token.accessToken;
      }

      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}

export { githubProviderIsConfigured };
