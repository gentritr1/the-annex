// CivicArchiveArt — the Case 77 exterior diorama art: the rain-era civic records
// hall, built on the same plane contract as the Case 81 interior (background
// raster plane + far/mid/near SVG planes + the CSS-gradient haze frame).
// Presentation only; no content ids. The background raster URL is injected via
// `backgroundSrc` so no image path lives in this shared-scene file. SceneStage
// wraps this in the perspective stack and drives the state treatments through
// the CSS custom properties on the stage. The weather is rain (the scene's
// identity): the existing ambience rain canvas rides inside the stack as a
// sibling of the plane group — it never drifts, and it is hidden (which idles
// its loop) by the stage's data-scene-state / reduced-motion CSS gates.
import type { CSSProperties } from 'react'
import { Atmosphere } from '../ambience/Atmosphere'
import type { SceneArtProps } from '../game/types'

export function CivicArchiveArt({ backgroundSrc }: SceneArtProps) {
  const bgStyle = { '--scene-bg': `url("${backgroundSrc}")` } as CSSProperties

  return (
    <>
      {/* The plane group: only these planes drift under the pointer. */}
      <div className="scene-pgroup">
        {/* Exterior wall field: the night photograph carries its own value
            structure, so the shared multiply field is swapped for a plain
            scrim + dark bed via the modifier class (see styles.css). */}
        <div
          className="scene-layer scene-layer-background scene-layer-background--exterior"
          style={bgStyle}
        />

        {/* FAR — the hall itself: tower-face mullions, the shelving recesses
            (stacks reading through the facade), the intake portal with its
            steps, and the one distant amber lamp (the only warm accent, per
            the colour law; state-driven --amber-o). */}
        <div className="scene-layer scene-layer-far">
          <svg
            className="scene-layer-svg"
            viewBox="0 0 1600 900"
            preserveAspectRatio="xMidYMid slice"
            focusable="false"
          >
            <defs>
              <linearGradient id="civRecess" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="oklch(0.72 0.018 210)" stopOpacity=".1" />
                <stop offset="1" stopColor="oklch(0.72 0.018 210)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="civPortalSpill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="oklch(0.94 0.012 190)" stopOpacity=".12" />
                <stop offset="1" stopColor="oklch(0.94 0.012 190)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* facade mullions on the tower face */}
            <g stroke="oklch(0.72 0.018 210 / .12)" strokeWidth="1" fill="none">
              <path d="M1008 60 V560" />
              <path d="M1066 40 V560" />
              <path d="M1124 30 V560" />
              <path d="M1316 40 V560" />
              <path d="M1374 55 V560" />
              <path d="M1432 75 V560" />
            </g>

            {/* shelving recesses: two stack blocks reading through the facade */}
            <g>
              <rect x="1024" y="120" width="150" height="300" fill="oklch(0.125 0.01 240 / .5)" />
              <rect x="1024" y="120" width="150" height="300" fill="url(#civRecess)" />
              <g stroke="oklch(0.94 0.012 190 / .13)" strokeWidth="1">
                <path d="M1032 152 H1166" />
                <path d="M1032 184 H1166" />
                <path d="M1032 216 H1166" />
                <path d="M1032 248 H1166" />
                <path d="M1032 280 H1166" />
                <path d="M1032 312 H1166" />
                <path d="M1032 344 H1166" />
                <path d="M1032 376 H1166" />
              </g>
              <path d="M1024 120 V420" stroke="oklch(0.09 0 0 / .35)" strokeWidth="3" />
              <path d="M1174 120 V420" stroke="oklch(0.94 0.012 190 / .16)" strokeWidth="1.5" />
            </g>
            <g>
              <rect x="1330" y="100" width="138" height="320" fill="oklch(0.115 0.009 240 / .5)" />
              <rect x="1330" y="100" width="138" height="320" fill="url(#civRecess)" />
              <g stroke="oklch(0.94 0.012 190 / .11)" strokeWidth="1">
                <path d="M1338 136 H1460" />
                <path d="M1338 172 H1460" />
                <path d="M1338 208 H1460" />
                <path d="M1338 244 H1460" />
                <path d="M1338 280 H1460" />
                <path d="M1338 316 H1460" />
                <path d="M1338 352 H1460" />
                <path d="M1338 388 H1460" />
              </g>
              <path d="M1330 100 V420" stroke="oklch(0.09 0 0 / .35)" strokeWidth="3" />
              <path d="M1468 100 V420" stroke="oklch(0.94 0.012 190 / .14)" strokeWidth="1.5" />
            </g>

            {/* intake portal at the tower base: recessed dark arch, lintel
                highlight, interior shelving, steps spilling cold light */}
            <g>
              <rect x="1158" y="432" width="134" height="172" fill="oklch(0.085 0.007 240 / .7)" />
              <path d="M1158 432 H1292" stroke="oklch(0.94 0.012 190 / .22)" strokeWidth="1.5" />
              <path d="M1158 432 V604" stroke="oklch(0.09 0 0 / .4)" strokeWidth="3" />
              <path d="M1292 432 V604" stroke="oklch(0.94 0.012 190 / .18)" strokeWidth="1.5" />
              <g stroke="oklch(0.94 0.012 190 / .12)" strokeWidth="1">
                <path d="M1170 470 H1280" />
                <path d="M1170 506 H1280" />
                <path d="M1170 542 H1280" />
                <path d="M1170 578 H1280" />
              </g>
              <rect x="1150" y="604" width="150" height="26" fill="url(#civPortalSpill)" />
              <g stroke="oklch(0.72 0.018 210 / .18)" strokeWidth="1" fill="none">
                <path d="M1146 612 H1304" />
                <path d="M1140 622 H1310" />
              </g>
            </g>

            {/* the single distant amber lamp above the portal (the only warm
                accent). State-driven --amber-o: present in neutral, dimmed in
                refusal so that state stays the darkest. */}
            <rect
              className="scene-amber scene-svg-fx"
              x="1217"
              y="414"
              width="16"
              height="4"
              fill="oklch(0.72 0.14 70 / .7)"
            />

            {/* gangway lines echoing the bridges in the raster */}
            <g stroke="oklch(0.72 0.018 210 / .08)" strokeWidth="1" fill="none">
              <path d="M0 596 H1150" />
              <path d="M1292 560 H1600" />
              <path d="M0 640 H860" strokeOpacity=".6" />
            </g>
          </svg>
        </div>

        {/* MID — the working floor: the ward wing doorway, catalog desks with
            card files, records carts by the service pipes, and the small side
            booth on the walkway. */}
        <div className="scene-layer scene-layer-mid">
          <svg
            className="scene-layer-svg"
            viewBox="0 0 1600 900"
            preserveAspectRatio="xMidYMid slice"
            focusable="false"
          >
            <defs>
              <linearGradient id="civWet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="oklch(0.72 0.018 210)" stopOpacity=".1" />
                <stop offset="1" stopColor="oklch(0.72 0.018 210)" stopOpacity="0" />
              </linearGradient>
              <radialGradient id="civDoorGlow" cx=".5" cy=".5" r=".5">
                <stop offset="0" stopColor="oklch(0.94 0.012 190)" stopOpacity=".16" />
                <stop offset="1" stopColor="oklch(0.94 0.012 190)" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* ward wing: a low annex block off the walkway, one lit doorway */}
            <g>
              <rect x="640" y="498" width="172" height="122" fill="oklch(0.13 0.01 240 / .6)" />
              <path d="M640 498 H812" stroke="oklch(0.94 0.012 190 / .14)" strokeWidth="1.5" />
              <path d="M640 498 V620" stroke="oklch(0.09 0 0 / .3)" strokeWidth="2.5" />
              <rect x="700" y="522" width="52" height="98" fill="oklch(0.095 0.008 240)" />
              <rect
                x="700"
                y="522"
                width="52"
                height="98"
                fill="none"
                stroke="oklch(0.72 0.018 210 / .24)"
                strokeWidth="1.5"
              />
              <ellipse cx="726" cy="572" rx="52" ry="62" fill="url(#civDoorGlow)" />
              <rect x="704" y="616" width="44" height="4" fill="oklch(0.94 0.012 190 / .5)" />
              <g stroke="oklch(0.94 0.012 190 / .12)" strokeWidth="1">
                <path d="M660 522 H690" />
                <path d="M660 546 H690" />
                <path d="M762 522 H800" />
                <path d="M762 546 H800" />
              </g>
            </g>

            {/* catalog desks: two long desks with card-file blocks, wet sheen
                pooling beneath */}
            <g>
              <polygon points="520,636 668,636 682,652 508,652" fill="oklch(0.14 0.011 240)" />
              <polygon points="508,652 682,652 682,664 508,664" fill="oklch(0.1 0.008 240)" />
              <path d="M520 636 H668" stroke="oklch(0.94 0.012 190 / .18)" strokeWidth="1" />
              <rect x="528" y="664" width="9" height="52" fill="oklch(0.09 0.007 240)" />
              <rect x="650" y="664" width="9" height="52" fill="oklch(0.09 0.007 240)" />
              <g fill="oklch(0.115 0.009 240)">
                <rect x="544" y="606" width="34" height="30" />
                <rect x="586" y="612" width="28" height="24" />
                <rect x="622" y="608" width="30" height="28" />
              </g>
              <g stroke="oklch(0.94 0.012 190 / .12)" strokeWidth="1">
                <path d="M544 606 H578" />
                <path d="M586 612 H614" />
                <path d="M622 608 H652" />
              </g>
              <polygon points="516,716 676,716 686,760 506,760" fill="url(#civWet)" />
            </g>
            <g>
              <polygon points="700,646 812,646 822,658 692,658" fill="oklch(0.135 0.011 240)" />
              <polygon points="692,658 822,658 822,668 692,668" fill="oklch(0.1 0.008 240)" />
              <path d="M700 646 H812" stroke="oklch(0.94 0.012 190 / .14)" strokeWidth="1" />
              <rect x="706" y="668" width="8" height="44" fill="oklch(0.09 0.007 240)" />
              <rect x="800" y="668" width="8" height="44" fill="oklch(0.09 0.007 240)" />
              <rect x="726" y="622" width="30" height="24" fill="oklch(0.115 0.009 240)" />
              <path d="M726 622 H756" stroke="oklch(0.94 0.012 190 / .12)" strokeWidth="1" />
            </g>

            {/* records carts by the service pipes: caged trolleys stacked with
                record boxes */}
            <g>
              <rect x="884" y="612" width="88" height="56" fill="oklch(0.12 0.01 240)" />
              <rect
                x="884"
                y="612"
                width="88"
                height="56"
                fill="none"
                stroke="oklch(0.72 0.018 210 / .26)"
                strokeWidth="1.5"
              />
              <g stroke="oklch(0.72 0.018 210 / .2)" strokeWidth="1">
                <path d="M906 612 V668" />
                <path d="M928 612 V668" />
                <path d="M950 612 V668" />
                <path d="M884 640 H972" />
              </g>
              <g fill="oklch(0.16 0.012 240)">
                <rect x="892" y="590" width="34" height="22" />
                <rect x="930" y="594" width="34" height="18" />
              </g>
              <path d="M892 590 H926" stroke="oklch(0.94 0.012 190 / .14)" strokeWidth="1" />
              <circle cx="900" cy="676" r="7" fill="oklch(0.08 0.006 240)" />
              <circle cx="956" cy="676" r="7" fill="oklch(0.08 0.006 240)" />
              <polygon points="884,686 972,686 984,724 872,724" fill="url(#civWet)" />
            </g>
            <g>
              <rect x="1006" y="630" width="56" height="40" fill="oklch(0.115 0.009 240)" />
              <rect
                x="1006"
                y="630"
                width="56"
                height="40"
                fill="none"
                stroke="oklch(0.72 0.018 210 / .22)"
                strokeWidth="1.5"
              />
              <path d="M1034 630 V670" stroke="oklch(0.72 0.018 210 / .18)" strokeWidth="1" />
              <rect x="1012" y="614" width="28" height="16" fill="oklch(0.155 0.011 240)" />
              <circle cx="1018" cy="676" r="6" fill="oklch(0.08 0.006 240)" />
              <circle cx="1050" cy="676" r="6" fill="oklch(0.08 0.006 240)" />
            </g>

            {/* the small side booth on the walkway: canopy, posts, counter */}
            <g>
              <polygon points="318,544 462,544 474,562 306,562" fill="oklch(0.15 0.011 240)" />
              <path d="M318 544 H462" stroke="oklch(0.94 0.012 190 / .2)" strokeWidth="1" />
              <rect x="322" y="562" width="7" height="78" fill="oklch(0.1 0.008 240)" />
              <rect x="452" y="562" width="7" height="78" fill="oklch(0.1 0.008 240)" />
              <rect x="330" y="600" width="122" height="40" fill="oklch(0.12 0.01 240)" />
              <path d="M330 600 H452" stroke="oklch(0.94 0.012 190 / .16)" strokeWidth="1" />
              <rect x="344" y="578" width="26" height="22" fill="oklch(0.16 0.012 240)" />
              <path d="M344 578 H370" stroke="oklch(0.94 0.012 190 / .14)" strokeWidth="1" />
              <polygon points="330,644 452,644 462,684 320,684" fill="url(#civWet)" />
            </g>

            {/* walkway edge highlights registering with the raster bridge */}
            <g stroke="oklch(0.94 0.012 190 / .1)" strokeWidth="1" fill="none">
              <path d="M0 692 H1600" />
              <path d="M0 700 H1600" strokeOpacity=".6" />
            </g>
          </svg>
        </div>

        {/* NEAR — foreground silhouette: the parapet railing the player stands
            at, plus the right-edge doorframe pier (static blur via CSS). */}
        <div className="scene-layer scene-layer-near">
          <svg
            className="scene-layer-svg"
            viewBox="0 0 1600 900"
            preserveAspectRatio="xMidYMid slice"
            focusable="false"
          >
            <g fill="oklch(0.05 0.006 240)">
              <rect x="0" y="806" width="1600" height="16" />
              <rect x="0" y="880" width="1600" height="20" />
              <rect x="56" y="822" width="10" height="58" />
              <rect x="176" y="822" width="10" height="58" />
              <rect x="296" y="822" width="10" height="58" />
              <rect x="416" y="822" width="10" height="58" />
              <rect x="536" y="822" width="10" height="58" />
              <rect x="656" y="822" width="10" height="58" />
              <rect x="776" y="822" width="10" height="58" />
              <rect x="896" y="822" width="10" height="58" />
              <rect x="1016" y="822" width="10" height="58" />
              <rect x="1136" y="822" width="10" height="58" />
              <rect x="1256" y="822" width="10" height="58" />
              <rect x="1376" y="822" width="10" height="58" />
              <rect x="1496" y="822" width="10" height="58" />
              <rect x="1552" y="0" width="48" height="900" />
              <rect x="1424" y="60" width="176" height="26" />
            </g>
            <path
              d="M0 806 H1552"
              stroke="oklch(0.72 0.018 210 / .1)"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M1552 0 V806"
              stroke="oklch(0.72 0.018 210 / .08)"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        </div>
      </div>

      {/* HAZE — rain haze + wet-ground sheen, CSS gradients only; the frame is
          JS-registered to the far-plane projection. Sits OUTSIDE the plane
          group, so it does not drift. */}
      <div className="scene-haze">
        <div className="scene-haze-frame">
          <div className="scene-fx scene-fx-haze" />
          <div className="scene-fx scene-fx-floor" />
          <div className="scene-fx scene-fx-floor-calm" />
          <div className="scene-fx scene-fx-center" />
          <div className="scene-fx scene-fx-near-dim" />
          <div className="scene-fx scene-fx-dim" />
        </div>
      </div>

      {/* RAIN — the existing ambience canvas riding inside the diorama stack.
          The art receives no state props by contract, so its gates are
          declarative: the stage's data-scene-state and the reduce-motion class
          / media query hide this node via CSS, and hiding it idles the rain
          loop through the atmosphere's own visibility observer. */}
      <Atmosphere className="scene-art-rain" mask={0.07} reducedMotion={false} />
    </>
  )
}
