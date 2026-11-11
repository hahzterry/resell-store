import "server-only";
import { z } from "zod";
import {
  listBuyerThreads,
  listSellerThreads,
  loadThread,
  markRead,
  MAX_MESSAGE,
  sendMessage,
  startConversation,
} from "../../messages";
import { flag, idParam, notFound, page, pagination } from "../http";
import { route } from "../router";
import { apiMessage, apiThread } from "../serialize";

const group = "Messages";

const threadExample = {
  object: "thread",
  id: "t_91c…",
  with: "Jess",
  shop: { slug: "maya", name: "Maya's closet" },
  listing: {
    id: "8d1e6c2a-…",
    title: "Yellow Le Creuset dutch oven, 5.5 qt",
    photo: "https://files.resell.store/…",
    url: "https://maya.broresell.com/yellow-le-creuset-dutch-oven-5-5-qt",
  },
  preview: "Is the lid included?",
  last_from: "them",
  unread: true,
  needs_you: false,
  last_message_at: "2026-10-02T17:42:00.000Z",
};

const body = z.string().trim().min(1, "Write something first.").max(MAX_MESSAGE);

async function threadView(id: string, userId: string) {
  const t = await loadThread(idParam.parse(id), userId);
  if (!t) throw notFound("conversation");
  return {
    ...apiThread(t.summary),
    role: t.side,
    messages: t.messages.map(apiMessage),
  };
}

export const messageRoutes = [
  route({
    method: "GET",
    path: "/threads",
    group,
    access: "key",
    summary: "List conversations",
    description:
      "Conversations with buyers across your shops (`role=seller`, the default) or with shops you've written to (`role=buyer`), most recent first.",
    query: z.object({
      role: z.enum(["seller", "buyer"]).default("seller"),
      unread: flag().optional().describe("Only conversations waiting on you."),
      ...pagination,
    }),
    example: { query: "unread=true", response: { object: "list", data: [threadExample], total: 1, has_more: false } },
    handler: async ({ auth, query }) => {
      const rows = query.role === "buyer" ? await listBuyerThreads(auth!.user.id) : await listSellerThreads(auth!.user.id);
      return page(rows.filter((t) => !query.unread || t.unread).map(apiThread), query);
    },
  }),

  route({
    method: "GET",
    path: "/threads/:id",
    group,
    access: "key",
    summary: "Read a conversation",
    description:
      "The whole conversation, oldest message first. Reading it here doesn't mark it read; POST /threads/:id/read does.",
    example: {
      path: "/threads/t_91c…",
      response: {
        ...threadExample,
        role: "seller",
        messages: [
          { id: "m_1", from: "them", by_agent: false, body: "Hi! Is the lid included?", created_at: "2026-10-02T17:42:00.000Z" },
          { id: "m_2", from: "you", by_agent: false, body: "It is, and it fits snugly.", created_at: "2026-10-02T17:50:00.000Z" },
        ],
      },
    },
    handler: async ({ auth, params }) => threadView(params.id!, auth!.user.id),
  }),

  route({
    method: "POST",
    path: "/threads/:id/messages",
    group,
    access: "key",
    scope: "messages",
    summary: "Reply",
    description: "Sends a message in a conversation, from whichever side you're on. Sending also marks it read for you.",
    body: z.object({ body }),
    example: {
      path: "/threads/t_91c…/messages",
      body: { body: "It is, and it fits snugly." },
      response: { id: "m_2", from: "you", by_agent: false, body: "It is, and it fits snugly.", created_at: "2026-10-02T17:50:00.000Z" },
    },
    handler: async ({ auth, params, body: b }) => {
      const m = await sendMessage({ threadId: idParam.parse(params.id), userId: auth!.user.id, body: b.body });
      return { object: "message", ...apiMessage({ id: m.id, mine: true, byAgent: false, body: m.body, createdAt: m.createdAt.toISOString() }) };
    },
  }),

  route({
    method: "POST",
    path: "/threads/:id/read",
    group,
    access: "key",
    scope: "messages",
    summary: "Mark read",
    example: { path: "/threads/t_91c…/read", response: { ...threadExample, unread: false } },
    handler: async ({ auth, params }) => {
      const id = idParam.parse(params.id);
      await markRead({ threadId: id, userId: auth!.user.id });
      const { messages: _messages, ...rest } = await threadView(id, auth!.user.id);
      void _messages;
      return rest;
    },
  }),

  route({
    method: "POST",
    path: "/threads",
    group,
    access: "key",
    scope: "buying",
    summary: "Message a shop",
    description:
      "Writes to a shop as a buyer, about one of its listings or in general. If you've written to them about it before, the message goes in that conversation.",
    body: z.object({
      shop: z.string().min(1).max(80).describe("The shop's slug."),
      listing: z.string().max(64).optional().describe("A listing id, if it's about one."),
      body,
    }),
    example: {
      body: { shop: "maya", listing: "8d1e6c2a-…", body: "Hi! Is the lid included?" },
      response: { ...threadExample, with: "Maya's closet", role: "buyer", last_from: "you", unread: false, messages: [] },
    },
    handler: async ({ auth, body: b }) => {
      const t = await startConversation({
        buyerId: auth!.user.id,
        shopSlug: b.shop.toLowerCase(),
        listingId: b.listing ?? null,
        body: b.body,
      });
      return threadView(t.id, auth!.user.id);
    },
  }),
];
