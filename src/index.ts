import { Elysia } from "elysia";
import { node } from "@elysiajs/node";
import { fetchAllUserLanguages } from "./fetch";

const app = new Elysia({ adapter: node() })
    .get("/languages/:user/all", async ({ params: { user } }) => {
        return await fetchAllUserLanguages(user);
    })
    .listen(3000, ({ hostname, port }) => {});
