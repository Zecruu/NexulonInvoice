import type mongoose from "mongoose";

type MongooseModule = typeof mongoose;

declare global {
  // eslint-disable-next-line no-var
  var mongoose: {
    conn: MongooseModule | null;
    promise: Promise<MongooseModule> | null;
  };
}

export {};
