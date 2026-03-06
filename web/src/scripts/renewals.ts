import { prisma } from "@/lib/prisma";
import { runRenewalWorker } from "@/lib/renewals";

runRenewalWorker()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Renewal worker complete.");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
