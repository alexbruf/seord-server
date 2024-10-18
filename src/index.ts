import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { SeoCheck } from "seord";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import {parseHTML} from 'linkedom';
function JSDOM(html: string) { return parseHTML(html); }
const app = new Hono();

app.get("/health", (c) => {
  return c.text("ok");
});

app.post("/html", async (c) => {
  // overrides for grabbing stuff from the body
  const body = await c.req.json<{
    document: string;
    title?: string;
    keyword: string;
    subKeywords?: string[];
    metaDescription?: string;
  }>();

  const dom = JSDOM(body.document);
  let title =
    body.title ??
    dom.window.document.title ??
    dom.window.document.querySelector("h1")?.textContent ??
    "";
  if (!title) {
    title = "No Title Found";
  }

  let keyword = body.keyword;

  let subKeywords =
    body.subKeywords ??
    Array.from(dom.window.document.querySelectorAll("meta"))
      .filter(
        (m) =>
          (m.attributes.getNamedItem("name") || {}).textContent === "keywords",
      )
      .map((m) => m.content)?.[0]?.split(",") ??
    [];

  let metaDescription =
    body.metaDescription ??
    Array.from(dom.window.document.querySelectorAll("meta"))
      .filter(
        (m) =>
          (m.attributes.getNamedItem("name") || {}).textContent ===
          "description",
      )
      .map((m) => m.content)?.[0] ??
    "";

  const contentJson = {
    title,
    htmlText: body.document,
    keyword,
    subKeywords,
    metaDescription,
    languageCode: "en",
    countryCode: "us",
  };

  const seoCheck = new SeoCheck(contentJson, "website.com");

  // Perform analysis
  const result = await seoCheck.analyzeSeo();

  return c.json(result);
});

app.post("/", async (c) => {
  const body = await c.req.json<{
    markdown: string;
    title: string;
    keyword: string;
    subKeywords?: string[];
    metaDescription?: string;
  }>();

  const {
    markdown,
    title,
    keyword,
    subKeywords = [],
    metaDescription = "",
  } = body;

  const htmlContent = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdown)
    .then((f) => String(f));

  const contentJson = {
    title,
    htmlText: htmlContent,
    keyword,
    subKeywords,
    metaDescription,
    languageCode: "en",
    countryCode: "us",
  };

  // Initialize SeoCheck with html content, main keyword and sub keywords
  const seoCheck = new SeoCheck(contentJson, "website.com");

  // Perform analysis
  const result = await seoCheck.analyzeSeo();

  return c.json(result);
});

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
