import { vi } from "vitest";

const makeMockModel = () => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  createMany: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
  upsert: vi.fn()
});

export const mockPrisma = {
  user: makeMockModel(),
  settings: makeMockModel(),
  subscription: makeMockModel(),
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $transaction: vi.fn()
};
