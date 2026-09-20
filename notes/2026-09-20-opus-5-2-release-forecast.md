# When does Claude Opus 5.2 ship? A dated forecast

**Written:** 2026-09-20 (Sun, 20:40 UTC) · **Status at time of writing:** unannounced

---

## 1. Verified timeline

Anthropic 2026 Opus/flagship releases (weekday in parens):

| Date | Model | Gap |
|---|---|---|
| 2026-02-05 (Thu) | Opus 4.6 | — |
| 2026-02-17 (Tue) | Sonnet 4.6 | — |
| 2026-04-16 (Thu) | Opus 4.7 | 70d |
| 2026-05-28 (Thu) | Opus 4.8 | 42d |
| 2026-06-09 (Tue) | Fable 5 / Mythos 5 | — |
| 2026-06-30 (Tue) | Sonnet 5 | — |
| 2026-07-24 (Fri) | **Opus 5** | 57d |
| 2026-09-01 (Tue) | Fable 5.1 / Mythos 5.1 | — |

Opus inter-release gaps: 70 / 42 / 57 days (mean ≈ 56). **Today is day 58 after Opus 5** — at the median already.
Weekday distribution since May 2025: Tue ×5, Thu ×4, Mon ×2, Wed ×1, Fri ×1, weekend ×0.

## 2. The Opus-5.2 evidence, dated (X timestamps decoded from snowflake IDs)

| When (UTC) | Event | Tier |
|---|---|---|
| Sep 3 | OpenAI ships GPT-6 Astra | context |
| Sep 5 | @kimmonismus: new Fable pretrain "very soon" → slips to late Sep/early Oct | claim only |
| Sep 12 | Amodei publishes *We Must Pace the Frontier* (slow capability gains 1–2 yrs; permanent employee-level access for third-party evaluators) | official |
| Sep 14 15:47 | @goodworse: "Opus 5.2 is coming at the END of this MONTH" | claim |
| Sep 14 17:41 | @synthwavedd (leo): greyscale test in Claude Code under the "Opus 5" label; "skipping 5.1, slugs reference 5.2" | behavioral |
| Sep 15 00:43 | leo: "a biiig step up over Opus 5… not quite the big model smell of Astra" | behavioral |
| Sep 17 19:13 | leo still benchmarking "Opus-Next (max)" vs Grok 4.7 | behavioral |
| Sep 17 night | Anthropic **cuts the routing off** | behavioral |
| Sep 18 07:28 | Routing **back, wider**: most/all paid accounts, now Chat + Cowork + Claude Code (was CC only) | behavioral |
| Sep 18 22:16 | leo: **Fable, Opus AND Sonnet** all stealth-tested → "may revive their old full lineup launch convention" | behavioral |
| Sep 18 | Reuters (Wang/Hu/Vinn): Anthropic *considering* a new model to counter Astra ahead of IPO, *weighing safety concerns* | reported |
| Sep 19–20 | Nothing. Rumored Sep 17–18 window closed empty | — |

**Evidence quality matters more than volume.** Two classes:
- *Artifact-backed* (a real identifier in a shipping product): Honeycomb EAP in Cursor's picker Jul 8–9 → Opus 5 GA Jul 23–24 (**~15 days**). Bedrock staging 404s for Fable 5.1 Aug 31 → GA Sep 1 (**~1 day**).
- *Claim-only* (a screenshot, a relayed codename): `claude-marshmallow-eap` / `claude-melon-eap`, Aug 21–24 → **never shipped**; `claude-wafer-eap` "Opus 5.5 next Tuesday" (@kimmonismus relaying "Lyra") → unverified. Record: **0-for-2**.

Opus 5.2 sits in between: behavior-based, multi-account, multi-surface, with Anthropic visibly toggling it — stronger than a claimed string, weaker than a shipped identifier.

## 3. Original checks run for this forecast (not in any blog)

- **Claude Code 2.1.278** (newest build, one version past the 2.1.276 the rumor blogs checked) — full string dump: `claude-opus-5`, `claude-sonnet-5`, `claude-fable-5-1`, `claude-mythos-5-1`, `claude-mythos-preview`, back through 4.x. **No `claude-opus-5-1`, `-5-2`, no `claude-sonnet-5-2`, `claude-fable-5-2`, no `*-eap` identifier.**
- **The "marshmallow"/"melon" codenames are words in Claude Code's own bundled random-name wordlists** (`…marble, marshmallow, melody, mitten, mochi…`; `melon` in the emoji-name list). "biscuit" and "pretzel" are in there too. Those leaks were trivially confectionable. "wafer" is *not* in the list, but it is the same register — discount the Opus 5.5 rumor accordingly.
- **The most-cited "hard" artifact is a dud**: the `claude-opus-5-2.yaml` "Microsoft Foundry slug" lives in a community model registry, committed by a bot on Aug 31 / Sep 4, carrying Opus 5's exact published values. The same bot made `-2` files for Opus 5, Opus 4.8, Sonnet 5 and Haiku 4.5 — it is a dedupe suffix, not a version number. Microsoft's own Foundry table (updated Sep 11) lists `claude-opus-5` only.
- **This session** (Claude Code cloud, 2026-09-20 20:42 UTC): `last_served_model = claude-opus-5`, no variant label.

## 4. Forces

**Pulling it forward**
- Astra is taking enterprise share: ~13% of Ramp-tracked enterprise AI spend vs ~8% for Claude Fable.
- **November IPO** (slipped from October to show Q3 numbers). A flagship needs to land before the roadshow, not during it. S-1 filed confidentially Jun 1; public flip plausibly early-mid October.
- Full-traffic stealth A/B on every paid surface is expensive; nobody runs it for fun.
- Quarter end Sep 30.

**Dragging it back**
- Amodei called for an industry slowdown on **Sep 12**. Shipping a frontier jump 9 days later is a bad look; Reuters says safety is being weighed.
- The **embedded-evaluator commitment** (permanent employee-level third-party access) was made Sep 12. The next flagship is its first live test — that is a new gate, not a removed one.
- **The Opus tier already false-started**: Opus "5.1" was stealth-tested the week of Aug 24–28; what shipped Sep 1 was Fable/Mythos 5.1. Opus-tier stealth → ship is **0-for-1** in the last month.
- Anthropic pulled the routing on Sep 17 and re-enabled a wider test on Sep 18 — a fix-and-revalidate cycle, not a final-lap cycle.
- **No cloud-partner staging artifacts** (Bedrock/Vertex/Foundry) reported as of Sep 19–20. Anthropic launches day-one on all three, and those listings stage 0–2 days ahead.
- Sep 18's three-tier test suggests a coordinated Fable + Opus + Sonnet launch. Three model cards, three price sheets, three provider rollouts ≠ four days of work.

## 5. Market read

- Polymarket *Next Claude Opus released on…?* (opened Sep 15, resolves ~Sep 30): Sep 21 ≈ 31–39%, Sep 22 ≈ 27%, Sep 23 ≈ 25%; ~81% for September overall.
- Polymarket *released by…?*: ~95% by Oct 31, ~98% by Dec 31.
- Kalshi *Opus 6 before Nov 1*: **12%** — the market agrees the next Opus is a point release.

I deviate down on the near dates. These tech-release-date markets are a documented failure mode (OddsShopper: Kalshi's release hype "0-for-16"); they reprice hard on the loudest recent signal and systematically overprice the nearest bucket. The Sep 21 line is a Monday with no staging evidence and a weekend in front of it.

## 6. Forecast

| Date | P |
|---|---|
| Mon Sep 21 | 6% |
| **Tue Sep 22** | **13%** |
| Wed Sep 23 | 6% |
| Thu Sep 24 | 8% |
| Fri Sep 25 | 2% |
| Mon Sep 28 | 5% |
| **Tue Sep 29** | **16%** ← mode |
| Wed Sep 30 | 8% |
| Thu Oct 1 | 5% |
| Oct 5–9 | 12% |
| Oct 12–16 | 8% |
| Oct 17–31 | 6% |
| Nov or later / none pre-IPO | 5% |

Cumulative: **by Sep 30 ≈ 64%**, by Oct 31 ≈ 90%.

**Call: Tuesday, 29 September 2026.** It is the only date that satisfies every constraint at once — the 15-day artifact→GA lag from Opus 5's own launch (Sep 14 + 15 = Sep 29), Anthropic's dominant Tuesday, quarter end, a full revalidation cycle after the Sep 17 pull, room for the new external-evaluator gate, the earliest insider-flavored claim ("end of this month"), and comfortably ahead of an October S-1 flip.

**Naming** is a separate bet: Opus 5.2 ≈ 55% (Fable/Mythos sit at 5.1; jumping Opus 5 → 5.2 aligns the lineup, which is the best argument for the name), Opus 5.5 ≈ 10%, Opus 5.1 ≈ 10%, Opus 6 ≈ 8%, something else ≈ 17%. Joint "a model officially named Claude Opus 5.2 ships on Sep 29" ≈ **9%**.

## 7. Falsifiers — what would move this

| Signal | Move |
|---|---|
| A real `claude-opus-5-2` in a Bedrock/Vertex/Foundry catalog or a Claude Code build | → launch within 48h; Sep 22 becomes the mode |
| Routing goes dark again for >3 days | → slips to October, Fable-5.2-bundled |
| Anthropic publicly flips the S-1 | → anything unshipped moves behind the roadshow |
| A *Fable* 5.2 card appears first | → confirms lineup launch; Opus rides the same day |
| Another Opus-tier false start (test ends, nothing ships) | → the Aug pattern repeats; push mass into late Oct |
