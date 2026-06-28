# Monkeynaut Labs LLC Website

Dependency-free static website for `monkeynautlabs.com`.

## Local preview

From this directory:

```sh
python3 -m http.server 8080
```

Then open `http://localhost:8080/`.

## Validation and build

No build step is required. The deployable output is this directory.

Run the local validator:

```sh
node scripts/validate.mjs
```

If `node` is not available on your command path, use any current Node.js installation. The validator uses only built-in Node modules.

## Deploy to Cloudflare Pages

1. Create a Cloudflare Pages project from this folder or its Git repository.
2. Framework preset: `None`.
3. Build command: leave blank.
4. Build output directory: `/` when this folder is the repository root, otherwise set it to `monkeynautlabs-site`.
5. Deploy and verify every route on the generated `pages.dev` address.
6. Only after verification, add `monkeynautlabs.com` and `www.monkeynautlabs.com` as custom domains in Pages.
7. Follow Cloudflare’s displayed website-record instructions for the apex/root and `www` only.

## Deploy to GitHub Pages

1. Put these files at the root of a dedicated repository, or publish this directory with a Pages workflow.
2. In repository Settings → Pages, choose the deployment source.
3. Verify the generated `github.io` site and all routes.
4. Add `monkeynautlabs.com` as the custom domain in GitHub Pages.
5. Follow GitHub’s current instructions for the apex/root website record and the `www` record only.

Relative navigation paths are used so the site works during project-site testing as well as on a custom domain.

## DNS and service safety

- Do not touch MX, SPF, DKIM, TXT, Microsoft 365, hosted-email, verification, or other email-related records.
- Website migration should affect only the apex/root website record and the `www` record.
- Do not change DNS until the new deployment has been tested on its temporary Cloudflare Pages or GitHub Pages address.
- Do not cancel the ZenBusiness website builder or other ZenBusiness services until the new site is live on both root and `www`, HTTPS works, every route is verified, and email delivery is confirmed unaffected.
- Current DNS values are context only and are not modified by this project.
