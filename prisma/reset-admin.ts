import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("123654RZ@", 10);
  await prisma.adminUser.upsert({
    where: { email: "zivrozen84@gmail.com" },
    update: { passwordHash: hash },
    create: {
      email: "zivrozen84@gmail.com",
      passwordHash: hash,
      role: "SUPER_ADMIN",
    },
  });
  console.log("Super admin reset: zivrozen84@gmail.com / 123654RZ@");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
