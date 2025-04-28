import * as t from "drizzle-orm/pg-core";

export const bytea = t.customType<{
  data: Buffer;
  default: false;
}>({
  dataType() {
    return "bytea";
  },
});
