import { defineConfig } from "vitepress";

export default defineConfig({
  title: "hobom-grid",
  description: "Headless grid core + adapters",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/" },
      { text: "API", link: "/reference/" },
    ],
    sidebar: {
      "/": [
        { text: "Guide", items: [{ text: "Introduction", link: "/" }] },
        { text: "Reference", items: [{ text: "API Reference", link: "/reference/" }] },
      ],
    },
  },
});
