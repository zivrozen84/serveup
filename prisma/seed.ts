import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("123654RZ@", 10);
  const superAdmin = await prisma.adminUser.upsert({
    where: { email: "zivrozen84@gmail.com" },
    update: { passwordHash: hash },
    create: {
      email: "zivrozen84@gmail.com",
      passwordHash: hash,
      role: "SUPER_ADMIN",
    },
  });
  console.log("Seed OK: super admin", superAdmin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
