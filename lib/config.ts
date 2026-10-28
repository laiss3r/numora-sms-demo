export const brand = process.env.NEXT_PUBLIC_BRAND_NAME || "Numora SMS";
export type AppMode = "demo" | "live";
export function validateEnvironment(env: Record<string, string | undefined>): {
  mode: AppMode;
} {
  const mode =
    env.APP_MODE || (env.VERCEL_ENV === "production" ? "live" : "demo");
  if (mode !== "demo" && mode !== "live")
    throw new Error(
      "Invalid APP_MODE: use demo or live. Other modes are not implemented.",
    );
  return { mode };
}
