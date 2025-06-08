import { Elysia } from "elysia";
import { node } from "@elysiajs/node";

const app = new Elysia({ adapter: node() })
    .listen(3000, ({ hostname, port }) => {});
