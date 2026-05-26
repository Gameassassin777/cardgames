// Automated verification script for the Card Quality Evaluator (LCQE)
// Run this with: node verify_evaluator.js

import { PROMPTS, RESPONSES, NORMAL_PROMPTS, NORMAL_RESPONSES } from "./js/data.js";
import { runEvaluation } from "./js/evaluator.js";

console.log("----------------------------------------------------------------");
console.log("LCQE: Running Card Quality Evaluation & Playtest Simulation...");
console.log("----------------------------------------------------------------");

try {
  // Run evaluation for Monkeys Deck
  console.log("\n[1/2] Analyzing 'Cards Against Monkeys' Deck (1,000 rounds)...");
  const reportMonkeys = runEvaluation(PROMPTS, RESPONSES, 1000);
  const sumMonkeys = reportMonkeys.summary;

  console.log(`- Health Index:      ${sumMonkeys.healthIndex}`);
  console.log(`- Total Prompts:     ${sumMonkeys.totalPrompts}`);
  console.log(`- Total Responses:   ${sumMonkeys.totalResponses}`);
  console.log(`- Mid Flagged:       ${sumMonkeys.midResponsesCount}`);
  console.log(`- Awkward Flagged:   ${sumMonkeys.awkwardResponsesCount}`);

  // Sample cards flagged as Mid or Awkward in Monkeys
  const monkeyIssues = reportMonkeys.responses.filter(r => r.grade === "D" || r.grade === "F");
  if (monkeyIssues.length > 0) {
    console.log("\n⚠️ Sample Flagged Cards in Monkeys Deck:");
    monkeyIssues.slice(0, 3).forEach(r => {
      console.log(`  - "${r.text}" [Grade ${r.grade}]`);
      r.flags.forEach(f => console.log(`    Flag: ${f}`));
      r.recommendations.forEach(rec => console.log(`    Rec:  ${rec}`));
    });
  }

  // Run evaluation for Cabin Deck
  console.log("\n[2/2] Analyzing 'Cards Against the Cabin' Deck (1,000 rounds)...");
  const reportCabin = runEvaluation(NORMAL_PROMPTS, NORMAL_RESPONSES, 1000);
  const sumCabin = reportCabin.summary;

  console.log(`- Health Index:      ${sumCabin.healthIndex}`);
  console.log(`- Total Prompts:     ${sumCabin.totalPrompts}`);
  console.log(`- Total Responses:   ${sumCabin.totalResponses}`);
  console.log(`- Mid Flagged:       ${sumCabin.midResponsesCount}`);
  console.log(`- Awkward Flagged:   ${sumCabin.awkwardResponsesCount}`);

  // Sample cards flagged as Mid or Awkward in Cabin
  const cabinIssues = reportCabin.responses.filter(r => r.grade === "D" || r.grade === "F");
  if (cabinIssues.length > 0) {
    console.log("\n⚠️ Sample Flagged Cards in Cabin Deck:");
    cabinIssues.slice(0, 3).forEach(r => {
      console.log(`  - "${r.text}" [Grade ${r.grade}]`);
      r.flags.forEach(f => console.log(`    Flag: ${f}`));
      r.recommendations.forEach(rec => console.log(`    Rec:  ${rec}`));
    });
  }

  console.log("\n----------------------------------------------------------------");
  console.log("LCQE Verification Completed Successfully!");
  console.log("----------------------------------------------------------------");

} catch (err) {
  console.error("Verification failed with error:", err);
  process.exit(1);
}
