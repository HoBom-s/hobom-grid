import { defineConfig } from "vitepress";

export default defineConfig({
  title: "HoBom Grid",
  titleTemplate: "HoBom Grid",
  description: "Headless data grid engine with a React adapter",
  ignoreDeadLinks: true,

  themeConfig: {
    siteTitle: "HoBom Grid",

    nav: [
      { text: "Guide", link: "/docs/getting-started" },
      { text: "API Reference", link: "/reference/" },
    ],

    sidebar: {
      "/docs/": [
        {
          text: "Getting Started",
          items: [{ text: "Introduction", link: "/docs/getting-started" }],
        },
        {
          text: "Guide",
          items: [
            { text: "Grid Component", link: "/docs/guide/grid" },
            { text: "Data Pipeline", link: "/docs/guide/data-pipeline" },
            { text: "Editing System", link: "/docs/guide/editing" },
            { text: "Column Features", link: "/docs/guide/column-features" },
            { text: "Row Features", link: "/docs/guide/row-features" },
            { text: "Ecosystem", link: "/docs/guide/ecosystem" },
          ],
        },
      ],
      "/reference/": [
        {
          text: "API Reference",
          items: [
            { text: "Overview", link: "/reference/" },
            { text: "Functions", link: "/reference/functions/" },
            { text: "Type Aliases", link: "/reference/type-aliases/" },
            { text: "Variables", link: "/reference/variables/" },
          ],
        },
      ],
    },

    socialLinks: [{ icon: "github", link: "https://github.com/HoBom-s/hobom-grid" }],
  },
});
