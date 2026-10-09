import { PrismaClient } from "@prisma/client";
import { runComprehensiveSeed } from "../src/server/seed-data";

async function main() {
  await runComprehensiveSeed();
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  });
