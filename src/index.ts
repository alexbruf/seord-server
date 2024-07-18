import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { SeoCheck } from "seord";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

const app = new Hono();

app.get("/health", (c) => {
  return c.text("ok");
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
  const seoCheck = new SeoCheck(contentJson, "liveinabroad.com");

  // Perform analysis
  const result = seoCheck.analyzeSeo();

  return c.json(result);
});

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
