// Render an app's Markdown policy (privacy policy, terms) into a page that
// matches this site, so the hosted copy is generated from the app repo's
// source of truth instead of being retyped.
//
// Usage (from this folder's root):
//   node scripts/render-app-policy.mjs <source.md> <out/dir> "<App Name>" "<Page title>" "<one-line description>"
// Example:
//   node scripts/render-app-policy.mjs ../ClosetCraft/PRIVACY_POLICY.md closet-crafter/privacy "Closet Crafter" "Privacy Policy" "How Closet Crafter handles your data."
//
// Supports the Markdown the policies use: # / ## / ### headings, paragraphs,
// "-" bullets (one nesting level), "> " callouts, **bold**, _italic_ lines,
// [text](url) and <url> links. Nothing else, on purpose: no dependencies.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const [src, outDir, appName, pageTitle, description] = process.argv.slice(2);
if (!src || !outDir || !appName || !pageTitle || !description) {
  console.error("usage: node scripts/render-app-policy.mjs <source.md> <out/dir> <App Name> <Page title> <description>");
  process.exit(2);
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = resolve(root, outDir, "index.html");
const up = relative(dirname(outPath), root).split("\\").join("/") + "/";
const canonical = `https://monkeynautlabs.com/${outDir.replace(/^\/|\/$/g, "")}/`;

const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function inline(text) {
  const links = [];
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    links.push([label, url]);
    return `\u0000${links.length - 1}\u0000`;
  });
  text = text.replace(/<(https?:\/\/[^>]+)>/g, (_, url) => {
    links.push([url, url]);
    return `\u0000${links.length - 1}\u0000`;
  });
  text = esc(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|\s)_([^_]+)_(?=\s|$|[.,;:])/g, "$1<em>$2</em>")
    .replace(/\b([\w.+-]+@[\w-]+\.[\w.]+)\b/g, '<a class="email-link" href="mailto:$1">$1</a>');
  return text.replace(/\u0000(\d+)\u0000/g, (_, i) => {
    const [label, url] = links[Number(i)];
    return `<a href="${esc(url)}">${inline(label)}</a>`;
  });
}

const md = (await readFile(resolve(process.cwd(), src), "utf8")).replace(/\r\n/g, "\n");
const lines = md.split("\n");
let title = pageTitle;
let meta = "";
const sections = []; // { id, heading, html[] }
let intro = [];
let current = null;
const target = () => (current ? current.html : intro);

let i = 0;
// GitHub's heading ids, so the policies' own "#4-childrens-privacy-coppa" links work.
const slug = (h) => h.toLowerCase().replace(/[^a-z0-9 -]/g, "").trim().replace(/ /g, "-");
while (i < lines.length) {
  const line = lines[i];
  if (!line.trim()) { i++; continue; }
  if (line.startsWith("# ")) { title = line.slice(2).trim(); i++; continue; }
  if (/^_.*_$/.test(line.trim()) && !meta) { meta = line.trim().slice(1, -1); i++; continue; }
  if (line.startsWith("## ")) {
    const heading = line.slice(3).trim();
    current = { id: slug(heading), heading, html: [] };
    sections.push(current);
    i++; continue;
  }
  if (line.startsWith("### ")) { target().push(`<h3>${inline(line.slice(4).trim())}</h3>`); i++; continue; }
  if (line.startsWith(">")) {
    const block = [];
    while (i < lines.length && lines[i].startsWith(">")) { block.push(lines[i].replace(/^>\s?/, "")); i++; }
    const text = block.join(" ").replace(/^#+\s*/, "").trim();
    target().push(`<p class="policy-callout">${inline(text)}</p>`);
    continue;
  }
  if (/^\s*- /.test(line)) {
    const items = [];
    while (i < lines.length && (/^\s*- /.test(lines[i]) || (/^\s+\S/.test(lines[i]) && items.length))) {
      const l = lines[i];
      const m = l.match(/^(\s*)- (.*)$/);
      if (m) items.push({ depth: m[1].length >= 2 ? 1 : 0, text: m[2] });
      else items[items.length - 1].text += " " + l.trim();
      i++;
    }
    let html = "<ul>";
    let open = false;
    items.forEach((it, idx) => {
      if (it.depth === 0) {
        if (open) { html += "</ul></li>"; open = false; } else if (idx) html += "</li>";
        html += `<li>${inline(it.text)}`;
      } else {
        if (!open) { html += "<ul>"; open = true; }
        html += `<li>${inline(it.text)}</li>`;
      }
    });
    html += open ? "</ul></li></ul>" : "</li></ul>";
    target().push(html);
    continue;
  }
  const para = [];
  while (i < lines.length && lines[i].trim() && !/^(#|>|\s*- )/.test(lines[i])) { para.push(lines[i].trim()); i++; }
  target().push(`<p>${inline(para.join(" "))}</p>`);
}

const docTitle = `${appName} ${pageTitle} — Monkeynaut Labs LLC`;
const nav = sections.map((s) => `<li><a href="#${s.id}">${inline(s.heading.replace(/^\d+[a-z]?\.\s*/, ""))}</a></li>`).join("");
const body = sections.map((s) => `<section id="${s.id}"><h2>${inline(s.heading)}</h2>${s.html.join("")}</section>`).join("\n        ");
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${esc(description)}">
  <title>${esc(docTitle)}</title>
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Monkeynaut Labs LLC">
  <meta property="og:title" content="${esc(docTitle)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="/assets/og/monkeynaut-labs-og-preview.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="${canonical}"><link rel="icon" href="${up}favicon.ico" sizes="any"><link rel="icon" href="${up}assets/favicon/favicon-32x32.png" type="image/png" sizes="32x32"><link rel="apple-touch-icon" href="${up}assets/favicon/apple-touch-icon.png"><link rel="stylesheet" href="${up}assets/styles.css?v=20260701">
</head>
<body>
  <header class="site-header"><div class="shell header-inner"><a class="header-brand" href="${up}" aria-label="Monkeynaut Labs home"><img class="header-logo" src="${up}assets/brand/monkeynaut-labs-header-logo.png" alt="Monkeynaut Labs"></a><nav class="nav" aria-label="Primary navigation"><a href="${up}">Home</a><a href="${up}about/">About</a><a href="${up}apps/">Apps</a><a href="${up}support/">Support</a><a href="${up}privacy/">Privacy</a><a href="${up}contact/">Contact</a></nav></div></header>
  <main>
    <section class="shell page-hero"><div><h1>${esc(appName)} ${esc(pageTitle)}</h1><p class="policy-meta">${inline(meta)}</p></div></section>
    <section class="shell section policy-layout">
      <nav aria-label="${esc(pageTitle)} sections"><ul class="policy-nav">${nav}</ul></nav>
      <div class="policy-sections">
        ${intro.length ? `<section id="overview">${intro.join("")}</section>\n        ` : ""}${body}
      </div>
    </section>
  </main>
  <footer class="site-footer"><div class="shell"><div class="footer-main"><div class="footer-brand"><a class="brand" href="${up}"><img src="${up}assets/brand-mark.svg" alt="">Monkeynaut Labs LLC</a><p>Independent software and app development based in Alabama.</p></div><nav class="footer-nav" aria-label="Footer navigation"><a href="${up}about/">About</a><a href="${up}apps/">Apps</a><a href="${up}support/">Support</a><a href="${up}privacy/">Privacy Policy</a><a href="${up}contact/">Contact</a></nav></div><div class="footer-bottom"><span>© 2026 Monkeynaut Labs LLC</span><span>Alabama, United States</span></div></div></footer>
</body>
</html>
`;
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, html);
console.log(`Wrote ${relative(root, outPath)} (${sections.length} sections)`);
