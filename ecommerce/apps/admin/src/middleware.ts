import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/jwt";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/accept-invite"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/api/health") return NextResponse.next();

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (!session && !isPublic) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (session && isPublic) return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
