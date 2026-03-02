import { prisma } from "./prisma";

export async function checkIpAllowed(ip: string): Promise<boolean> {
  if (["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(ip)) return true;
  const fromDb = await prisma.allowedIP.findFirst({
    where: { ipAddress: ip },
  });
  if (fromDb) return true;
  const envIps = process.env.ALLOWED_IPS?.split(",").map((s) => s.trim()) ?? [];
  return envIps.includes(ip) || envIps.includes("*");
}
