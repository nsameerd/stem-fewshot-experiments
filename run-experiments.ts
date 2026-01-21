/**
 * STEM Few-Shot Prompting Experiments
 *
 * This script runs systematic experiments comparing zero-shot vs few-shot prompting
 * across mathematics, physics, chemistry, and biology problems.
 *
 * Run with: npx tsx scripts/stem-fewshot-experiments/run-experiments.ts
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.join(__dirname, 'results');
const PROMPTS_DIR = path.join(__dirname, 'prompts');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ============================================================================
// EXPERIMENT DEFINITIONS
// ============================================================================

interface Problem {
  id: string;
  domain: 'math' | 'physics' | 'chemistry' | 'biology';
  difficulty: 'easy' | 'medium' | 'hard';
  prompt: string;
  expectedAnswer?: string; // For verification
  answerType: 'exact' | 'steps' | 'explanation';
}

interface FewShotExample {
  problem: string;
  solution: string;
}

interface ExperimentResult {
  problemId: string;
  model: 'claude' | 'gemini';
  condition: 'zero-shot' | '1-shot' | '3-shot' | '5-shot';
  prompt: string;
  response: string;
  tokenCount: number;
  latencyMs: number;
  timestamp: string;
}

// ============================================================================
// TEST PROBLEMS
// ============================================================================

const PROBLEMS: Problem[] = [
  // MATHEMATICS
  {
    id: 'math-1',
    domain: 'math',
    difficulty: 'medium',
    prompt: 'Find the integral of x²·sin(x) dx',
    expectedAnswer: '-x²cos(x) + 2xsin(x) + 2cos(x) + C',
    answerType: 'steps'
  },
  {
    id: 'math-2',
    domain: 'math',
    difficulty: 'medium',
    prompt: 'Find the derivative of ln(x²+1)·eˣ',
    expectedAnswer: 'eˣ[ln(x²+1) + 2x/(x²+1)]',
    answerType: 'steps'
  },
  {
    id: 'math-3',
    domain: 'math',
    difficulty: 'easy',
    prompt: 'Evaluate the limit: lim(x→0) sin(3x)/x',
    expectedAnswer: '3',
    answerType: 'steps'
  },
  {
    id: 'math-4',
    domain: 'math',
    difficulty: 'hard',
    prompt: 'Find the derivative of x^x (x to the power x)',
    expectedAnswer: 'x^x(ln(x) + 1)',
    answerType: 'steps'
  },
  {
    id: 'math-5',
    domain: 'math',
    difficulty: 'medium',
    prompt: 'Solve the definite integral: ∫₀^π sin²(x) dx',
    expectedAnswer: 'π/2',
    answerType: 'steps'
  },

  // PHYSICS
  {
    id: 'physics-1',
    domain: 'physics',
    difficulty: 'medium',
    prompt: 'A ball is thrown at 45° with initial velocity 20 m/s. Find the maximum height and horizontal range. (Use g = 10 m/s²)',
    expectedAnswer: 'Max height = 10 m, Range = 40 m',
    answerType: 'steps'
  },
  {
    id: 'physics-2',
    domain: 'physics',
    difficulty: 'medium',
    prompt: 'A 2 kg mass on a spring (k = 50 N/m) is displaced 0.1 m from equilibrium. Find the period of oscillation and maximum velocity.',
    expectedAnswer: 'Period = 1.26 s, Max velocity = 0.5 m/s',
    answerType: 'steps'
  },
  {
    id: 'physics-3',
    domain: 'physics',
    difficulty: 'easy',
    prompt: 'A car accelerates from rest at 3 m/s² for 5 seconds. Find the final velocity and distance traveled.',
    expectedAnswer: 'Final velocity = 15 m/s, Distance = 37.5 m',
    answerType: 'steps'
  },
  {
    id: 'physics-4',
    domain: 'physics',
    difficulty: 'hard',
    prompt: 'Two capacitors of 4 μF and 6 μF are connected in series across a 100V supply. Find the equivalent capacitance and energy stored.',
    expectedAnswer: 'Equivalent capacitance = 2.4 μF, Energy = 12 mJ',
    answerType: 'steps'
  },

  // CHEMISTRY
  {
    id: 'chem-1',
    domain: 'chemistry',
    difficulty: 'medium',
    prompt: 'Balance the equation: Fe + O₂ + H₂O → Fe(OH)₃',
    expectedAnswer: '4Fe + 3O₂ + 6H₂O → 4Fe(OH)₃',
    answerType: 'steps'
  },
  {
    id: 'chem-2',
    domain: 'chemistry',
    difficulty: 'easy',
    prompt: 'Balance the equation: Al + O₂ → Al₂O₃',
    expectedAnswer: '4Al + 3O₂ → 2Al₂O₃',
    answerType: 'steps'
  },
  {
    id: 'chem-3',
    domain: 'chemistry',
    difficulty: 'medium',
    prompt: 'How many grams of NaCl are needed to prepare 500 mL of a 0.5 M solution? (Molar mass of NaCl = 58.5 g/mol)',
    expectedAnswer: '14.625 g',
    answerType: 'steps'
  },
  {
    id: 'chem-4',
    domain: 'chemistry',
    difficulty: 'hard',
    prompt: 'Balance the redox reaction in acidic medium: MnO₄⁻ + Fe²⁺ → Mn²⁺ + Fe³⁺',
    expectedAnswer: 'MnO₄⁻ + 8H⁺ + 5Fe²⁺ → Mn²⁺ + 5Fe³⁺ + 4H₂O',
    answerType: 'steps'
  },

  // BIOLOGY
  {
    id: 'bio-1',
    domain: 'biology',
    difficulty: 'medium',
    prompt: 'List the main steps of glycolysis and the net ATP yield.',
    answerType: 'explanation'
  },
  {
    id: 'bio-2',
    domain: 'biology',
    difficulty: 'medium',
    prompt: 'Explain the process of DNA replication, including the key enzymes involved.',
    answerType: 'explanation'
  },
  {
    id: 'bio-3',
    domain: 'biology',
    difficulty: 'easy',
    prompt: 'What are the four nitrogenous bases in DNA and how do they pair?',
    expectedAnswer: 'A-T, G-C base pairing',
    answerType: 'explanation'
  }
];

// ============================================================================
// FEW-SHOT EXAMPLES
// ============================================================================

const MATH_EXAMPLES: FewShotExample[] = [
  {
    problem: 'Find the derivative of x³',
    solution: `**Solution:**
- Apply power rule: $\\frac{d}{dx}[x^n] = nx^{n-1}$
- $\\frac{d}{dx}[x^3] = 3x^2$
- **Answer:** $\\boxed{3x^2}$`
  },
  {
    problem: 'Find the derivative of x·sin(x)',
    solution: `**Solution:**
- Apply product rule: $(uv)' = u'v + uv'$
- Let $u = x$, $v = \\sin(x)$
- $u' = 1$, $v' = \\cos(x)$
- $\\frac{d}{dx}[x \\cdot \\sin(x)] = 1 \\cdot \\sin(x) + x \\cdot \\cos(x)$
- **Answer:** $\\boxed{\\sin(x) + x\\cos(x)}$`
  },
  {
    problem: 'Find the derivative of sin(x²)',
    solution: `**Solution:**
- Apply chain rule: $\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)$
- Outer function: $\\sin(u)$, Inner function: $u = x^2$
- $\\frac{d}{dx}[\\sin(x^2)] = \\cos(x^2) \\cdot 2x$
- **Answer:** $\\boxed{2x\\cos(x^2)}$`
  },
  {
    problem: 'Find the derivative of ln(3x+1)',
    solution: `**Solution:**
- Apply chain rule with logarithm: $\\frac{d}{dx}[\\ln(u)] = \\frac{1}{u} \\cdot u'$
- $\\frac{d}{dx}[\\ln(3x+1)] = \\frac{1}{3x+1} \\cdot 3$
- **Answer:** $\\boxed{\\frac{3}{3x+1}}$`
  },
  {
    problem: 'Evaluate the integral ∫ x·eˣ dx',
    solution: `**Solution:**
- Apply integration by parts: $\\int u \\, dv = uv - \\int v \\, du$
- Let $u = x$, $dv = e^x dx$
- Then $du = dx$, $v = e^x$
- $\\int x \\cdot e^x dx = x \\cdot e^x - \\int e^x dx = xe^x - e^x + C$
- **Answer:** $\\boxed{e^x(x-1) + C}$`
  }
];

const PHYSICS_EXAMPLES: FewShotExample[] = [
  {
    problem: 'A car accelerates from rest at 2 m/s² for 4 seconds. Find the final velocity and distance.',
    solution: `**Solution:**

| Known | Value |
|-------|-------|
| Initial velocity ($v_0$) | 0 m/s |
| Acceleration ($a$) | 2 m/s² |
| Time ($t$) | 4 s |

**Find:** Final velocity ($v$), Distance ($s$)

**Equations:**
- $v = v_0 + at$
- $s = v_0 t + \\frac{1}{2}at^2$

**Calculation:**
- $v = 0 + (2)(4) = 8$ m/s
- $s = 0 + \\frac{1}{2}(2)(4)^2 = 16$ m

**Answer:** $v = 8$ m/s, $s = 16$ m`
  },
  {
    problem: 'A projectile is launched at 30° with velocity 10 m/s. Find max height. (g = 10 m/s²)',
    solution: `**Solution:**

| Known | Value |
|-------|-------|
| Initial velocity ($v_0$) | 10 m/s |
| Angle ($\\theta$) | 30° |
| g | 10 m/s² |

**Find:** Maximum height ($H$)

**Equations:**
- $v_{0y} = v_0 \\sin\\theta$
- $H = \\frac{v_{0y}^2}{2g}$

**Calculation:**
- $v_{0y} = 10 \\times \\sin(30°) = 10 \\times 0.5 = 5$ m/s
- $H = \\frac{5^2}{2 \\times 10} = \\frac{25}{20} = 1.25$ m

**Answer:** $H = 1.25$ m`
  },
  {
    problem: 'Find the period of a simple pendulum of length 1 m. (g = 10 m/s²)',
    solution: `**Solution:**

| Known | Value |
|-------|-------|
| Length ($L$) | 1 m |
| g | 10 m/s² |

**Find:** Period ($T$)

**Equation:** $T = 2\\pi\\sqrt{\\frac{L}{g}}$

**Calculation:**
- $T = 2\\pi\\sqrt{\\frac{1}{10}} = 2\\pi \\times 0.316 = 1.99$ s

**Answer:** $T \\approx 2$ s`
  }
];

const CHEMISTRY_EXAMPLES: FewShotExample[] = [
  {
    problem: 'Balance: H₂ + O₂ → H₂O',
    solution: `**Solution:**
- Unbalanced: H₂ + O₂ → H₂O

| Atom | Left | Right |
|------|------|-------|
| H | 2 | 2 |
| O | 2 | 1 |

- O is unbalanced. Put coefficient 2 before H₂O: H₂ + O₂ → 2H₂O
- Now H is unbalanced (2 vs 4). Put coefficient 2 before H₂: 2H₂ + O₂ → 2H₂O

**Verification:**
| Atom | Left | Right |
|------|------|-------|
| H | 4 | 4 ✓ |
| O | 2 | 2 ✓ |

**Answer:** $2H_2 + O_2 \\rightarrow 2H_2O$`
  },
  {
    problem: 'Balance: N₂ + H₂ → NH₃',
    solution: `**Solution:**
- Unbalanced: N₂ + H₂ → NH₃

| Atom | Left | Right |
|------|------|-------|
| N | 2 | 1 |
| H | 2 | 3 |

- Put coefficient 2 before NH₃: N₂ + H₂ → 2NH₃
- Now H: 2 left, 6 right. Put coefficient 3 before H₂: N₂ + 3H₂ → 2NH₃

**Verification:**
| Atom | Left | Right |
|------|------|-------|
| N | 2 | 2 ✓ |
| H | 6 | 6 ✓ |

**Answer:** $N_2 + 3H_2 \\rightarrow 2NH_3$`
  }
];

const BIOLOGY_EXAMPLES: FewShotExample[] = [
  {
    problem: 'Describe the phases of mitosis.',
    solution: `**Overview:** Mitosis is cell division that produces two identical daughter cells.

**Location:** Nucleus of eukaryotic cells

**Phases:**
| Phase | Key Events |
|-------|------------|
| Prophase | Chromatin condenses, nuclear envelope breaks down |
| Metaphase | Chromosomes align at cell equator |
| Anaphase | Sister chromatids separate to opposite poles |
| Telophase | Nuclear envelopes reform, cytokinesis begins |

**Result:** 2 genetically identical diploid cells`
  }
];

// ============================================================================
// PROMPT BUILDERS
// ============================================================================

function buildMathPrompt(problem: string, numExamples: number): string {
  const header = `You are solving a mathematics problem. Show your work step-by-step using LaTeX notation ($...$ for inline, $$...$$ for display). Box your final answer.

`;

  if (numExamples === 0) {
    return header + `**Problem:** ${problem}`;
  }

  const examples = MATH_EXAMPLES.slice(0, numExamples);
  let prompt = header + `Here are some examples of how to solve problems:\n\n`;

  examples.forEach((ex, i) => {
    prompt += `### Example ${i + 1}:\n**Problem:** ${ex.problem}\n\n${ex.solution}\n\n---\n\n`;
  });

  prompt += `Now solve this problem:\n\n**Problem:** ${problem}`;
  return prompt;
}

function buildPhysicsPrompt(problem: string, numExamples: number): string {
  const header = `You are solving a physics problem. Follow this format:
1. List known quantities with units in a table
2. Identify what to find
3. Write relevant equations
4. Show calculations
5. State final answer with units

`;

  if (numExamples === 0) {
    return header + `**Problem:** ${problem}`;
  }

  const examples = PHYSICS_EXAMPLES.slice(0, numExamples);
  let prompt = header + `Here are some examples:\n\n`;

  examples.forEach((ex, i) => {
    prompt += `### Example ${i + 1}:\n**Problem:** ${ex.problem}\n\n${ex.solution}\n\n---\n\n`;
  });

  prompt += `Now solve:\n\n**Problem:** ${problem}`;
  return prompt;
}

function buildChemistryPrompt(problem: string, numExamples: number): string {
  const header = `You are solving a chemistry problem. For balancing equations:
1. Write unbalanced equation
2. Count atoms on each side in a table
3. Balance systematically
4. Verify with atom count table

`;

  if (numExamples === 0) {
    return header + `**Problem:** ${problem}`;
  }

  const examples = CHEMISTRY_EXAMPLES.slice(0, numExamples);
  let prompt = header + `Here are examples:\n\n`;

  examples.forEach((ex, i) => {
    prompt += `### Example ${i + 1}:\n**Problem:** ${ex.problem}\n\n${ex.solution}\n\n---\n\n`;
  });

  prompt += `Now solve:\n\n**Problem:** ${problem}`;
  return prompt;
}

function buildBiologyPrompt(problem: string, numExamples: number): string {
  const header = `You are explaining a biology concept. Use this format:
1. Brief overview (1-2 sentences)
2. Location (where it occurs)
3. Key steps or components in a table
4. Important molecules/factors involved

`;

  if (numExamples === 0) {
    return header + `**Topic:** ${problem}`;
  }

  const examples = BIOLOGY_EXAMPLES.slice(0, numExamples);
  let prompt = header + `Here is an example:\n\n`;

  examples.forEach((ex, i) => {
    prompt += `### Example ${i + 1}:\n**Topic:** ${ex.problem}\n\n${ex.solution}\n\n---\n\n`;
  });

  prompt += `Now explain:\n\n**Topic:** ${problem}`;
  return prompt;
}

function buildPrompt(problem: Problem, numExamples: number): string {
  switch (problem.domain) {
    case 'math':
      return buildMathPrompt(problem.prompt, numExamples);
    case 'physics':
      return buildPhysicsPrompt(problem.prompt, numExamples);
    case 'chemistry':
      return buildChemistryPrompt(problem.prompt, numExamples);
    case 'biology':
      return buildBiologyPrompt(problem.prompt, numExamples);
  }
}

// ============================================================================
// API CALLS
// ============================================================================

function callClaude(prompt: string): { response: string; latencyMs: number } {
  const tempFile = '/tmp/claude-prompt.txt';
  fs.writeFileSync(tempFile, prompt);

  const startTime = Date.now();
  try {
    const result = execSync(`cat "${tempFile}" | claude -p --output-format text`, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
      timeout: 120000, // 2 minute timeout
    });
    const latencyMs = Date.now() - startTime;
    return { response: result.trim(), latencyMs };
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    console.error('Claude CLI error:', error.message);
    return { response: `ERROR: ${error.message}`, latencyMs };
  }
}

function callGemini(prompt: string): { response: string; latencyMs: number } {
  const tempFile = '/tmp/gemini-prompt.txt';
  fs.writeFileSync(tempFile, prompt);

  const startTime = Date.now();
  try {
    const result = execSync(`cat "${tempFile}" | gemini -m gemini-2.0-flash`, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
      timeout: 120000,
    });
    const latencyMs = Date.now() - startTime;
    return { response: result.trim(), latencyMs };
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    console.error('Gemini CLI error:', error.message);
    return { response: `ERROR: ${error.message}`, latencyMs };
  }
}

function countTokensApprox(text: string): number {
  // Rough approximation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

// ============================================================================
// EXPERIMENT RUNNER
// ============================================================================

async function runExperiment(
  problem: Problem,
  model: 'claude' | 'gemini',
  numExamples: number
): Promise<ExperimentResult> {
  const condition = numExamples === 0 ? 'zero-shot' : `${numExamples}-shot`;
  const prompt = buildPrompt(problem, numExamples);

  console.log(`  Running ${model} ${condition} for ${problem.id}...`);

  const { response, latencyMs } = model === 'claude'
    ? callClaude(prompt)
    : callGemini(prompt);

  return {
    problemId: problem.id,
    model,
    condition: condition as ExperimentResult['condition'],
    prompt,
    response,
    tokenCount: countTokensApprox(response),
    latencyMs,
    timestamp: new Date().toISOString()
  };
}

async function runAllExperiments() {
  const results: ExperimentResult[] = [];
  const conditions = [0, 1, 3, 5]; // number of examples
  // Only using Claude since Gemini CLI is unavailable
  const models: Array<'claude' | 'gemini'> = ['claude'];

  console.log('Starting STEM Few-Shot Experiments');
  console.log('==================================\n');
  console.log(`Problems: ${PROBLEMS.length}`);
  console.log(`Models: ${models.join(', ')}`);
  console.log(`Conditions: zero-shot, 1-shot, 3-shot, 5-shot`);
  console.log(`Total experiments: ${PROBLEMS.length * models.length * conditions.length}\n`);

  for (const problem of PROBLEMS) {
    console.log(`\nProblem: ${problem.id} (${problem.domain})`);

    for (const model of models) {
      for (const numExamples of conditions) {
        try {
          const result = await runExperiment(problem, model, numExamples);
          results.push(result);

          // Save intermediate results
          const outputPath = path.join(OUTPUT_DIR, 'experiment-results.json');
          fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`  Error: ${error}`);
        }
      }
    }
  }

  console.log('\n==================================');
  console.log('Experiments complete!');
  console.log(`Results saved to: ${path.join(OUTPUT_DIR, 'experiment-results.json')}`);

  return results;
}

// ============================================================================
// ANALYSIS
// ============================================================================

function analyzeResults(results: ExperimentResult[]) {
  console.log('\n\nANALYSIS');
  console.log('========\n');

  // Group by model and condition
  const grouped: Record<string, ExperimentResult[]> = {};

  for (const result of results) {
    const key = `${result.model}-${result.condition}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(result);
  }

  // Calculate averages
  const summary: Record<string, { avgTokens: number; avgLatency: number; count: number }> = {};

  for (const [key, group] of Object.entries(grouped)) {
    const avgTokens = group.reduce((sum, r) => sum + r.tokenCount, 0) / group.length;
    const avgLatency = group.reduce((sum, r) => sum + r.latencyMs, 0) / group.length;
    summary[key] = { avgTokens, avgLatency, count: group.length };
  }

  // Print summary table
  console.log('Summary by Model and Condition:');
  console.log('| Model | Condition | Avg Tokens | Avg Latency (ms) | Count |');
  console.log('|-------|-----------|------------|------------------|-------|');

  for (const [key, stats] of Object.entries(summary)) {
    const [model, condition] = key.split('-');
    console.log(`| ${model.padEnd(6)} | ${condition.padEnd(9)} | ${stats.avgTokens.toFixed(0).padStart(10)} | ${stats.avgLatency.toFixed(0).padStart(16)} | ${stats.count.toString().padStart(5)} |`);
  }

  // Save analysis
  const analysisPath = path.join(OUTPUT_DIR, 'analysis-summary.json');
  fs.writeFileSync(analysisPath, JSON.stringify(summary, null, 2));
  console.log(`\nAnalysis saved to: ${analysisPath}`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--analyze-only')) {
    // Just analyze existing results
    const resultsPath = path.join(OUTPUT_DIR, 'experiment-results.json');
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
      analyzeResults(results);
    } else {
      console.error('No results file found. Run experiments first.');
    }
    return;
  }

  if (args.includes('--single')) {
    // Run a single test to verify setup
    console.log('Running single test to verify setup...\n');
    const testProblem = PROBLEMS[0];

    console.log('Testing Claude zero-shot...');
    const claudeResult = await runExperiment(testProblem, 'claude', 0);
    console.log('Claude response preview:', claudeResult.response.slice(0, 200));
    console.log(`Latency: ${claudeResult.latencyMs}ms\n`);

    console.log('Testing Gemini zero-shot...');
    const geminiResult = await runExperiment(testProblem, 'gemini', 0);
    console.log('Gemini response preview:', geminiResult.response.slice(0, 200));
    console.log(`Latency: ${geminiResult.latencyMs}ms\n`);

    return;
  }

  // Run all experiments
  const results = await runAllExperiments();
  analyzeResults(results);
}

main().catch(console.error);
