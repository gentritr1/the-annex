# Nonlinear causal browser-playtest failure

The guarded browser pass stopped before committing refinement or evidence.

**Failed stage:** Play clean routes in Chromium

## Stage log

```text

===== Install project dependencies =====

added 250 packages, and audited 251 packages in 5s

64 packages are looking for funding
  run `npm fund` for details

5 high severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.

===== Check speculative-route refinement syntax =====

===== Apply Care to Archive speculative-route refinement =====
patched scripts/nonlinear-browser-playtest.ts
patched scripts/nonlinear-browser-playtest.ts
patched src/game/causal.ts
patched src/game/causal.test.ts

===== Lint production source =====

> the-annex-mvp@0.1.0 lint
> eslint .


===== Run full test suite =====

> the-annex-mvp@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90m/home/runner/work/the-annex/the-annex[39m

 [32m✓[39m src/game/persistence.test.ts [2m([22m[2m20 tests[22m[2m)[22m[32m 36[2mms[22m[39m
 [32m✓[39m src/game/engine.test.ts [2m([22m[2m36 tests[22m[2m)[22m[32m 37[2mms[22m[39m
 [32m✓[39m src/game/content.test.ts [2m([22m[2m112 tests[22m[2m)[22m[32m 115[2mms[22m[39m
 [32m✓[39m src/ambience/audio.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m src/game/room.test.ts [2m([22m[2m23 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m src/game/ledger.test.ts [2m([22m[2m23 tests[22m[2m)[22m[32m 54[2mms[22m[39m
 [32m✓[39m src/game/recordIndex.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 52[2mms[22m[39m
 [32m✓[39m src/game/causal.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m src/game/acousticShadow.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m src/game/custodyRail.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m src/game/siteRecordText.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 31[2mms[22m[39m
 [32m✓[39m src/game/sceneLabels.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/game/sceneState.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/game/personaRecord.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m src/game/beats.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m src/components/SceneZone.commit.test.tsx [2m([22m[2m10 tests[22m[2m)[22m[32m 178[2mms[22m[39m
 [32m✓[39m src/components/PersonaPortrait.test.tsx [2m([22m[2m5 tests[22m[2m)[22m[32m 120[2mms[22m[39m
 [32m✓[39m src/game/fieldCta.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/scene/previewTreatment.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/game/persistence.roundtrip.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m src/scene/rainPresence.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 5[2mms[22m[39m

[2m Test Files [22m [1m[32m21 passed[39m[22m[90m (21)[39m
[2m      Tests [22m [1m[32m365 passed[39m[22m[90m (365)[39m
[2m   Start at [22m 17:00:43
[2m   Duration [22m 4.13s[2m (transform 1.93s, setup 0ms, import 4.17s, tests 825ms, environment 3.33s)[22m


===== Build production bundle =====

> the-annex-mvp@0.1.0 build
> tsc -b && vite build

[36mvite v7.3.6 [32mbuilding client environment for production...[36m[39m
transforming...
[32m✓[39m 93 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                           [39m[1m[2m  2.03 kB[22m[1m[22m[2m │ gzip:   0.78 kB[22m
[2mdist/[22m[2massets/[22m[35mindex-jCWd5yDf.css            [39m[1m[2m198.35 kB[22m[1m[22m[2m │ gzip:  35.55 kB[22m
[2mdist/[22m[2massets/[22m[36mindex-Bb865LXt.js             [39m[1m[33m529.99 kB[39m[22m[2m │ gzip: 157.06 kB[22m
[2mdist/[22m[2massets/[22m[36mcreateAnnexWorld-DOO0DZnB.js  [39m[1m[33m533.05 kB[39m[22m[2m │ gzip: 136.57 kB[22m
[33m
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.[39m
[32m✓ built in 2.97s[39m

===== Install browser harness =====

added 3 packages, changed 27 packages, and audited 253 packages in 15s

64 packages are looking for funding
  run `npm fund` for details

5 high severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.

===== Install Chromium =====
Installing dependencies...
Switching to root user to install dependencies...
Get:1 file:/etc/apt/apt-mirrors.txt Mirrorlist [144 B]
Hit:3 https://packages.microsoft.com/repos/azure-cli noble InRelease
Get:4 https://packages.microsoft.com/ubuntu/24.04/prod noble InRelease [3600 B]
Hit:2 http://azure.archive.ubuntu.com/ubuntu noble InRelease
Get:5 http://azure.archive.ubuntu.com/ubuntu noble-updates InRelease [126 kB]
Get:6 http://azure.archive.ubuntu.com/ubuntu noble-backports InRelease [126 kB]
Get:8 https://dl.google.com/linux/chrome-stable/deb stable InRelease [2548 B]
Get:7 http://azure.archive.ubuntu.com/ubuntu noble-security InRelease [126 kB]
Get:9 https://packages.microsoft.com/ubuntu/24.04/prod noble/main arm64 Packages [226 kB]
Get:10 https://packages.microsoft.com/ubuntu/24.04/prod noble/main amd64 Packages [261 kB]
Get:11 https://packages.microsoft.com/ubuntu/24.04/prod noble/main armhf Packages [11.7 kB]
Get:12 http://azure.archive.ubuntu.com/ubuntu noble-updates/main amd64 Packages [1154 kB]
Get:13 http://azure.archive.ubuntu.com/ubuntu noble-updates/main Translation-en [278 kB]
Get:14 http://azure.archive.ubuntu.com/ubuntu noble-updates/main amd64 Components [180 kB]
Get:15 http://azure.archive.ubuntu.com/ubuntu noble-updates/universe amd64 Packages [1680 kB]
Get:16 http://azure.archive.ubuntu.com/ubuntu noble-updates/universe Translation-en [334 kB]
Get:17 http://azure.archive.ubuntu.com/ubuntu noble-updates/universe amd64 Components [388 kB]
Get:18 http://azure.archive.ubuntu.com/ubuntu noble-updates/restricted amd64 Packages [1367 kB]
Get:19 http://azure.archive.ubuntu.com/ubuntu noble-updates/restricted Translation-en [308 kB]
Get:20 http://azure.archive.ubuntu.com/ubuntu noble-updates/multiverse amd64 Packages [45.4 kB]
Get:21 http://azure.archive.ubuntu.com/ubuntu noble-updates/multiverse Translation-en [12.3 kB]
Get:23 https://dl.google.com/linux/chrome-stable/deb stable/main amd64 Packages [1412 B]
Get:22 http://azure.archive.ubuntu.com/ubuntu noble-updates/multiverse amd64 Components [940 B]
Get:24 http://azure.archive.ubuntu.com/ubuntu noble-backports/main amd64 Components [5772 B]
Get:25 http://azure.archive.ubuntu.com/ubuntu noble-backports/universe amd64 Packages [32.5 kB]
Get:26 http://azure.archive.ubuntu.com/ubuntu noble-backports/universe amd64 Components [12.6 kB]
Get:27 http://azure.archive.ubuntu.com/ubuntu noble-security/main amd64 Packages [897 kB]
Get:28 http://azure.archive.ubuntu.com/ubuntu noble-security/main Translation-en [198 kB]
Get:29 http://azure.archive.ubuntu.com/ubuntu noble-security/main amd64 Components [46.4 kB]
Get:30 http://azure.archive.ubuntu.com/ubuntu noble-security/universe amd64 Packages [1199 kB]
Get:31 http://azure.archive.ubuntu.com/ubuntu noble-security/universe Translation-en [239 kB]
Get:32 http://azure.archive.ubuntu.com/ubuntu noble-security/universe amd64 Components [76.3 kB]
Get:33 http://azure.archive.ubuntu.com/ubuntu noble-security/restricted amd64 Packages [1273 kB]
Get:34 http://azure.archive.ubuntu.com/ubuntu noble-security/restricted Translation-en [290 kB]
Get:35 http://azure.archive.ubuntu.com/ubuntu noble-security/multiverse amd64 Packages [40.3 kB]
Get:36 http://azure.archive.ubuntu.com/ubuntu noble-security/multiverse Translation-en [10.6 kB]
Fetched 11.0 MB in 1s (8007 kB/s)
Reading package lists...
Reading package lists...
Building dependency tree...
Reading state information...
libasound2t64 is already the newest version (1.2.11-1ubuntu0.3).
libasound2t64 set to manually installed.
libatk-bridge2.0-0t64 is already the newest version (2.52.0-1build1).
libatk-bridge2.0-0t64 set to manually installed.
libatk1.0-0t64 is already the newest version (2.52.0-1build1).
libatk1.0-0t64 set to manually installed.
libatspi2.0-0t64 is already the newest version (2.52.0-1build1).
libatspi2.0-0t64 set to manually installed.
libcairo2 is already the newest version (1.18.0-3build1).
libcairo2 set to manually installed.
libcups2t64 is already the newest version (2.4.7-1.2ubuntu7.14).
libcups2t64 set to manually installed.
libdbus-1-3 is already the newest version (1.14.10-4ubuntu4.1).
libdbus-1-3 set to manually installed.
libdrm2 is already the newest version (2.4.125-1ubuntu0.1~24.04.2).
libdrm2 set to manually installed.
libgbm1 is already the newest version (25.2.8-0ubuntu0.24.04.2).
libgbm1 set to manually installed.
libglib2.0-0t64 is already the newest version (2.80.0-6ubuntu3.8).
libglib2.0-0t64 set to manually installed.
libnspr4 is already the newest version (2:4.35-1.1build1).
libnspr4 set to manually installed.
libnss3 is already the newest version (2:3.98-1ubuntu0.2).
libnss3 set to manually installed.
libpango-1.0-0 is already the newest version (1.52.1+ds-1build1).
libpango-1.0-0 set to manually installed.
libx11-6 is already the newest version (2:1.8.7-1build1).
libx11-6 set to manually installed.
libxcb1 is already the newest version (1.15-1ubuntu2).
libxcb1 set to manually installed.
libxcomposite1 is already the newest version (1:0.4.5-1build3).
libxcomposite1 set to manually installed.
libxdamage1 is already the newest version (1:1.1.6-1build1).
libxdamage1 set to manually installed.
libxext6 is already the newest version (2:1.3.4-1build2).
libxext6 set to manually installed.
libxfixes3 is already the newest version (1:6.0.0-2build1).
libxfixes3 set to manually installed.
libxkbcommon0 is already the newest version (1.6.0-1build1).
libxkbcommon0 set to manually installed.
libxrandr2 is already the newest version (2:1.5.2-2build1).
libxrandr2 set to manually installed.
xvfb is already the newest version (2:21.1.12-1ubuntu1.6).
fonts-noto-color-emoji is already the newest version (2.047-0ubuntu0.24.04.1).
libfontconfig1 is already the newest version (2.15.0-1.1ubuntu2).
libfontconfig1 set to manually installed.
libfreetype6 is already the newest version (2.13.2+dfsg-1ubuntu0.1).
libfreetype6 set to manually installed.
fonts-liberation is already the newest version (1:2.1.5-3).
fonts-liberation set to manually installed.
The following additional packages will be installed:
  xfonts-encodings xfonts-utils
Recommended packages:
  fonts-ipafont-mincho fonts-tlwg-loma
The following NEW packages will be installed:
  fonts-freefont-ttf fonts-ipafont-gothic fonts-tlwg-loma-otf fonts-unifont
  fonts-wqy-zenhei xfonts-cyrillic xfonts-encodings xfonts-scalable
  xfonts-utils
0 upgraded, 9 newly installed, 0 to remove and 79 not upgraded.
Need to get 21.1 MB of archives.
After this operation, 79.5 MB of additional disk space will be used.
Get:1 file:/etc/apt/apt-mirrors.txt Mirrorlist [144 B]
Get:2 http://azure.archive.ubuntu.com/ubuntu noble/universe amd64 fonts-ipafont-gothic all 00303-21ubuntu1 [3513 kB]
Get:3 http://azure.archive.ubuntu.com/ubuntu noble/main amd64 fonts-freefont-ttf all 20211204+svn4273-2 [5641 kB]
Get:4 http://azure.archive.ubuntu.com/ubuntu noble/universe amd64 fonts-tlwg-loma-otf all 1:0.7.3-1 [107 kB]
Get:5 http://azure.archive.ubuntu.com/ubuntu noble/universe amd64 fonts-unifont all 1:15.1.01-1build1 [2993 kB]
Get:6 http://azure.archive.ubuntu.com/ubuntu noble/universe amd64 fonts-wqy-zenhei all 0.9.45-8 [7472 kB]
Get:7 http://azure.archive.ubuntu.com/ubuntu noble/main amd64 xfonts-encodings all 1:1.0.5-0ubuntu2 [578 kB]
Get:8 http://azure.archive.ubuntu.com/ubuntu noble/main amd64 xfonts-utils amd64 1:7.7+6build3 [94.4 kB]
Get:9 http://azure.archive.ubuntu.com/ubuntu noble/universe amd64 xfonts-cyrillic all 1:1.0.5+nmu1 [384 kB]
Get:10 http://azure.archive.ubuntu.com/ubuntu noble/main amd64 xfonts-scalable all 1:1.0.3-1.3 [304 kB]
Fetched 21.1 MB in 2s (12.2 MB/s)
Selecting previously unselected package fonts-ipafont-gothic.
(Reading database ... (Reading database ... 5%(Reading database ... 10%(Reading database ... 15%(Reading database ... 20%(Reading database ... 25%(Reading database ... 30%(Reading database ... 35%(Reading database ... 40%(Reading database ... 45%(Reading database ... 50%(Reading database ... 55%(Reading database ... 60%(Reading database ... 65%(Reading database ... 70%(Reading database ... 75%(Reading database ... 80%(Reading database ... 85%(Reading database ... 90%(Reading database ... 95%(Reading database ... 100%(Reading database ... 202954 files and directories currently installed.)
Preparing to unpack .../0-fonts-ipafont-gothic_00303-21ubuntu1_all.deb ...
Unpacking fonts-ipafont-gothic (00303-21ubuntu1) ...
Selecting previously unselected package fonts-freefont-ttf.
Preparing to unpack .../1-fonts-freefont-ttf_20211204+svn4273-2_all.deb ...
Unpacking fonts-freefont-ttf (20211204+svn4273-2) ...
Selecting previously unselected package fonts-tlwg-loma-otf.
Preparing to unpack .../2-fonts-tlwg-loma-otf_1%3a0.7.3-1_all.deb ...
Unpacking fonts-tlwg-loma-otf (1:0.7.3-1) ...
Selecting previously unselected package fonts-unifont.
Preparing to unpack .../3-fonts-unifont_1%3a15.1.01-1build1_all.deb ...
Unpacking fonts-unifont (1:15.1.01-1build1) ...
Selecting previously unselected package fonts-wqy-zenhei.
Preparing to unpack .../4-fonts-wqy-zenhei_0.9.45-8_all.deb ...
Unpacking fonts-wqy-zenhei (0.9.45-8) ...
Selecting previously unselected package xfonts-encodings.
Preparing to unpack .../5-xfonts-encodings_1%3a1.0.5-0ubuntu2_all.deb ...
Unpacking xfonts-encodings (1:1.0.5-0ubuntu2) ...
Selecting previously unselected package xfonts-utils.
Preparing to unpack .../6-xfonts-utils_1%3a7.7+6build3_amd64.deb ...
Unpacking xfonts-utils (1:7.7+6build3) ...
Selecting previously unselected package xfonts-cyrillic.
Preparing to unpack .../7-xfonts-cyrillic_1%3a1.0.5+nmu1_all.deb ...
Unpacking xfonts-cyrillic (1:1.0.5+nmu1) ...
Selecting previously unselected package xfonts-scalable.
Preparing to unpack .../8-xfonts-scalable_1%3a1.0.3-1.3_all.deb ...
Unpacking xfonts-scalable (1:1.0.3-1.3) ...
Setting up fonts-wqy-zenhei (0.9.45-8) ...
Setting up fonts-freefont-ttf (20211204+svn4273-2) ...
Setting up fonts-tlwg-loma-otf (1:0.7.3-1) ...
Setting up xfonts-encodings (1:1.0.5-0ubuntu2) ...
Setting up fonts-ipafont-gothic (00303-21ubuntu1) ...
update-alternatives: using /usr/share/fonts/opentype/ipafont-gothic/ipag.ttf to provide /usr/share/fonts/truetype/fonts-japanese-gothic.ttf (fonts-japanese-gothic.ttf) in auto mode
Setting up fonts-unifont (1:15.1.01-1build1) ...
Setting up xfonts-utils (1:7.7+6build3) ...
Setting up xfonts-cyrillic (1:1.0.5+nmu1) ...
Setting up xfonts-scalable (1:1.0.3-1.3) ...
Processing triggers for man-db (2.12.0-4build2) ...
Not building database; man-db/auto-update is not 'true'.
Processing triggers for fontconfig (2.15.0-1.1ubuntu2) ...

Running kernel seems to be up-to-date.

No services need to be restarted.

No containers need to be restarted.

No user sessions are running outdated binaries.

No VM guests are running outdated hypervisor (qemu) binaries on this host.
Downloading Chrome for Testing 151.0.7922.34 (playwright chromium v1234) from https://cdn.playwright.dev/builds/cft/151.0.7922.34/linux64/chrome-linux64.zip
|                                                                                |   0% of 184.3 MiB
|■■■■■■■■                                                                        |  10% of 184.3 MiB
|■■■■■■■■■■■■■■■■                                                                |  20% of 184.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■                                                        |  30% of 184.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                                |  40% of 184.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                        |  50% of 184.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                |  60% of 184.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                        |  70% of 184.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                |  80% of 184.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■        |  90% of 184.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■| 100% of 184.3 MiB
Chrome for Testing 151.0.7922.34 (playwright chromium v1234) downloaded to /home/runner/.cache/ms-playwright/chromium-1234
Downloading FFmpeg (playwright ffmpeg v1011) from https://cdn.playwright.dev/dbazure/download/playwright/builds/ffmpeg/1011/ffmpeg-linux.zip
|                                                                                |   0% of 2.3 MiB
|■■■■■■■■                                                                        |  10% of 2.3 MiB
|■■■■■■■■■■■■■■■■                                                                |  20% of 2.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■                                                        |  30% of 2.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                                |  40% of 2.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                        |  50% of 2.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                |  60% of 2.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                        |  70% of 2.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                |  80% of 2.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■        |  90% of 2.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■| 100% of 2.3 MiB
FFmpeg (playwright ffmpeg v1011) downloaded to /home/runner/.cache/ms-playwright/ffmpeg-1011
Downloading Chrome Headless Shell 151.0.7922.34 (playwright chromium-headless-shell v1234) from https://cdn.playwright.dev/builds/cft/151.0.7922.34/linux64/chrome-headless-shell-linux64.zip
|                                                                                |   0% of 114.7 MiB
|■■■■■■■■                                                                        |  10% of 114.7 MiB
|■■■■■■■■■■■■■■■■                                                                |  20% of 114.7 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■                                                        |  30% of 114.7 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                                |  40% of 114.7 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                        |  50% of 114.7 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                |  60% of 114.7 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                        |  70% of 114.7 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                |  80% of 114.7 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■        |  90% of 114.7 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■| 100% of 114.7 MiB
Chrome Headless Shell 151.0.7922.34 (playwright chromium-headless-shell v1234) downloaded to /home/runner/.cache/ms-playwright/chromium_headless_shell-1234

===== Start Vite server =====

===== Play clean routes in Chromium =====
node:internal/modules/run_main:123
    triggerUncaughtException(
    ^

AssertionError [ERR_ASSERTION]: The input did not match the regular expression /Address preserved|Mara/i. Input:

'D\nThe Small Archive\nIn view'

    at run (/home/runner/work/the-annex/the-annex/scripts/nonlinear-browser-playtest.ts:429:14)
    at async <anonymous> (/home/runner/work/the-annex/the-annex/scripts/nonlinear-browser-playtest.ts:843:1) {
  generatedMessage: true,
  code: 'ERR_ASSERTION',
  actual: 'D\nThe Small Archive\nIn view',
  expected: /Address preserved|Mara/i,
  operator: 'match',
  diff: 'simple'
}

Node.js v22.23.1
```

## Vite log

```text

> the-annex-mvp@0.1.0 dev
> vite --host 127.0.0.1 --port 4173


  [32m[1mVITE[22m v7.3.6[39m  [2mready in [0m[1m192[22m[2m[0m ms[22m

  [32m➜[39m  [1mLocal[22m:   [36mhttp://127.0.0.1:[1m4173[22m/[39m
```
