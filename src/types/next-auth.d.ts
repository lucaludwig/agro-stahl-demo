import "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    /** Weitere Bereiche derselben Person, zusätzlich zu role. */
    weitereRollen: string[];
    orgId: string;
  }

  interface Session {
    user: User & {
      id: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    weitereRollen: string[];
    orgId: string;
  }
}
