const { base } = require("../lib/api");

/* Hidden: fills the Shop dropdown on every trigger (GET /shops). */

module.exports = {
  key: "shop",
  noun: "Shop",
  display: { label: "Shops", description: "Lists your shops, for choosing one.", hidden: true },
  operation: {
    perform: async (z) => {
      const response = await z.request({ url: `${base()}/shops` });
      return response.data.data.map((s) => ({ id: s.slug, slug: s.slug, name: s.name, url: s.url }));
    },
    sample: { id: "maya", slug: "maya", name: "Maya's closet", url: "https://maya.broresell.com" },
  },
};
