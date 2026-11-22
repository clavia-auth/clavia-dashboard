import { InMemorySessionStore } from "../support/fakes";
import { sessionStoreContract } from "../support/session-store-contract";

const store = new InMemorySessionStore();

sessionStoreContract("InMemorySessionStore", () => store);
