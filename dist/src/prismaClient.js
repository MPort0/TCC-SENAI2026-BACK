"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const adapter_better_sqlite3_1 = require("@prisma/adapter-better-sqlite3");
const client_1 = require("../generated/prisma/client");
const adapter = new adapter_better_sqlite3_1.PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new client_1.PrismaClient({ adapter });
exports.default = prisma;
