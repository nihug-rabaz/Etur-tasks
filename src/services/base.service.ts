import { NeonDatabase } from "@/lib/db/neon";

export abstract class BaseService {
  protected getDb() {
    return NeonDatabase.createClient();
  }
}
