/**
 * Seeds a usable empty system: one head-office admin account, a couple of
 * courses, and the library's default configuration.
 *
 * Safe to re-run — every write is an upsert.
 *
 *   npm run db:seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { CONFIG_DEFINITIONS, CONFIG_KEYS } from "../src/lib/library";

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const adminCode = process.env.SEED_ADMIN_CODE ?? "admin";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe#2026";

  const admin = await prisma.branch.upsert({
    where: { branchCode: adminCode },
    update: {},
    create: {
      branchCode: adminCode,
      branchName: "Institute of ABC — Head Office",
      role: "admin",
      phone: "+910000000000",
      emailId: "admin@abcedupro.com",
      addressLine1: "Head Office",
      city: "Patna",
      state: "Bihar",
      zip: 800001,
      firstName: "Head",
      lastName: "Office",
      active: true,
      password: bcrypt.hashSync(adminPassword, 12),
      credit: 0,
      creditPerCertificate: 200,
    },
  });

  console.log(`✔ admin branch "${admin.branchCode}" (id ${admin.id})`);

  const courses = [
    {
      courseName: "Diploma in Computer Applications",
      shortForm: "DCA",
      courseDuration: 12,
      courseFees: 12000,
    },
    {
      courseName: "Advanced Diploma in Computer Applications",
      shortForm: "ADCA",
      courseDuration: 18,
      courseFees: 18000,
    },
    {
      courseName: "Certificate in Computer Applications",
      shortForm: "CCA",
      courseDuration: 6,
      courseFees: 6000,
    },
  ];

  for (const course of courses) {
    await prisma.course.upsert({
      where: { courseName: course.courseName },
      update: {},
      create: { ...course, courseStatus: "active" },
    });
  }

  console.log(`✔ ${courses.length} courses`);

  for (const key of CONFIG_KEYS) {
    const definition = CONFIG_DEFINITIONS[key];
    const value =
      definition.type === "json" ? JSON.stringify(definition.value) : String(definition.value);

    await prisma.libraryConfig.upsert({
      where: { configKey: key },
      update: {},
      create: {
        configKey: key,
        configValue: value,
        valueType: definition.type,
        description: definition.description,
      },
    });
  }

  console.log(`✔ ${CONFIG_KEYS.length} library config keys`);
  console.log(`\nSign in at /admin-abc/login as "${adminCode}" / "${adminPassword}"`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
