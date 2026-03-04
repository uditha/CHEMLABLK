import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n=== Teachers ===\n");
  const teachers = await prisma.teacher.findMany({
    select: { email: true, name: true },
  });
  teachers.forEach((t) => console.log(`  ${t.email} — ${t.name}`));
  console.log(`  (${teachers.length} total)\n`);

  console.log("=== Students ===\n");
  const students = await prisma.student.findMany({
    select: { indexNumber: true, name: true },
  });
  students.forEach((s) => console.log(`  ${s.indexNumber} — ${s.name}`));
  console.log(`  (${students.length} total)\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
