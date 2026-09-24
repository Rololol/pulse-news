# Pulse News
Mobile-first news dashboard. News is generated into `data/news.json` by GitHub Actions from RSS sources. The site is static and can be hosted on GitHub Pages.

## Current sources
German: Tagesschau, Deutschlandfunk, NDR, WDR, BR24, DW Deutsch, ZDF heute, DER SPIEGEL, ZEIT ONLINE, FAZ, Süddeutsche Zeitung, WELT, ntv, Handelsblatt, heise online, SWR, RND, t-online, stern und Rheinische Post.

International: BBC, Guardian, RTP, Google News, NPR, NASA, France24, Euronews, Al Jazeera, The Verge, Ars Technica, New Scientist, ESA, NOAA und WHO.

Only clustered reports with at least two distinct source feeds are published as current news.

## Important
The app displays headlines, short summaries and links back to publishers. It does not copy full articles. Source terms/licensing must be respected. AI summaries are generated in GitHub Actions using the configured Gemini Free-Tier model; the API key is stored only as a GitHub Actions secret.

## Mobile
Open the GitHub Pages URL on your phone and use “Zum Home-Bildschirm”.
