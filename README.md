# The World in One Image — Tuesday 17 November 2026

Entry for the make.fun bounty **news-image-20261117** ("Sum up 17 November's
world news in one image").

`main.ts` is a self-contained Node program (standard library only, no
network) that **draws the day's front page pixel by pixel in code** — a
hand-rolled framebuffer, a 5x7 bitmap typeface, code-drawn icons, and its
own PNG encoder (zlib + CRC32). It writes a deterministic 1024x1024 PNG
(23,971 bytes, well under the 1 MiB gate) to `/output/entry.png`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`entry.png` in this repository is a preview of exactly the bytes the
program writes (two runs produce identical SHA-256).

## What the image shows

Masthead: **TUESDAY 17 NOVEMBER 2026 — The day's big stories, all on one page.**

Lead story:

1. **Diplomacy — Xi, Trump & Putin to meet in first trilateral summit.**
   China confirmed the three leaders meet Thursday 19 November in Shenzhen,
   on the sidelines of the APEC summit (China hosting APEC for the first
   time since 2014).

Panels:

2. **War at sea (day 264 of the US–Iran war) — Tankers burn in Hormuz.**
   US jets struck an IRGC missile site on Qeshm Island; Iran said ships
   struck naval mines in the Strait of Hormuz; a third US carrier arrived
   in the region (UKMTO reported a tanker hit north of Khasab, Oman).
3. **Ukraine — Kyiv pounded, bridge shut.** A major Russian ballistic
   missile attack on Kyiv disrupted heating and water and hit Dnipro
   bridges; the Crimean Bridge was closed after a Ukrainian strike.
4. **Climate — COP31 draft: phase out fossil fuels.** As ministers took
   over the Antalya talks, the draft deal called for accelerated fossil-fuel
   phase-out and tripling adaptation finance to at least $120bn a year by
   2035 (against ~$305bn of estimated need).
5. **Gaza aid appeal — Open Gaza crossings now.** The UK, Australia, Canada
   and Italy jointly urged Israel to open Gaza crossings for humanitarian
   aid, calling the situation catastrophic; Britain also sanctioned eight
   Israeli settlement companies.
6. **Health — US loses measles-free status.** PAHO announced the United
   States has lost its measles elimination status after 26 years; the CDC
   counted 5,412 cases in 2026, the most in 35 years.
7. **Tech + markets — AI chip curbs hit China.** The US Commerce Department
   tightened AI chip export rules to close a foreign-purchase loophole;
   Nvidia reported earnings after the bell, its first results without
   Jensen Huang at the helm.

Ticker and footer:

8. **France — Gérard Depardieu pleads guilty** to sexual assault charges
   in Paris, dropping his appeal.
9. **Japan scrambles jets** after Russian aircraft entered its airspace.
10. **Sport — India edge Pakistan by one wicket** in a last-ball thriller
    to win the Under-19 Asia Cup final in Oman.

## Sources (reporting of 17 November 2026)

- Daily Buzz, 17 November 2026 (AFP / Dawn reporting on the trilateral
  summit, the Kyiv attack and the chip rules):
  https://www.linkedin.com/pulse/daily-buzz-17-november-2026-china-biz-buzz-v0zcc
- World News Tonight, full episode Tuesday November 17, 2026 (Hormuz
  strikes, the summit, measles status):
  https://podcastrex.com/shows/world-news-tonight-with-david-muir/full-episode-tuesday-november-17-2026
- Atlantic Digest, "US-Iran war day 264" (Qeshm strike, tankers, drones):
  https://atlanticdigest.com/politics/us-iran-war-day-264-iran-sends-drones-at-us-forces-in-bahrain-and-kuwait-after-american-strike-on-qeshm-island/
- Ummah Atlas explainer (UKMTO tanker report, third carrier):
  https://ummahatlas.com/blog/tanker-hit-strait-of-hormuz-third-us-carrier-november-17-2026-explained/
- Asas Press, World News Digest: Top Stories of November 17, 2026 (Gaza
  aid call, Depardieu, Japan airspace, Crimean Bridge):
  https://asaspress.com/en/news/world-news-digest-top-stories-of-november-17-2026
- The Business Standard (Reuters/DW reporting), COP31 draft:
  https://www.tbsnews.net/economy/cop31-draft-calls-fossil-fuel-phaseout-least-120bn-adaptation-finance-1604866
- CNN, "The United States' measles elimination status is officially gone"
  (PAHO announcement, CDC case count):
  https://www.cnn.com/2026/11/17/health/measles-vaccine-booster?cid=external-feeds_iluminar_meta
- Healthline, "U.S. Loses Measles Elimination Status After 26 Years":
  https://www.healthline.com/health-news/u-s-loses-measles-elimination-status-after-26-years
- Investopedia, "5 Things Investors Need to Know About Tuesday's Markets"
  (Nvidia earnings, chip stocks, export rules):
  https://www.investopedia.com/5-things-to-know-stock-market-november-17-2026-12260055
- NPR News Now, 5pm ET November 17 (UK sanctions over West Bank/Gaza):
  https://podcastrex.com/shows/npr-news-now/5pm-et-november-17-the-latest-headlines-from-npr

All artwork is original and drawn in code — no photographs or third-party
artwork are used. License: MIT (see `LICENSE`).
