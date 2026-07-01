import { readFile, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pages = ["index.html", "about/index.html", "apps/index.html", "support/index.html", "privacy/index.html", "contact/index.html"];
const requiredLinks = ["About", "Apps", "Support", "Privacy", "Contact"];
const forbidden = [
  /lorem ipsum/i,
  /street address/i,
  new RegExp("\\bE" + "IN\\b", "i"),
  /available (now|today) on/i,
  /outlook\.com/i,
  /once active/i,
  /temporary fallback/i,
  /\bintended\b/i,
];

let failures = 0;
for (const page of pages) {
  const path = resolve(root, page);
  await access(path);
  const html = await readFile(path, "utf8");
  if (!/<title>[^<]+<\/title>/.test(html)) {
    console.error(`${page}: missing title`);
    failures++;
  }
  for (const label of requiredLinks) {
    if (!html.includes(`>${label}<`) && !(label === "Privacy" && html.includes(">Privacy Policy<"))) {
      console.error(`${page}: missing navigation label ${label}`);
      failures++;
    }
  }
  for (const pattern of forbidden) {
    if (pattern.test(html)) {
      console.error(`${page}: forbidden content matched ${pattern}`);
      failures++;
    }
  }
  if (/<script\b/i.test(html)) {
    console.error(`${page}: scripts are not expected in this static site`);
    failures++;
  }
  const references = [
    ...html.matchAll(/(?:href|src)="([^"]+)"/g),
  ].map((match) => match[1]);
  for (const reference of references) {
    if (/^(https?:|mailto:|#|data:)/.test(reference)) continue;
    const clean = reference.split("#")[0].split("?")[0];
    if (!clean) continue;
    const target = clean.endsWith("/") ? `${clean}index.html` : clean;
    try {
      await access(resolve(dirname(path), target));
    } catch {
      console.error(`${page}: broken local reference ${reference}`);
      failures++;
    }
  }
}

if (failures) {
  console.error(`Validation failed with ${failures} issue(s).`);
  process.exit(1);
}
console.log(`Validated ${pages.length} pages with no broken local links or forbidden placeholder content.`);
