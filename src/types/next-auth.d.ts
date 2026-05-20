declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isApproved?: boolean;
      role?: "admin" | "user";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    isApproved?: boolean;
    role?: "admin" | "user";
  }
}
