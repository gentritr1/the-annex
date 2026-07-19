// DepositionAnnexArt — the Case 81 interior diorama art, extracted verbatim from
// the reviewed scene prototype under public/ (PART A: the background raster plane
// + far/mid/near SVG planes + the CSS-gradient haze frame). Presentation only; no content
// ids. The background raster URL is injected via `backgroundSrc` so no image path
// lives in this shared-scene file. SceneStage wraps this in the perspective stack
// and drives the state treatments through the CSS custom properties on the stage.
import type { CSSProperties } from 'react'
import type { SceneArtProps } from '../game/types'

export function DepositionAnnexArt({ backgroundSrc }: SceneArtProps) {
  const bgStyle = { '--scene-bg': `url("${backgroundSrc}")` } as CSSProperties

  return (
    <>
      {/* The plane group: only these planes drift under the pointer. */}
      <div className="scene-pgroup">
        <div className="scene-layer scene-layer-background" style={bgStyle} />

        {/* FAR — colonnade, clerestory, back wall, records recess, counsel door,
            service strip, floor seams, reflections, shadows. */}
        <div className="scene-layer scene-layer-far">
          <svg
            className="scene-layer-svg"
            viewBox="0 0 1600 900"
            preserveAspectRatio="xMidYMid slice"
            focusable="false"
          >
            <defs>
              <linearGradient id="reflGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="oklch(0.72 0.018 210)" stopOpacity=".12" />
                <stop offset="1" stopColor="oklch(0.72 0.018 210)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="clerGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="oklch(0.94 0.012 190)" stopOpacity=".55" />
                <stop offset="1" stopColor="oklch(0.94 0.012 190)" stopOpacity=".12" />
              </linearGradient>
              <linearGradient id="doorSpill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="oklch(0.94 0.012 190)" stopOpacity=".14" />
                <stop offset="1" stopColor="oklch(0.94 0.012 190)" stopOpacity="0" />
              </linearGradient>
            </defs>

            <g stroke="oklch(0.72 0.018 210 / .1)" strokeWidth="1" fill="none">
              <path d="M0 148 L790 460" />
              <path d="M1600 96 L790 460" />
              <path d="M0 716 L790 460" />
              <path d="M1600 900 L790 460" strokeOpacity=".5" />
            </g>
            <g stroke="oklch(0.72 0.018 210 / .08)" strokeWidth="1" fill="none">
              <path d="M667 500 H864" />
              <path d="M528 545 H946" />
              <path d="M358 600 H1048" />
              <path d="M142 670 H1177" />
              <path d="M0 760 H1342" />
            </g>

            <rect x="620" y="290" width="340" height="280" fill="oklch(0.185 0.014 240)" />
            <path d="M620 290 H960" stroke="oklch(0.94 0.012 190 / .1)" strokeWidth="1.5" />
            <path d="M620 290 V570" stroke="oklch(0.09 0 0 / .2)" strokeWidth="2" />

            <rect x="745" y="320" width="80" height="245" fill="oklch(0.095 0.007 240)" />
            <g stroke="oklch(0.94 0.012 190 / .14)" strokeWidth="1">
              <path d="M752 360 H818" />
              <path d="M752 400 H818" />
              <path d="M752 440 H818" />
              <path d="M752 480 H818" />
              <path d="M752 520 H818" />
            </g>
            <path d="M825 320 V565" stroke="oklch(0.94 0.012 190 / .2)" strokeWidth="2" />
            <path d="M745 320 V565" stroke="oklch(0.09 0 0 / .4)" strokeWidth="3" />

            <rect x="706" y="336" width="14" height="3" fill="oklch(0.72 0.14 70 / .5)" />

            <rect x="856" y="352" width="52" height="213" fill="oklch(0.10 0.008 240)" />
            <rect
              x="856"
              y="352"
              width="52"
              height="213"
              fill="none"
              stroke="oklch(0.72 0.018 210 / .22)"
              strokeWidth="1.5"
            />
            <rect x="858" y="561" width="48" height="4" fill="oklch(0.94 0.012 190 / .7)" />
            <rect x="856" y="565" width="52" height="12" fill="url(#doorSpill)" />

            <polygon points="24,132 520,282 520,314 24,180" fill="url(#clerGrad)" />
            <g stroke="oklch(0.09 0 0 / .35)" strokeWidth="2">
              <path d="M80 149 V195" />
              <path d="M150 170 V214" />
              <path d="M230 194 V236" />
              <path d="M320 221 V260" />
              <path d="M420 252 V287" />
            </g>
            <g stroke="oklch(0.94 0.012 190 / .2)" strokeWidth="1">
              <path d="M60 143 V190" />
              <path d="M120 161 V206" />
              <path d="M200 192 V234" />
              <path d="M280 217 V256" />
              <path d="M360 241 V277" />
              <path d="M460 271 V304" />
            </g>

            {/* column shadows (state: --shadow-stretch; transform only) */}
            <g fill="oklch(0.09 0 0 / .2)">
              <polygon className="scene-shad scene-svg-fx" points="227,635 273,635 325,828 256,828" />
              <polygon className="scene-shad scene-svg-fx" points="303,612 341,612 389,779 329,779" />
              <polygon className="scene-shad scene-svg-fx" points="372,590 403,590 448,733 397,733" />
              <polygon className="scene-shad scene-svg-fx" points="435,571 461,571 503,693 458,693" />
              <polygon className="scene-shad scene-svg-fx" points="491,553 513,553 552,655 512,655" />
              <polygon className="scene-shad scene-svg-fx" points="543,537 561,537 597,622 563,622" />
              <polygon className="scene-shad scene-svg-fx" points="590,522 605,522 639,590 609,590" />
              <polygon className="scene-shad scene-svg-fx" points="634,509 646,509 678,563 652,563" />
            </g>

            <g>
              <rect x="227" y="635" width="46" height="70" fill="url(#reflGrad)" />
              <rect x="303" y="612" width="38" height="61" fill="url(#reflGrad)" />
              <rect x="372" y="590" width="31" height="52" fill="url(#reflGrad)" />
              <rect x="435" y="571" width="26" height="44" fill="url(#reflGrad)" />
              <rect x="491" y="553" width="22" height="37" fill="url(#reflGrad)" />
              <rect x="543" y="537" width="18" height="31" fill="url(#reflGrad)" />
              <rect x="590" y="522" width="15" height="25" fill="url(#reflGrad)" />
              <rect x="634" y="509" width="12" height="20" fill="url(#reflGrad)" />
            </g>

            <g fill="oklch(0.175 0.013 240)">
              <rect x="227" y="247" width="46" height="388" />
              <rect x="223" y="247" width="54" height="7" />
              <rect x="303" y="275" width="38" height="337" />
              <rect x="300" y="275" width="44" height="6" />
              <rect x="372" y="301" width="31" height="289" />
              <rect x="369" y="301" width="37" height="6" />
              <rect x="435" y="325" width="26" height="246" />
              <rect x="491" y="346" width="22" height="207" />
              <rect x="543" y="366" width="18" height="171" />
              <rect x="590" y="384" width="15" height="138" />
              <rect x="634" y="401" width="12" height="108" />
            </g>
            <g fill="oklch(0.94 0.012 190 / .22)">
              <rect x="227" y="247" width="3" height="388" />
              <rect x="303" y="275" width="3" height="337" />
              <rect x="372" y="301" width="2.5" height="289" />
              <rect x="435" y="325" width="2.5" height="246" />
              <rect x="491" y="346" width="2" height="207" />
              <rect x="543" y="366" width="2" height="171" />
              <rect x="590" y="384" width="1.5" height="138" />
              <rect x="634" y="401" width="1.5" height="108" />
            </g>
            <g fill="oklch(0.09 0 0 / .25)">
              <rect x="270" y="247" width="3" height="388" />
              <rect x="338" y="275" width="3" height="337" />
              <rect x="400" y="301" width="3" height="289" />
              <rect x="458" y="325" width="3" height="246" />
              <rect x="511" y="346" width="2" height="207" />
              <rect x="559" y="366" width="2" height="171" />
            </g>

            <g>
              <polygon points="296,640 420,600 427,611 303,653" fill="oklch(0.135 0.011 240)" />
              <path d="M296 640 L420 600" stroke="oklch(0.94 0.012 190 / .12)" strokeWidth="1" />
              <rect x="312" y="650" width="8" height="24" fill="oklch(0.09 0 0 / .3)" />
              <rect x="398" y="614" width="8" height="24" fill="oklch(0.09 0 0 / .3)" />
              <polygon points="440,596 530,568 535,577 446,606" fill="oklch(0.135 0.011 240)" />
              <path d="M440 596 L530 568" stroke="oklch(0.94 0.012 190 / .1)" strokeWidth="1" />
              <rect x="452" y="602" width="7" height="20" fill="oklch(0.09 0 0 / .3)" />
              <rect x="512" y="580" width="7" height="20" fill="oklch(0.09 0 0 / .3)" />
            </g>
          </svg>
        </div>

        {/* MID — glass partition, restoration lab, deposition table, chairs,
            pendant, footprint trail. */}
        <div className="scene-layer scene-layer-mid">
          <svg
            className="scene-layer-svg"
            viewBox="0 0 1600 900"
            preserveAspectRatio="xMidYMid slice"
            focusable="false"
          >
            <defs>
              <radialGradient id="labGrad" cx=".5" cy=".5" r=".5">
                <stop offset="0" stopColor="oklch(0.94 0.012 190)" stopOpacity=".3" />
                <stop offset="1" stopColor="oklch(0.94 0.012 190)" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="reflGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="oklch(0.72 0.018 210)" stopOpacity=".1" />
                <stop offset="1" stopColor="oklch(0.72 0.018 210)" stopOpacity="0" />
              </linearGradient>
            </defs>

            <path d="M0 800 H1416" stroke="oklch(0.72 0.018 210 / .07)" strokeWidth="1" fill="none" />
            <path
              d="M1261 716 L1451 819"
              stroke="oklch(0.72 0.018 210 / .06)"
              strokeWidth="1"
              fill="none"
            />

            <polygon points="880,398 1600,150 1600,900 880,562" fill="oklch(0.125 0.01 240 / .55)" />

            {/* restoration lab: lit from within (state var --lab-o) */}
            <g className="scene-lab scene-svg-fx">
              <ellipse cx="945" cy="440" rx="100" ry="120" fill="url(#labGrad)" />
              <rect x="905" y="400" width="20" height="90" fill="oklch(0.72 0.018 210 / .1)" />
              <rect x="940" y="380" width="34" height="110" fill="oklch(0.72 0.018 210 / .08)" />
              <rect x="900" y="490" width="90" height="8" fill="oklch(0.72 0.018 210 / .12)" />
            </g>

            <g stroke="oklch(0.72 0.018 210 / .28)" strokeWidth="1.5" fill="none">
              <path d="M1600 150 L880 398" />
              <path d="M1600 900 L880 562" strokeOpacity=".8" />
              <path d="M1450 202 V830" />
              <path d="M1310 250 V764" />
              <path d="M1180 295 V703" />
              <path d="M1060 336 V647" />
              <path d="M950 374 V595" />
              <path d="M880 398 V562" />
            </g>
            <g fill="oklch(0.94 0.012 190 / .05)">
              <polygon points="1150,260 1250,240 1090,760 990,780" />
              <polygon points="1350,210 1400,200 1240,820 1190,830" />
              <polygon points="960,360 990,355 920,600 890,605" />
            </g>

            <polygon points="688,584 892,584 908,601 672,601" fill="oklch(0.14 0.011 240)" />
            <polygon points="672,601 908,601 908,614 672,614" fill="oklch(0.1 0.008 240)" />
            <path d="M688 584 H892" stroke="oklch(0.94 0.012 190 / .2)" strokeWidth="1" />
            <rect x="700" y="614" width="10" height="78" fill="oklch(0.09 0.007 240)" />
            <rect x="868" y="614" width="10" height="78" fill="oklch(0.09 0.007 240)" />
            <rect x="776" y="536" width="50" height="48" fill="oklch(0.115 0.009 240)" />
            <path d="M776 536 H826" stroke="oklch(0.94 0.012 190 / .12)" strokeWidth="1" />
            <rect x="700" y="648" width="52" height="78" fill="oklch(0.085 0.007 240)" />
            <rect x="826" y="648" width="52" height="78" fill="oklch(0.085 0.007 240)" />
            <polygon points="688,700 892,700 900,760 680,760" fill="url(#reflGrad2)" />

            <path d="M790 150 V352" stroke="oklch(0.72 0.018 210 / .3)" strokeWidth="1.5" />
            <polygon points="772,352 808,352 816,368 764,368" fill="oklch(0.16 0.012 240)" />
            <ellipse cx="790" cy="372" rx="20" ry="4" fill="oklch(0.94 0.012 190 / .25)" />

            <g fill="oklch(0.09 0 0 / .13)">
              <ellipse cx="620" cy="806" rx="5" ry="2.3" transform="rotate(-14 620 806)" />
              <ellipse cx="648" cy="788" rx="5" ry="2.3" transform="rotate(12 648 788)" />
              <ellipse cx="634" cy="766" rx="5" ry="2.3" transform="rotate(-12 634 766)" />
              <ellipse cx="668" cy="748" rx="5" ry="2.3" transform="rotate(14 668 748)" />
              <ellipse cx="654" cy="728" rx="5" ry="2.3" transform="rotate(-10 654 728)" />
              <ellipse cx="688" cy="714" rx="5" ry="2.3" transform="rotate(12 688 714)" />
              <ellipse cx="676" cy="696" rx="5" ry="2.3" transform="rotate(-12 676 696)" />
              <ellipse cx="714" cy="686" rx="5" ry="2.3" transform="rotate(10 714 686)" />
            </g>
          </svg>
        </div>

        {/* NEAR — foreground doorframe + stanchion (static blur via CSS). */}
        <div className="scene-layer scene-layer-near">
          <svg
            className="scene-layer-svg"
            viewBox="0 0 1600 900"
            preserveAspectRatio="xMidYMid slice"
            focusable="false"
          >
            <g fill="oklch(0.05 0.006 240)">
              <rect x="0" y="0" width="110" height="900" />
              <rect x="0" y="0" width="330" height="90" />
              <rect x="1500" y="628" width="24" height="272" />
              <rect x="1440" y="628" width="160" height="14" />
              <ellipse cx="1512" cy="896" rx="30" ry="7" />
            </g>
            <path d="M110 0 V900" stroke="oklch(0.72 0.018 210 / .07)" strokeWidth="1.5" fill="none" />
            <path d="M0 90 H330" stroke="oklch(0.72 0.018 210 / .06)" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
      </div>

      {/* HAZE — light volume, CSS gradients only; the frame is JS-registered to
          the far-plane projection so the shafts meet the clerestory. Sits OUTSIDE
          the plane group, so it does not drift. */}
      <div className="scene-haze">
        <div className="scene-haze-frame">
          <div className="scene-fx scene-fx-haze" />
          <div className="scene-fx scene-fx-floor" />
          <div className="scene-fx scene-fx-floor-calm" />
          <div className="scene-fx scene-fx-shafts scene-fx-shafts-soft" />
          <div className="scene-fx scene-fx-shafts scene-fx-shafts-hard" />
          <div className="scene-fx scene-fx-center" />
          <div className="scene-fx scene-fx-table-spot" />
          <div className="scene-fx scene-fx-near-dim" />
          <div className="scene-fx scene-fx-dim" />
        </div>
      </div>
    </>
  )
}
