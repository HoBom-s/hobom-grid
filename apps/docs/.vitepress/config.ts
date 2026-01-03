import { defineConfig } from "vitepress";

export default defineConfig({
  title: "HoBom Grid",
  titleTemplate: "HoBom Grid",
  description: "Headless grid core + adapters",
  ignoreDeadLinks: true,

  themeConfig: {
    siteTitle: "HoBom Grid",

    nav: [
      { text: "Guide", link: "/" },
      { text: "API", link: "/reference/" },
    ],

    sidebar: {
      "/": [{ text: "Guide", items: [{ text: "Introduction", link: "/" }] }],
      "/reference/": [
        {
          text: "Reference",
          items: [
            { text: "API Reference", link: "/reference/" },
            { text: "Functions", link: "/reference/functions/" },
            { text: "Type Aliases", link: "/reference/type-aliases/" },
          ],
        },
      ],
    },
  },
});
