# Kaeru's Kitchen Hub

This is a simple [Next.js](https://nextjs.org/) Template.

## Getting Started

First, install deps:

```bash
pnpm i
```

Then run the dev server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses "@fontsource/ibm-plex-mono" to use IBM Plex Mono as the default font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## TODO

- [x] Add rate limiting to API routes (Upstash Redis; writes 5/min, reads 60/min per IP — see `lib/rate-limit.ts`)
- [ ] Recreate the database on the fresh Supabase project per `db/README.md` (schema migration + `db/policies.sql`). The policies file already includes the hardening: no anon grants or read policies (service-role only), pinned function `search_path`.

# Media

- **Friends & Family**: https://play.google.com/store/apps/details?id=com.a3chron.nrecipe&utm_source=distribution
- **Nothing Community**: https://play.google.com/store/apps/details?id=com.a3chron.nrecipe&utm_source=nothingCommunity&utm_campaign=launch
- **LinkedIn**: https://play.google.com/store/apps/details?id=com.a3chron.nrecipe&utm_source=linkedin&utm_campaign=launch
- **Reddit**: https://play.google.com/store/apps/details?id=com.a3chron.nrecipe&utm_source=reddit&utm_campaign=launch
- **Portfolio**: https://play.google.com/store/apps/details?id=com.a3chron.nrecipe&utm_source=portfolio
- **Catppuccin**: https://play.google.com/store/apps/details?id=com.a3chron.nrecipe&utm_source=catppuccin
