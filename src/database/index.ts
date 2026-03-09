import Database from "@tauri-apps/plugin-sql";
import { isBoolean } from "es-toolkit";
import { Kysely, sql } from "kysely";
import { TauriSqliteDialect } from "kysely-dialect-tauri";
import { SerializePlugin } from "kysely-plugin-serialize";
import type { DatabaseSchema } from "@/types/database";
import { getSaveDatabasePath } from "@/utils/path";

let db: Kysely<DatabaseSchema> | null = null;
let historyColumns: string[] = [];

export { historyColumns };

export const getDatabase = async () => {
  if (db) return db;

  const path = await getSaveDatabasePath();

  db = new Kysely<DatabaseSchema>({
    dialect: new TauriSqliteDialect({
      database: (prefix) => Database.load(prefix + path),
    }),
    plugins: [
      new SerializePlugin({
        deserializer: (value) => value,
        serializer: (value) => {
          if (isBoolean(value)) {
            return Number(value);
          }

          return value;
        },
      }),
    ],
  });

  // 数据库表列定义（唯一的字段定义来源，供 createTable 和 selectHistory 共用）
  // 未来增加新列时，只需在这里添加一行即可，查询也会自动包含新列
  const historyColumnDefs: { name: string; type: string; modifier?: (col: any) => any }[] = [
    { name: "id", type: "text", modifier: (col) => col.primaryKey() },
    { name: "type", type: "text" },
    { name: "group", type: "text" },
    { name: "value", type: "text" },
    { name: "search", type: "text" },
    { name: "count", type: "integer" },
    { name: "width", type: "integer" },
    { name: "height", type: "integer" },
    { name: "favorite", type: "integer", modifier: (col) => col.defaultTo(0) },
    { name: "createTime", type: "text" },
    { name: "note", type: "text" },
    { name: "subtype", type: "text" },
    { name: "sourceAppName", type: "text" },
    { name: "sourceAppIcon", type: "text" },
    { name: "value_size", type: "integer", modifier: (col) => col.defaultTo(0) },
  ];

  // 导出列名数组，供 selectHistory 的 .select() 使用
  historyColumns = historyColumnDefs.map((c) => c.name);

  let builder = db.schema.createTable("history").ifNotExists();
  for (const col of historyColumnDefs) {
    builder = builder.addColumn(col.name, col.type as any, col.modifier);
  }
  await builder.execute();

  // Try to add the columns if the table already existed and lacked them
  // Catching errors in case they already exist (SQLite will throw if adding duplicate columns)
  const columnsToAdd = ["subtype", "sourceAppName", "sourceAppIcon"];
  for (const col of columnsToAdd) {
    try {
      await db.schema.alterTable("history").addColumn(col, "text").execute();
    } catch (_error) {
      // Column might already exist, ignore error
    }
  }

  // 添加 value_size 列（整数类型，默认值 0）
  try {
    await db.schema.alterTable("history").addColumn("value_size", "integer", (col) => col.defaultTo(0)).execute();
  } catch (_error) {
    // Column might already exist, ignore error
  }

  // 对旧记录批量回填 value_size（按类型区分）
  try {
    // 非图片类型：文本/文件路径等用 SQLite LENGTH 近似回填
    await sql`UPDATE history SET value_size = LENGTH(value) WHERE (value_size IS NULL OR value_size = 0) AND type != 'image'`.execute(db);
    // 图片类型：唯一真正落盘的类型，用 count 列的真实物理大小
    await sql`UPDATE history SET value_size = count WHERE (value_size IS NULL OR value_size = 0) AND type = 'image'`.execute(db);
  } catch (_error) {
    // Ignore if backfill fails
  }

  return db;
};

export const destroyDatabase = async () => {
  const db = await getDatabase();

  return db.destroy();
};
