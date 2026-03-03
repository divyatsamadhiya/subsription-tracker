import "dotenv/config";
import { connectDatabase, disconnectDatabase } from "../src/db.js";
import { purgeDeletedUsersOlderThan } from "../src/services/adminService.js";

const readArg = (name: string): string | undefined => {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) {
    return inline.slice(prefix.length);
  }

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }

  return undefined;
};

const main = async (): Promise<void> => {
  const parsedDays = Number(readArg("days") ?? "30");
  if (!Number.isInteger(parsedDays) || parsedDays < 1) {
    throw new Error("--days must be a positive integer");
  }

  await connectDatabase();

  try {
    const purgedCount = await purgeDeletedUsersOlderThan(parsedDays);
    console.log(`Purged ${purgedCount} users soft-deleted for more than ${parsedDays} days.`);
  } finally {
    await disconnectDatabase();
  }
};

main().catch((error) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error("Unknown error while purging deleted users.");
  }

  process.exit(1);
});
