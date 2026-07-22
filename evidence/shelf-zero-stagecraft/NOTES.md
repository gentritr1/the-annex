# Shelf Zero stagecraft — proof-of-feeling note

Honest account of what the redesign is doing, where it lands, and where it is still
just adequate. Screenshots and JSON in this directory back every claim below.

## What the room now is

One physical workstation inside the site inspector, not a scroll. The
`.classification-room` is a fixed 384px surface whose *content* swaps in place;
`geometry.json` shows its bounding height is identical (variance 0) across all
seven captured states, and `.site-inspector` never scrolls (overflow 0) in any of
them. The description that normally sits above a site's actions is folded away
while a room is up (`:has(.classification-room)`), which is what buys the tableau
the vertical room to hold the two unlocked methods without an inner scroll at
1280×800.

## Where the anticipation comes from

Two things carry it, and neither is a countdown.

1. **The reserved empty cell.** From the very first render the four filing targets
   are laid out as a 2×2 grid, but only three are labelled — the fourth is a
   visible, empty slot (`01-initial-tableau`). You cannot name what it is yet, but
   you can see there is a place the statute has left blank. Nothing in the DOM
   spoils it: the fourth card and the shelf-zero control are both *absent* from the
   document until they are earned (geometry.json: `pocketCardInDom` and
   `shelfZeroInDom` stay false through routine/pocket).

2. **The escalation.** The three routine cards are one press each — fast, almost
   clerical, the statute flattening a real person into a drawer. Then the pocket
   card arrives in the same slot and the rhythm breaks: the same three buttons that
   just *accepted* now *refuse*, one at a time, extinguishing with a struck-through
   "REFUSED" (not colour alone). The authored refusal lines escalate, and the third
   lands hardest — "The third class will not even take the corner. There was never
   a drawer cut for this one." (`04-third-refusal`, `05-shelf-zero`).

## Where the reveal lands

On the third refusal, in the slot that was empty the whole time. The aperture
button materialises in the reserved cell (`05-shelf-zero`) — the tableau does not
grow, nothing below it moves, the height is unchanged to the pixel. That stillness
is the point: the discovery is that the blank was always a place, not that a new
panel appeared. The plate answers in the same beat — a dark aperture opens beneath
the drawer register on the painted wall, and the three category traces by the
shuttered index go dark one by one as the refusals land.

## Why it doesn't become repetitive

Every phase is a different verb on the same surface. Routine is *file* (accept).
Pocket is *refuse* (the buttons invert). Shelf zero is *place* (a fourth, unlabeled
target). The log is *turn* (read what was removed). Methods is *decide* (the two
canonical choices replace everything). You are never doing the same action twice in
a row for long, and the surface you are doing it on never jumps, so the changes
read as one object transforming rather than a list accumulating.

## The return payoff

Committing a method and taking the real "Return to concourse" control holds the
altered portal for ~950ms before ordinary navigation resumes
(`08-return-*-emphasis` is the mid-hold frame). Opened and sealed are
distinguishable with the portal labels hidden (`10-return-*-labels-hidden`): opened runs a
warm amber seam and light-spill around threshold D; sealed lowers a barred shutter
(four bars) over a darkened, cooled frame. Both cues live in the WebGL frame *and*
in a DOM overlay, so the distinction survives the poster fallback and high contrast.

## Honest limits

- The methods phase is the tightest fit. At 1280×800 both `ChoiceButton`s and the
  unlock line sit fully inside the fixed tableau with zero inner scroll (measured),
  but the margin is small — the room stage is sized so a taller viewport only adds
  slack, never a scroll, and a *shorter* one would fall back to an inner scroll of
  the tableau rather than growing the inspector. It degrades toward the safety net,
  not toward a broken layout.
- The single live region shows the last transition line clamped to a fixed height
  so it can't change the tableau's height; the full text is always in the DOM and
  read by `aria-live`, but on desktop a very long slip fragment is visually clipped
  to ~two lines (it is shown in full on mobile, where the room is allowed to grow).
- The worktop phases carry some intentional headroom because the fixed height is
  sized for the tallest phase (methods). The card and targets were enlarged to fill
  most of it; a little air remains at the bottom of the routine/pocket states.
