import NextAuth from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

export const runtime = "nodejs";

const handler = NextAuth(authOptions as never);

export async function GET(
  request: Request,
  context: { params: Promise<{ nextauth: string[] }> },
) {
  return handler(request as never, context as never);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ nextauth: string[] }> },
) {
  return handler(request as never, context as never);
}
