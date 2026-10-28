export const brand = process.env.NEXT_PUBLIC_BRAND_NAME || "Numora SMS";
export function validateEnvironment(env: Record<string, string | undefined>) {
  const mode = env.APP_MODE || "demo";
  if (mode !== "demo")
    throw new Error(
      "Live operation is not implemented. Use APP_MODE=demo. Production requires verified adapters, server authorization and a reviewed database.",
    );
  return { mode: "demo" as const };
}
