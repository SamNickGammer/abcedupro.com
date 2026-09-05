import { prisma } from "@/lib/db";
import { fail, handler, ok, parseBody, validationFailed } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import {
  CONFIG_DEFINITIONS,
  CONFIG_KEYS,
  configRows,
  loadConfig,
  totalSeats,
  type ConfigKey,
} from "@/lib/library";
import { libraryConfigSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const GET = handler(async () => {
  await requireAdmin();

  const config = await loadConfig();

  return ok("Library config fetched successfully.", {
    config,
    rows: configRows(config),
    meta: {
      total_seats: totalSeats(config.seat_layout),
      total_slots: config.slot_definitions.length,
      total_lockers: config.locker_numbers.length,
    },
  });
});

export const PUT = handler(async (request) => {
  await requireAdmin();

  const parsed = await parseBody(request, libraryConfigSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const provided = CONFIG_KEYS.filter(
    (key) => parsed.data[key] !== undefined && parsed.data[key] !== null,
  );

  if (provided.length === 0) return fail("No config values were provided.", 422);

  await prisma.$transaction(
    provided.map((key: ConfigKey) => {
      const definition = CONFIG_DEFINITIONS[key];
      const value = parsed.data[key];
      const configValue =
        definition.type === "json" ? JSON.stringify(value) : String(value);

      return prisma.libraryConfig.upsert({
        where: { configKey: key },
        create: {
          configKey: key,
          configValue,
          valueType: definition.type,
          description: definition.description,
        },
        update: {
          configValue,
          valueType: definition.type,
          description: definition.description,
        },
      });
    }),
  );

  const config = await loadConfig();

  return ok("Library config updated successfully.", {
    config,
    meta: {
      total_seats: totalSeats(config.seat_layout),
      total_slots: config.slot_definitions.length,
      total_lockers: config.locker_numbers.length,
    },
  });
});
