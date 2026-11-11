import { isInputRequiredResult, McpServer, type CallToolResult } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { buyerTools } from "../src/buyer";
import { ResellApiError, ResellClient, type Account } from "../src/client";
import { createResellServer, serverInfo } from "../src/index";
import { sellerTools } from "../src/seller";
import { allowedTools, registerTools, type Scope, type ToolDef } from "../src/tools";

/*
 * The seller and buyer tool lists: names, schemas, which API path each tool
 * calls, which tools a key gets, and the "Ask me first" flow (a yes/no
 * question when the app can show one, otherwise a `confirmed: true` retry).
 */

const scopes: Scope[] = ["read", "shops", "listings", "messages", "offers", "orders", "buying", "webhooks"];

function account(over: Partial<Account["key"]> = {}): Account {
  return {
    id: "u1",
    name: "Maya",
    email: "maya@x.test",
    key: { kind: "agent", scopes: [...scopes], ask_first: [], ...over },
    shops: [{ slug: "maya", name: "Maya's closet", url: "https://maya.broresell.com" }],
  };
}

/** A client whose HTTP calls are recorded and answered with `reply`. */
function recordingClient(reply: (method: string, path: string) => unknown = () => ({ data: [], total: 0, has_more: false })) {
  const calls: { method: string; path: string; query?: unknown; body?: unknown }[] = [];
  const client = new ResellClient({
    baseUrl: "https://api.example.test/v1",
    token: "rs_live_test",
    fetch: async (input, init) => {
      const url = new URL(input);
      const method = init?.method ?? "GET";
      const path = url.pathname.replace(/^\/v1/, "");
      calls.push({
        method,
        path,
        ...(url.search ? { query: Object.fromEntries(url.searchParams) } : {}),
        ...(init?.body ? { body: JSON.parse(init.body as string) } : {}),
      });
      return new Response(JSON.stringify(reply(method, path) ?? {}), { status: 200 });
    },
  });
  return { client, calls };
}

const byName = (list: ToolDef[], name: string) => {
  const t = list.find((x) => x.name === name);
  if (!t) throw new Error(`no tool ${name}`);
  return t;
};

async function runTool(list: ToolDef[], name: string, args: Record<string, unknown>, reply?: (m: string, p: string) => unknown) {
  const t = byName(list, name);
  const { client, calls } = recordingClient(reply);
  const parsed = t.input.parse(args) as Record<string, unknown>;
  const out = await t.run(client, parsed);
  return { out, calls };
}

describe("tool definitions", () => {
  for (const [label, list] of [
    ["seller", sellerTools],
    ["buyer", buyerTools],
  ] as const) {
    it(`gives every ${label} tool a unique, MCP-safe name`, () => {
      const names = list.map((t) => t.name);
      expect(new Set(names).size).toBe(names.length);
      for (const n of names) expect(n).toMatch(/^[a-z][a-z0-9_]{1,63}$/);
    });

    it(`gives every ${label} tool a title, description, object schema and a known scope`, () => {
      for (const t of list) {
        expect(t.title.length, t.name).toBeGreaterThan(0);
        expect(t.description.length, t.name).toBeGreaterThan(10);
        expect(t.input, t.name).toBeInstanceOf(z.ZodObject);
        if (t.scope) expect(scopes, t.name).toContain(t.scope);
        // "Ask me first" hangs off the scope, so a consequential tool needs one
        if (t.consequential) expect(t.scope, t.name).toBeDefined();
        // Read-only tools never need more than "read" (or nothing, for public ones)
        if (t.readOnly) expect([undefined, "read"], t.name).toContain(t.scope);
      }
    });

    it(`turns every ${label} input schema into JSON Schema`, () => {
      for (const t of list) {
        const schema = z.toJSONSchema(t.input) as { type?: string };
        expect(schema.type, t.name).toBe("object");
      }
    });
  }

  it("keeps the public (no key) tools to looking around the marketplace", () => {
    expect(sellerTools.filter((t) => !t.scope)).toEqual([]);
    expect(buyerTools.filter((t) => !t.scope).map((t) => t.name).sort()).toEqual(
      ["browse_stores", "search", "store_reviews", "view_listing", "view_store"].sort(),
    );
  });

  it("validates inputs before anything is sent", () => {
    const offer = byName(buyerTools, "make_offer").input;
    expect(offer.safeParse({ listing: "l1", amount: 20 }).success).toBe(true);
    expect(offer.safeParse({ listing: "l1", amount: -5 }).success).toBe(false);
    expect(offer.safeParse({ listing: "l1", amount: 200_000 }).success).toBe(false);
    expect(offer.safeParse({ listing: "", amount: 20 }).success).toBe(false);
    expect(offer.safeParse({ amount: 20 }).success).toBe(false);

    const search = byName(buyerTools, "search").input;
    expect(search.safeParse({ q: "dutch oven", price: "over-100" }).success).toBe(true);
    expect(search.safeParse({ price: "cheap" }).success).toBe(false);
    expect(search.safeParse({ limit: 61 }).success).toBe(false);

    const create = byName(sellerTools, "create_listing").input;
    expect(create.safeParse({ prompt: "yellow dutch oven", price: 185, fields: { Brand: "Le Creuset" } }).success).toBe(true);
    expect(create.safeParse({ title: "x".repeat(81) }).success).toBe(false);
    expect(create.safeParse({ photo_urls: ["not a url"] }).success).toBe(false);

    const ship = byName(sellerTools, "mark_shipped").input;
    expect(ship.safeParse({ id: "o1", tracking_number: "9400" }).success).toBe(true);
    expect(ship.safeParse({ tracking_number: "9400" }).success).toBe(false);
  });

  it("lists both servers with their own name, instructions and tools", () => {
    expect(serverInfo.seller.tools).toBe(sellerTools);
    expect(serverInfo.buyer.tools).toBe(buyerTools);
    expect(serverInfo.seller.name).not.toBe(serverInfo.buyer.name);
    expect(serverInfo.seller.instructions).toContain("whats_waiting");
    expect(serverInfo.buyer.instructions).toContain("get_checkout_link");
  });
});

describe("tool handlers call the right API path", () => {
  it("make_offer posts the offer and slims the answer", async () => {
    const { out, calls } = await runTool(buyerTools, "make_offer", { listing: "l1", amount: 150, note: "Pick up Sat?" }, () => ({
      id: "o1",
      status: "open",
      amount: 150,
      listing: { id: "l1", title: "Dutch oven", price: 185, url: "https://maya.broresell.com/oven" },
      shop: { name: "Maya's closet" },
      secret_field: "x",
    }));
    expect(calls).toEqual([{ method: "POST", path: "/offers", body: { listing: "l1", amount: 150, note: "Pick up Sat?" } }]);
    expect(out).toMatchObject({ id: "o1", status: "open", shop: "Maya's closet", listing: { id: "l1", price: 185 } });
    expect(out).not.toHaveProperty("secret_field");
  });

  it("answer_counter takes or turns down the counter", async () => {
    expect((await runTool(buyerTools, "answer_counter", { id: "o1", accept: true })).calls[0]).toMatchObject({
      method: "POST",
      path: "/offers/o1/accept-counter",
    });
    expect((await runTool(buyerTools, "answer_counter", { id: "o1", accept: false })).calls[0]).toMatchObject({
      method: "POST",
      path: "/offers/o1/decline-counter",
    });
  });

  it("my_offers and list_offers ask for the right side", async () => {
    expect((await runTool(buyerTools, "my_offers", { status: "countered" })).calls[0]).toMatchObject({
      method: "GET",
      path: "/offers",
      query: { role: "buyer", status: "countered" },
    });
    const seller = await runTool(sellerTools, "list_offers", { limit: 5 });
    expect(seller.calls[0]).toMatchObject({ method: "GET", path: "/offers", query: { role: "seller", limit: "5" } });
    expect(seller.out).toEqual({ total: 0, has_more: false, items: [] });
  });

  it("seller offer answers go to accept, decline and counter", async () => {
    expect((await runTool(sellerTools, "accept_offer", { id: "o1" })).calls[0]).toMatchObject({ method: "POST", path: "/offers/o1/accept" });
    expect((await runTool(sellerTools, "decline_offer", { id: "o1" })).calls[0]).toMatchObject({ method: "POST", path: "/offers/o1/decline" });
    expect((await runTool(sellerTools, "counter_offer", { id: "o1", amount: 170 })).calls[0]).toEqual({
      method: "POST",
      path: "/offers/o1/counter",
      body: { amount: 170 },
    });
  });

  it("buying tools hit checkout, orders and confirm", async () => {
    expect((await runTool(buyerTools, "get_checkout_link", { listing: "l1" })).calls[0]).toEqual({
      method: "POST",
      path: "/checkout",
      body: { listing: "l1" },
    });
    expect((await runTool(buyerTools, "my_orders", {})).calls[0]).toMatchObject({ method: "GET", path: "/orders" });
    expect((await runTool(buyerTools, "confirm_delivery", { id: "ord1" })).calls[0]).toMatchObject({
      method: "POST",
      path: "/orders/ord1/confirm",
    });
  });

  it("likes and follows use PUT and DELETE", async () => {
    expect((await runTool(buyerTools, "like_listing", { id: "l1" })).calls[0]).toMatchObject({ method: "PUT", path: "/market/listings/l1/like" });
    expect((await runTool(buyerTools, "unlike_listing", { id: "l1" })).calls[0]).toMatchObject({ method: "DELETE", path: "/market/listings/l1/like" });
    expect((await runTool(buyerTools, "follow_store", { store: "maya" })).calls[0]).toMatchObject({ method: "PUT", path: "/market/stores/maya/follow" });
  });

  it("update_shop and update_listing send only the changes, not the id", async () => {
    expect((await runTool(sellerTools, "update_shop", { shop: "maya", about: "Hi" })).calls[0]).toEqual({
      method: "PATCH",
      path: "/shops/maya",
      body: { about: "Hi" },
    });
    expect((await runTool(sellerTools, "update_listing", { id: "l1", price: 99 })).calls[0]).toEqual({
      method: "PATCH",
      path: "/listings/l1",
      body: { price: 99 },
    });
  });

  it("whats_waiting reads /inbox and keeps it short", async () => {
    const { out, calls } = await runTool(sellerTools, "whats_waiting", {}, () => ({
      offers_to_answer: [{ id: "o1", status: "open", amount: 20, buyer: { name: "Jess" }, listing: { id: "l1", title: "Dress", price: 24 } }],
      sales_to_ship: [{ id: "s1", status: "paid", total: 33, buyer: { name: "Priya" }, listing: { id: "l2", title: "Vase" }, payout: { seller_net: 29.5 } }],
      unread_threads: 2,
    }));
    expect(calls).toEqual([{ method: "GET", path: "/inbox" }]);
    expect(out).toMatchObject({
      offers_to_answer: [{ id: "o1", from: "Jess", listing: { title: "Dress" } }],
      sales_to_ship: [{ id: "s1", buyer: "Priya", you_get: 29.5 }],
      unread_conversations: 2,
    });
  });

  it("reply_to_buyer sends the reply then marks the conversation read", async () => {
    const { calls } = await runTool(sellerTools, "reply_to_buyer", { id: "t1", body: "Yes, it ships Monday." });
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual(["POST /threads/t1/messages", "POST /threads/t1/read"]);
  });

  it("encodes ids so they stay one path segment", async () => {
    expect((await runTool(sellerTools, "get_listing", { id: "a/b" })).calls[0]!.path).toBe("/listings/a%2Fb");
  });

  it("refuses dot ids that would climb out of the path", async () => {
    // remove_photo with photo_id ".." would otherwise DELETE /listings/l1 itself, skipping "Ask me first"
    for (const bad of ["..", ".", " .. ", "  "]) {
      await expect(runTool(sellerTools, "remove_photo", { id: "l1", photo_id: bad })).rejects.toBeInstanceOf(ResellApiError);
    }
  });
});

describe("allowedTools", () => {
  it("offers only public tools without a key", () => {
    expect(allowedTools(buyerTools, { account: null }).map((t) => t.name).sort()).toEqual(
      ["browse_stores", "search", "store_reviews", "view_listing", "view_store"].sort(),
    );
    expect(allowedTools(sellerTools, { account: null })).toEqual([]);
  });

  it("offers only the tools the key's scopes cover", () => {
    const readOnly = allowedTools(sellerTools, { account: account({ scopes: ["read"] }) });
    expect(readOnly.length).toBeGreaterThan(0);
    expect(readOnly.every((t) => t.scope === "read")).toBe(true);

    const all = allowedTools(sellerTools, { account: account() });
    expect(all).toHaveLength(sellerTools.length);

    const noBuying = allowedTools(buyerTools, { account: account({ scopes: ["read"] }) }).map((t) => t.name);
    expect(noBuying).toContain("search");
    expect(noBuying).toContain("my_orders");
    expect(noBuying).not.toContain("make_offer");
  });
});

/* registerTools against a stand-in server that records what's registered */

type Handler = (args: Record<string, unknown>, ctx: unknown) => Promise<CallToolResult>;

function fakeServer(capabilities: Record<string, unknown> | undefined = {}, clientInfo?: { name: string; version: string }) {
  const tools = new Map<string, { config: { description: string; inputSchema: z.ZodObject; annotations: Record<string, unknown> }; handler: Handler }>();
  const server = {
    registerTool: (name: string, config: never, handler: Handler) => tools.set(name, { config, handler }),
    server: { getClientCapabilities: () => capabilities, getClientVersion: () => clientInfo },
  };
  return { server: server as unknown as McpServer, tools };
}

const ctx = (mcpReq: Record<string, unknown> = {}) => ({ mcpReq: { envelope: undefined, inputResponses: undefined, ...mcpReq } });

function stubTool(over: Partial<ToolDef> = {}) {
  const run = vi.fn(async (_c: ResellClient, args: Record<string, unknown>) => ({ done: true, args }));
  const def: ToolDef = {
    name: "make_offer",
    title: "Make an offer",
    description: "Offers a price.",
    input: z.object({ listing: z.string(), amount: z.number() }),
    scope: "buying",
    consequential: true,
    confirmMessage: (a) => `Offer $${a.amount} on this listing?`,
    run,
    ...over,
  };
  return { def, run };
}

const textOf = (r: CallToolResult) => (r.content[0] as { text: string }).text;
const client = new ResellClient({ baseUrl: "https://api.example.test/v1", fetch: async () => new Response("{}") });

describe("registerTools", () => {
  it("registers only allowed tools, with annotations from the definition", () => {
    const { server, tools } = fakeServer();
    registerTools(server, client, sellerTools, { account: account({ scopes: ["read", "listings"] }) });
    expect(tools.has("list_listings")).toBe(true);
    expect(tools.has("delete_listing")).toBe(true);
    expect(tools.has("accept_offer")).toBe(false);
    expect(tools.get("list_listings")!.config.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false });
    expect(tools.get("delete_listing")!.config.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: true });
  });

  it("runs a tool straight away when its scope isn't set to ask first", async () => {
    const { def, run } = stubTool();
    const { server, tools } = fakeServer();
    registerTools(server, client, [def], { account: account({ ask_first: ["offers"] }) });
    const t = tools.get("make_offer")!;
    expect(Object.keys(t.config.inputSchema.shape)).not.toContain("confirmed");
    const out = await t.handler({ listing: "l1", amount: 20 }, ctx());
    expect(run).toHaveBeenCalledOnce();
    expect(JSON.parse(textOf(out))).toEqual({ done: true, args: { listing: "l1", amount: 20 } });
    expect(out.isError).toBeUndefined();
  });

  it("never asks first for a tool that isn't consequential", async () => {
    const { def, run } = stubTool({ name: "withdraw_offer", consequential: false });
    const { server, tools } = fakeServer();
    registerTools(server, client, [def], { account: account({ ask_first: ["buying"] }) });
    await tools.get("withdraw_offer")!.handler({ listing: "l1", amount: 20 }, ctx());
    expect(run).toHaveBeenCalledOnce();
  });

  it("adds a confirmed field and a note to the description when the owner asks first", () => {
    const { def } = stubTool();
    const { server, tools } = fakeServer();
    registerTools(server, client, [def], { account: account({ ask_first: ["buying"] }) });
    const t = tools.get("make_offer")!;
    expect(Object.keys(t.config.inputSchema.shape)).toContain("confirmed");
    expect(t.config.description).toContain("call with confirmed: true");
  });

  it("without elicitation, tells the model to ask and retry with confirmed: true", async () => {
    const { def, run } = stubTool();
    const { server, tools } = fakeServer({});
    registerTools(server, client, [def], { account: account({ ask_first: ["buying"] }) });
    const out = await tools.get("make_offer")!.handler({ listing: "l1", amount: 20 }, ctx());
    expect(run).not.toHaveBeenCalled();
    expect(textOf(out)).toContain('Ask them: "Offer $20 on this listing?"');
    expect(textOf(out)).toContain("call make_offer again with confirmed: true");
  });

  it("runs once the model retries with confirmed: true, without passing confirmed on", async () => {
    const { def, run } = stubTool();
    const { server, tools } = fakeServer({});
    registerTools(server, client, [def], { account: account({ ask_first: ["buying"] }) });
    await tools.get("make_offer")!.handler({ listing: "l1", amount: 20, confirmed: true }, ctx());
    expect(run).toHaveBeenCalledOnce();
    expect(run.mock.calls[0]![1]).toEqual({ listing: "l1", amount: 20 });
  });

  it("uses a default question when the tool doesn't have one", async () => {
    const { def } = stubTool({ name: "relist", title: "Relist", scope: "listings", confirmMessage: undefined });
    const { server, tools } = fakeServer({});
    registerTools(server, client, [def], { account: account({ ask_first: ["listings"] }) });
    expect(textOf(await tools.get("relist")!.handler({}, ctx()))).toContain('"Go ahead: relist?"');
  });

  it("asks the owner directly when the app supports elicitation", async () => {
    const { def, run } = stubTool();
    const { server, tools } = fakeServer({ elicitation: {} });
    registerTools(server, client, [def], { account: account({ ask_first: ["buying"] }) });
    const out = await tools.get("make_offer")!.handler({ listing: "l1", amount: 20 }, ctx());
    expect(run).not.toHaveBeenCalled();
    expect(isInputRequiredResult(out)).toBe(true);
    expect(JSON.stringify(out)).toContain("Offer $20 on this listing?");
    expect(JSON.stringify(out)).toContain("approve");
  });

  it("reads elicitation support from the request envelope when it's there", async () => {
    const { def } = stubTool();
    const { server, tools } = fakeServer({}); // the server-wide capabilities say no…
    registerTools(server, client, [def], { account: account({ ask_first: ["buying"] }) });
    const t = tools.get("make_offer")!;
    // …but this request's envelope says yes
    const yes = await t.handler({ listing: "l1", amount: 20 }, ctx({ envelope: { "io.modelcontextprotocol/clientCapabilities": { elicitation: {} } } }));
    expect(isInputRequiredResult(yes)).toBe(true);
    const no = await t.handler({ listing: "l1", amount: 20 }, ctx({ envelope: { "io.modelcontextprotocol/clientCapabilities": {} } }));
    expect(isInputRequiredResult(no)).toBe(false);
    expect(textOf(no)).toContain("confirmed: true");
  });

  it("goes ahead when the owner approves in the app", async () => {
    const { def, run } = stubTool();
    const { server, tools } = fakeServer({ elicitation: {} });
    registerTools(server, client, [def], { account: account({ ask_first: ["buying"] }) });
    const out = await tools.get("make_offer")!.handler(
      { listing: "l1", amount: 20 },
      ctx({ inputResponses: { approve: { action: "accept", content: { approve: true } } } }),
    );
    expect(run).toHaveBeenCalledOnce();
    expect(JSON.parse(textOf(out))).toMatchObject({ done: true });
  });

  it("changes nothing when the owner declines, cancels or leaves the box unticked", async () => {
    for (const response of [
      { action: "decline" },
      { action: "cancel" },
      { action: "accept", content: { approve: false } },
      { action: "accept" },
    ]) {
      const { def, run } = stubTool();
      const { server, tools } = fakeServer({ elicitation: {} });
      registerTools(server, client, [def], { account: account({ ask_first: ["buying"] }) });
      const out = await tools.get("make_offer")!.handler({ listing: "l1", amount: 20 }, ctx({ inputResponses: { approve: response } }));
      expect(run).not.toHaveBeenCalled();
      expect(textOf(out)).toBe("The owner said no, so nothing was changed.");
    }
  });

  it("tells the API which app and tool made the call, and whether the owner said yes first", async () => {
    const seen: Record<string, string>[] = [];
    const tagging = new ResellClient({
      baseUrl: "https://api.example.test/v1",
      fetch: async (_input, init) => {
        seen.push(init?.headers as Record<string, string>);
        return new Response("{}");
      },
    });
    const def = stubTool({ run: async (c) => c.post("/offers", {}) }).def;
    const { server, tools } = fakeServer({ elicitation: {} }, { name: "claude-ai", version: "1" });
    registerTools(server, tagging, [def], { account: account({ ask_first: ["buying"] }) });
    await tools.get("make_offer")!.handler(
      { listing: "l1", amount: 20 },
      ctx({ inputResponses: { approve: { action: "accept", content: { approve: true } } } }),
    );
    expect(seen[0]).toMatchObject({ "resell-tool": "make_offer", "resell-client": "claude-ai", "resell-asked-first": "1" });

    const plain = fakeServer({}, undefined);
    registerTools(plain.server, tagging, [def], { account: account() });
    await plain.tools.get("make_offer")!.handler(
      { listing: "l1", amount: 20 },
      ctx({ envelope: { "io.modelcontextprotocol/clientInfo": { name: "openai-mcp", version: "1" } } }),
    );
    expect(seen[1]).toMatchObject({ "resell-tool": "make_offer", "resell-client": "openai-mcp" });
    expect(seen[1]).not.toHaveProperty("resell-asked-first");
  });

  it("turns API errors into readable tool errors", async () => {
    const { def } = stubTool({
      consequential: false,
      run: async () => {
        throw new ResellApiError(409, "conflict", "That's the asking price. Just buy it.");
      },
    });
    const { server, tools } = fakeServer();
    registerTools(server, client, [def], { account: account() });
    const out = await tools.get("make_offer")!.handler({}, ctx());
    expect(out.isError).toBe(true);
    expect(textOf(out)).toBe("That's the asking price. Just buy it.");
  });

  it("turns validation errors into the first issue's message", async () => {
    const { def } = stubTool({
      consequential: false,
      run: async () => z.object({ amount: z.number({ error: "Amount must be a number." }) }).parse({ amount: "x" }),
    });
    const { server, tools } = fakeServer();
    registerTools(server, client, [def], { account: account() });
    const out = await tools.get("make_offer")!.handler({}, ctx());
    expect(out.isError).toBe(true);
    expect(textOf(out)).toBe("Amount must be a number.");
  });

  it("hides unexpected errors behind a try-again message", async () => {
    const { def } = stubTool({
      consequential: false,
      run: async () => {
        throw new TypeError("fetch failed: ECONNREFUSED 10.0.0.1");
      },
    });
    const { server, tools } = fakeServer();
    registerTools(server, client, [def], { account: account() });
    const out = await tools.get("make_offer")!.handler({}, ctx());
    expect(out.isError).toBe(true);
    expect(textOf(out)).toBe("Something went wrong talking to resell.store. Try again in a moment.");
  });
});

describe("createResellServer", () => {
  afterEach(() => vi.restoreAllMocks());

  it("looks up the key with /me and registers only what it may do", async () => {
    const spy = vi.spyOn(McpServer.prototype, "registerTool");
    const me = account({ scopes: ["read"] });
    const { client: c, calls } = recordingClient(() => me);
    const server = await createResellServer("seller", c);
    expect(server).toBeInstanceOf(McpServer);
    expect(calls).toEqual([{ method: "GET", path: "/me" }]);
    const names = spy.mock.calls.map((args) => args[0]);
    expect(names).toContain("whats_waiting");
    expect(names).not.toContain("accept_offer");
  });

  it("skips /me when the account is passed in, and serves public tools with none", async () => {
    const spy = vi.spyOn(McpServer.prototype, "registerTool");
    const { client: c, calls } = recordingClient();
    await createResellServer("buyer", c, { account: null });
    expect(calls).toEqual([]);
    expect(spy.mock.calls.map((args) => args[0]).sort()).toEqual(["browse_stores", "search", "store_reviews", "view_listing", "view_store"]);
  });
});
