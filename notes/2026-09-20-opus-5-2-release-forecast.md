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

---

## 8. Addendum — the two lists, separated

### 8a. Signals present now that argue *sooner*

1. **The routing widened after being killed.** Cut Sep 17 night, back Sep 18 07:28 on most/all paid accounts and on three surfaces instead of one. Serving a candidate to full-price traffic costs real money; widening it after a pull means something was fixed and cleared, not shelved.
2. **Three tiers at once.** Fable + Opus + Sonnet in stealth on Sep 18 implies an assembled release train, not one experiment.
3. **Testers report an eval-grade delta**, not a research checkpoint: "a biiig step up over Opus 5," benchmarked head-to-head against Grok 4.7 at max effort.
4. **Cadence is due.** Day 58 after Opus 5; prior Opus gaps 70 / 42 / 57.
5. **Reuters ran it on three sources (Sep 18).** Wire stories of this shape land weeks, not months, ahead.
6. **A hard commercial clock.** Astra ~13% of Ramp-tracked enterprise AI spend vs ~8% for Claude; November IPO; a likely October S-1 flip.
7. **Markets agree on the month** (~81% September) even if their day is wrong.

### 8b. Precursors that fired on the last two launches and have *not* fired here

| Precursor | Opus 5 (Jul 24) | Fable 5.1 (Sep 1) | Now |
|---|---|---|---|
| Bedrock identifier flips **400 → 404** (registered, unprovisioned) | — | 400 on Aug 24 → **404 on Aug 31** → GA Sep 1 | **not reported for any Opus 5.x** |
| A real identifier in a shipping product | `Honeycomb EAP` in Cursor's picker Jul 8–9, pulled in hours → GA ~15d later | Bedrock entry | **none anywhere**; the stealth build serves under the unchanged `Opus 5` label |
| Identifier in a Claude Code build | on launch | on launch | **absent in 2.1.278** (dumped directly) |
| Day-one multi-cloud (API + Bedrock + Vertex + Foundry) | yes | yes | Foundry's Claude table (upd. Sep 11) lists `claude-opus-5` only |
| OpenRouter listing | same day | same day | no Opus 5.x |
| Model card / docs / pricing row / changelog | launch day | launch day | **nothing as of Sep 18–19** |
| Any named Anthropic employee saying anything | yes | yes | **zero** |
| Anonymous Arena checkpoint | — | — | the current Arena mystery model is Google's `gemini-3.8-flash`, not Anthropic's |

**The 400/404 probe is the one validated discriminator we have.** In its only head-to-head test it called both outcomes right: `claude-fable-5-1` flipped to 404 and shipped the next day; `claude-opus-5-1` stayed at 400 and never shipped at all.

### 8c. The asymmetry, and the thing that reframes it

Everything in 8a is **upstream** — training finished, candidate serving, business pressure. Everything in 8b is **downstream** — catalog registration, partner provisioning, docs. Downstream precursors have 0–2 day lead times, so their absence cannot rule out Sep 22; it only means **nothing has crossed the point of no return.** Discount it further for the calendar: nobody runs the Bedrock probe on a Sunday.

The reframe: **broad pre-launch consumer routing is not part of either recent launch pattern.** Fable 5.1 was first seen in Claude Code at 17:33 UTC *on launch day* — there was no consumer-visible stealth phase at all. The only recent Opus-tier precedent for what we're watching now is the late-August test that produced no Opus release. So the loudest signal in 8a is the one with the worst track record, and the quiet checklist in 8b is the one that has never been wrong.

That is why the call stays Sep 29 rather than Sep 22.

**Tripwire:** a Bedrock 404 on any `claude-opus-5-*` identifier → launch inside 24–72 hours, and Sep 22 takes the lead.

---

## 9. Correction — the absence evidence is not yet load-bearing, and the call moves to Sep 22

Section 8b overstated its case, and §6's anchor was weaker than it read.

**1. Almost every precursor in 8b has zero lead time.** The Bedrock flip was T-1 (Aug 31 → Sep 1 GA). OpenRouter, the model card, the docs entry, the pricing row, the Foundry table, the partner blog posts and the first Anthropic employee word were all T-0. For a Tuesday Sep 22 launch the flip would happen **Monday Sep 21**. Today is Sunday. There is no artifact we should expect to see yet, so seeing none says nothing. The checklist in 8b is a *tripwire*, not a *forecast input* — it was wrong to score it as evidence for a later date.

**2. The 15-day Honeycomb anchor conflates two different quantities.** `Honeycomb EAP` surfaced in Cursor on Jul 8–9 because someone shipped a picker entry by accident, not because Anthropic's launch process began that day. Mapping Sep 14 + 15 = Sep 29 treats an accidental leak interval as a process duration. It isn't one.

**3. The better-matched reference class is stealth duration, and it points at this week.** Fable 5.1 ran subset/shadow testing from roughly Aug 26–28, registered on Bedrock Aug 31, shipped Sep 1 — **~4–7 days of stealth**. Opus-Next has been serving since Sep 14. Day 6–7 lands on **Sep 20–23**.

**4. The August "false start" reads differently on a second look.** Opus was in stealth in late August *while Fable 5.1 was ahead of it in the release train*. Fable shipped; Opus waited. That is a queue, not a cancellation — and the queue ahead of Opus is now empty.

**5. Sep 22 is a Tuesday.** The weekday argument used to support Sep 29 supports Sep 22 identically.

What genuinely still holds mass later: a bundled three-tier launch gated by Fable 5.2's new pretrain (its own leak slipped to late Sep/early Oct); the Sep 17 pull proving an unresolved issue existed 72 hours ago; and Reuters sourcing "considering" to three people on Sep 18 — an odd way for insiders to describe a launch four days out.

### Revised distribution

| Date | Was | Now |
|---|---|---|
| Mon Sep 21 | 6% | 7% |
| **Tue Sep 22** | 13% | **19%** ← mode |
| Wed Sep 23 | 6% | 8% |
| Thu Sep 24 | 8% | 9% |
| Fri Sep 25 | 2% | 2% |
| Mon Sep 28 | 5% | 4% |
| Tue Sep 29 | **16%** | 13% |
| Wed Sep 30 | 8% | 7% |
| Thu Oct 1 | 5% | 4% |
| Oct 5–9 | 12% | 11% |
| Oct 12–16 | 8% | 7% |
| Oct 17–31 | 6% | 5% |
| Nov+ / none pre-IPO | 5% | 4% |

By Sep 30: 64% → **69%**.

**Revised call: Tuesday, 22 September 2026**, with Sep 29 the main alternative.

**This resolves itself within ~24 hours.** Monday Sep 21 is when the absence starts carrying weight: a Bedrock 400 → 404 flip on any `claude-opus-5-*`, a Foundry or Vertex catalog entry, or the identifier landing in a Claude Code build means Tuesday. Monday closing with all three still empty kills Sep 22, and the mass moves to Sep 24 and Sep 29.

---

## 10. Forum sentiment — and why it should not move the number

**Access caveat:** Reddit blocks Anthropic's crawler, so this session cannot read Reddit directly — the search tool returns no reddit.com results and direct fetches are refused. Everything here is secondhand from write-ups that quote the threads, and is weaker than the X posts in §2, which carry verifiable timestamps.

What is reported: a r/ClaudeCode thread, *"Opus 5.2 Stealth routing?"* (u/Bloated_Plaid), plus r/ClaudeAI discussion. Users on Opus 5 or Default report the assistant replying faster, being less chatty before it calls a tool, writing less over-engineered code, and finishing tasks in fewer turns.

**The community's own detection ritual is unreliable.** @notjazii (Sep 14, 14:00 UTC — the origin post for the whole rumor) proposed: run `do you know who is "tibo" the reset guy, don't search` in Claude Code; if it knows, you're on the new model. Tibo is Thibault Sottiaux, who leads Codex at OpenAI and picked up the nickname for posting about OpenAI resetting usage limits after outages. So the probe is a training-recency proxy, not a version check — and users report it failing in both directions. Run against this session (`last_served_model: claude-opus-5`, unrouted): no knowledge of "Tibo the reset guy." That result is equally consistent with "old model" and with "the probe measures nothing."

**The skeptics have the better track record.** In August a Hacker News thread — *"Anthropic appears to be A/B testing reduced effort levels in Claude Code"* — ran on the same evidentiary base (sessions feel different, cross-account comparisons) and produced no confirmation. Anthropic's own April 23 postmortem showed that Claude Code quality complaints have sometimes been real infrastructure bugs, not model swaps. Perceived behavior change has several explanations before "unannounced model."

**Feedback loop worth discounting:** crypto-news aggregators (KuCoin, 36kr, MEXC) have already run "Claude Opus 5.2 Launches" headlines. Nothing launched. Those headlines circulate back into the forums as confirmation.

**The analytic point:** Reddit's belief is downstream of the same two X accounts already counted in §2 — @notjazii for the original claim, @synthwavedd for the routing observations. It is an echo, not an independent source. Volume of agreement is not corroboration, and counting it again would be double-counting correlated evidence. **Forecast unchanged: Tue 22 Sep, 19%.**

---

## 11. Sep 21 — the rumor renamed itself. The date call holds; the name call does not.

**What changed:** the Sep 17–18 window closed empty, and on **Sep 20 the same rumor respawned as "Opus 5.5" with a Tuesday date** — same single source (@kimmonismus relaying "Lyra"), same absence of a model card, API identifier, price sheet, benchmark or second outlet. Anthropic's models overview, platform release notes, pricing page and OpenRouter's catalog carry neither an Opus 5.2 nor an Opus 5.5.

**That mutation is itself the finding.** A rumor that renames and re-dates after each miss, rather than dying, is unfalsifiable. Three names have now been attached to one unreleased Opus in four weeks — 5.1 (late Aug), 5.2 (Sep 14), 5.5 (Sep 20) — and the only thing that survived each revision is "soon."

**"Tuesday" is nearly free information.** Tuesday is Anthropic's modal release day (5 of the last 13 launches; Thursday 4). A leaker who says "Tuesday" is picking the base-rate favorite, and will look prescient if the launch lands there for reasons having nothing to do with access.

**So do not read the agreement as convergence.** §9's Sep 22 and the leaker's Tuesday are not two independent signals — both contain the same weekday base rate. Strip that shared term and what remains on my side is stealth duration (day 6–7, matching Fable 5.1's 4–7) plus cadence; what remains on theirs is nothing checkable. Correlated, not corroborating.

**A hypothesis that reconciles the names.** The routed behavior — faster, more concise, less lazy, autonomous iteration — is the signature of a **post-train refresh on the same base**, which is a 5.1/5.2-shaped release. "Wafer" is described as a *new checkpoint*, and the Fable 5.2 leak as a *new pretrain*. Those are different objects. If the model serving since Sep 14 is the post-train and wafer is the pretrain, then the near-term ship is the routed model under an uncertain label and 5.5 is an October-or-later thing. Under that reading the naming chaos is expected, not alarming.

### Revised naming distribution (date unchanged)

| Name | §6 | now |
|---|---|---|
| Opus 5.2 | 55% | 40% |
| Opus 5.5 | 10% | 20% |
| Opus 5.1 | 10% | 8% |
| Opus 6 | 8% | 7% |
| Other / renamed | 17% | 25% |

**Date call unchanged: Tue 22 Sep, 19%** — it never rested on the rumor's label, and a rumor mill re-dating itself is noise in both directions.

**Tripwire status, 2026-09-21 04:05 UTC (= Sun 21:05 US Pacific):** no Bedrock 400 → 404 flip, no Foundry or Vertex catalog entry, no identifier in a Claude Code build, no OpenRouter row, nothing from Anthropic. The US working day has not started, so the entire window in which a Tuesday launch would stage is still ahead. Absence remains uninformative until Monday evening Pacific.

---

## 12. Deep dive: the Opus 5.5 / `claude-wafer-eap` claim

### 12a. What the claim is, exactly
One post, Sep 20: @kimmonismus relaying a leaker called **Lyra** — the next Opus is **5.5**, internal codename **`claude-wafer-eap`**, could land **Tuesday Sep 22**. No model card, no API identifier, no price sheet, no benchmark, no second outlet. The string appears in the signal text and nowhere else: no repository reference, no API slug, no configuration leak, no screenshot of a shipping product.

### 12b. Source quality, assessed fairly
@kimmonismus is not a nobody. In 2026 he surfaced `claude-marshmallow-eap` and `claude-melon-eap` (Aug 21–24 — names that **never shipped**) *and* called the Fable 5.1 / Opus 5.1 release-window delay on **Aug 29**, days before Fable 5.1 shipped Sep 1.

**The pattern is the useful part: right about windows, wrong about names.** That is exactly the asymmetry to trade on — weight his Tuesday more than his "5.5." **Lyra** is a handle with no checkable record; the same Lyra sourced his Sep 12 claim that Google DeepMind had reached RSI.

### 12c. The artifact test — three classes of 2026 Anthropic leak

| Class | Example | Outcome |
|---|---|---|
| **Anthropic's own data leak** | Mythos / "Capybara", Mar 2026 — a CMS misconfiguration exposed ~3,000 unpublished assets; Anthropic confirmed it | Mythos 5 shipped Jun 9 ✓ |
| **Sighting in a shipping product's UI** | `Claude Honeycomb EAP` in Cursor's model picker, Jul 9 03:03 UTC (@chetaslua), pulled within hours — "research model with per-turn controls and safety fallbacks, early access preview, 1M context, extra high effort" | Opus 5 shipped Jul 23–24 ✓ |
| **Relayed word from a leaker** | marshmallow, melon, **wafer** | 0-for-2, wafer pending |

`EAP` is a real Anthropic construct — Mythos ran an Early Access Program for cyber defenders — so `claude-wafer-eap` is *well-formed*. Well-formedness is cheap: the convention is public.

### 12d. Two corrections to my own earlier reasoning

1. **I discounted wafer partly by association, and that was unfair.** §3's debunk was that `marshmallow` and `melon` are words in Claude Code's own bundled wordlists. **`wafer` is not in those lists**, so the wordlist-sampling explanation does not transfer to it.
2. **Its absence from the CLI binary proves nothing.** Control test on 2.1.278: `capybara` — a confirmed-real internal codename Anthropic acknowledged after their own leak — appears **0 times**. So does `glasswing`, the confirmed Mythos partner-program name. Product names appear heavily (`mythos` 33, `fable` 117). **Internal codenames never reach the shipping binary**, so `wafer` being absent is expected whether or not it is real.

### 12e. The naming question is more interesting than the rumor

Anthropic's convention: **`.5` marks a substantial upgrade within a generation** (3.5, 4.5); **`.6/.7/.8` mark incremental refinements**. So "5.5" is a claim about *magnitude*, not merely sequence.

That collides with the evidence. The behavior reported from the stealth build — faster, more concise, less lazy, autonomous iteration loops — is **post-train polish**, which is 5.1/5.2-shaped. Either the leak describes a different model from the one being routed, or the number is wrong.

**And the 3.6 precedent cuts against "5.2" specifically.** Anthropic skipped 3.6 entirely because the community had already claimed that label for the October 2024 update to 3.5 Sonnet, and went straight to 3.7. The community has now spent a week calling the stealth build "5.2." In the one case on record, Anthropic's revealed preference is to **avoid a number the community has informally taken**. That is a real, if small, argument for a shipped name that is not 5.2 — and it is the same manoeuvre as jumping to 5.5.

### 12f. Revised naming distribution

| Name | §6 | §11 | now |
|---|---|---|---|
| Opus 5.2 | 55% | 40% | **33%** |
| Opus 5.5 | 10% | 20% | **25%** |
| Opus 5.1 | 10% | 8% | 8% |
| Opus 6 | 8% | 7% | 7% |
| Other / renamed | 17% | 25% | 27% |

### 12g. The internal tension that matters most

**"5.5 on Tuesday" is self-undermining.** A `.5` name asserts a substantial upgrade — realistically a new pretrain, which needs a model card, a full safety write-up under the embedded-evaluator commitment made Sep 12, and staged provisioning across three clouds. The Fable 5.2 pretrain leak already slipped from "very soon" to late Sep / early Oct for exactly those reasons.

So: **either it ships Tuesday and is not 5.5-scale, or it is 5.5-scale and does not ship Tuesday.** The two halves of the same rumor pull against each other, which is itself a reason to treat the pairing as assembled rather than observed.

**Date call unchanged: Tue 22 Sep, 19%.** What ships that day, if it ships, is most likely the routed post-train under a label nobody outside Anthropic has yet seen written down.

---

## 15. Status log

**2026-09-21 14:24 UTC (07:24 US Pacific).** No change on any discriminator.

- Bedrock / Vertex / Foundry: no `claude-opus-5-*` beyond `claude-opus-5`. No 400 → 404 flip reported.
- OpenRouter Anthropic catalog: Opus 5, Opus 5 (batch), Fable 5.1, back-catalog. Nothing new.
- Anthropic docs, release notes, news index, status page: nothing.
- This session: `last_served_model: claude-opus-5`, unrouted.

**The only movement is amplification.** A new post (@pankajkumar_dev, Sun 18:58 UTC) restates the 5.5/`claude-wafer-eap`/Tuesday claim and adds "I think they changed it because Opus 5.5 has significant changes compared with Opus 5.1" — self-marked speculation, referencing an Opus 5.1 that never shipped, with no new source. Some write-ups have begun printing `claude-opus-5-5` as though it were an observed identifier; it is an inference from the rumored name, not a sighting.

This is the echo pattern from §10: repetition raising apparent confidence while the evidence base stays at one account. Forecast unchanged — **Tue 22 Sep 23%, by Sep 30 77%**.

The US working day has only just begun, so today is still the window in which a Tuesday launch would stage. Tripwire re-checks scheduled through the day.
