import { cookies } from "next/headers";
import { jwtVerify } from "jose";

type BrandJwtPayload = {
  brandId: string;
  companyId?: string | null;
};

export async function requireBrandSession(
  req: Request
): Promise<{ brandId: string; companyId: string | null }> {
  const token =
    readBearerToken(req) ||
    (await readCookieToken(["brand_token", "brandAuth", "brand_session", "session"]));

  if (!token) {
    throw new Error("Unauthorized: missing brand session token");
  }

  const secret = process.env.BRAND_JWT_SECRET;
  if (!secret) {
    throw new Error("Server misconfigured: BRAND_JWT_SECRET not set");
  }

  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
  const p = payload as BrandJwtPayload;

  if (!p?.brandId) {
    throw new Error("Unauthorized: invalid token (missing brandId)");
  }

  return {
    brandId: String(p.brandId),
    companyId: p.companyId ? String(p.companyId) : null,
  };
}

function readBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

async function readCookieToken(names: string[]) {
  const jar = await cookies(); // ✅ THIS IS THE KEY FIX
  for (const n of names) {
    const v = jar.get(n)?.value;
    if (v) return v;
  }
  return null;
}
