import "dotenv/config";
import { connectDatabase, disconnectDatabase } from "../src/db.js";
import { setUserRoleByEmail } from "../src/services/adminService.js";

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
  const email = readArg("email");
  const actor = readArg("actor") ?? "system";

  if (!email) {
    throw new Error("Missing required argument: --email=<user@example.com>");
  }

  await connectDatabase();

  try {
    const updated = await setUserRoleByEmail(actor, email, "user");
    console.log(`Revoked admin role for ${updated.email} (${updated.id}).`);
  } finally {
    await disconnectDatabase();
  }
};

main().catch((error) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error("Unknown error while revoking admin role.");
  }

  process.exit(1);
});
