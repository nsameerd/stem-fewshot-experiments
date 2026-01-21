/**
 * Analyze STEM Few-Shot Experiment Results
 *
 * This script evaluates correctness, format adherence, and other metrics
 * from the experiment results.
 *
 * Run with: npx tsx scripts/stem-fewshot-experiments/analyze-results.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const RESULTS_DIR = path.join(__dirname, 'results');

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

interface ProblemExpectedAnswer {
  id: string;
  domain: string;
  expectedPatterns: string[];
  correctAnswer: string;
}

// Expected answers and patterns for verification
const EXPECTED_ANSWERS: ProblemExpectedAnswer[] = [
  {
    id: 'math-1',
    domain: 'math',
    expectedPatterns: ['-x²cos(x)', '2xsin(x)', '2cos(x)', 'x^2\\cos', 'x^2 \\cos'],
    correctAnswer: '-x²cos(x) + 2xsin(x) + 2cos(x) + C'
  },
  {
    id: 'math-2',
    domain: 'math',
    expectedPatterns: ['e^x', 'ln(x²+1)', '2x/(x²+1)', 'frac{2x}{x^2+1}'],
    correctAnswer: 'eˣ[ln(x²+1) + 2x/(x²+1)]'
  },
  {
    id: 'math-3',
    domain: 'math',
    expectedPatterns: ['3', '= 3'],
    correctAnswer: '3'
  },
  {
    id: 'math-4',
    domain: 'math',
    expectedPatterns: ['x^x', 'ln(x)', 'ln x', '+ 1', '(\\ln(x) + 1)', '(ln x + 1)'],
    correctAnswer: 'x^x(ln(x) + 1)'
  },
  {
    id: 'math-5',
    domain: 'math',
    expectedPatterns: ['π/2', 'pi/2', '\\frac{\\pi}{2}', 'frac{pi}{2}'],
    correctAnswer: 'π/2'
  },
  {
    id: 'physics-1',
    domain: 'physics',
    expectedPatterns: ['10', 'm', '40', 'height', 'range'],
    correctAnswer: 'Max height = 10 m, Range = 40 m'
  },
  {
    id: 'physics-2',
    domain: 'physics',
    expectedPatterns: ['1.26', '2π', 'period', '0.5', 'velocity'],
    correctAnswer: 'Period ≈ 1.26 s, Max velocity = 0.5 m/s'
  },
  {
    id: 'physics-3',
    domain: 'physics',
    expectedPatterns: ['15', '37.5', 'm/s', 'velocity', 'distance'],
    correctAnswer: 'Final velocity = 15 m/s, Distance = 37.5 m'
  },
  {
    id: 'physics-4',
    domain: 'physics',
    expectedPatterns: ['2.4', 'μF', '12', 'mJ', 'energy', 'capacitance'],
    correctAnswer: 'Equivalent capacitance = 2.4 μF, Energy = 12 mJ'
  },
  {
    id: 'chem-1',
    domain: 'chemistry',
    expectedPatterns: ['4Fe', '3O₂', '6H₂O', '4Fe(OH)₃'],
    correctAnswer: '4Fe + 3O₂ + 6H₂O → 4Fe(OH)₃'
  },
  {
    id: 'chem-2',
    domain: 'chemistry',
    expectedPatterns: ['4Al', '3O₂', '2Al₂O₃'],
    correctAnswer: '4Al + 3O₂ → 2Al₂O₃'
  },
  {
    id: 'chem-3',
    domain: 'chemistry',
    expectedPatterns: ['14.625', 'g', 'gram'],
    correctAnswer: '14.625 g'
  },
  {
    id: 'chem-4',
    domain: 'chemistry',
    expectedPatterns: ['5Fe', 'MnO₄', '8H', 'Mn²⁺', '4H₂O'],
    correctAnswer: 'MnO₄⁻ + 8H⁺ + 5Fe²⁺ → Mn²⁺ + 5Fe³⁺ + 4H₂O'
  },
  {
    id: 'bio-1',
    domain: 'biology',
    expectedPatterns: ['glycolysis', 'ATP', '2', 'pyruvate', 'glucose'],
    correctAnswer: 'Net yield: 2 ATP, 2 NADH, 2 Pyruvate'
  },
  {
    id: 'bio-2',
    domain: 'biology',
    expectedPatterns: ['DNA', 'helicase', 'polymerase', 'primase', 'replication'],
    correctAnswer: 'DNA replication process with enzymes'
  },
  {
    id: 'bio-3',
    domain: 'biology',
    expectedPatterns: ['adenine', 'thymine', 'guanine', 'cytosine', 'A-T', 'G-C', 'A', 'T', 'G', 'C'],
    correctAnswer: 'A-T, G-C base pairing'
  }
];

// Check if response contains expected patterns
function checkCorrectness(problemId: string, response: string): { correct: boolean; score: number } {
  const expected = EXPECTED_ANSWERS.find(e => e.id === problemId);
  if (!expected) return { correct: false, score: 0 };

  const responseLower = response.toLowerCase();
  const responseNormalized = response.replace(/\s+/g, '').toLowerCase();

  let matchCount = 0;
  for (const pattern of expected.expectedPatterns) {
    const patternLower = pattern.toLowerCase();
    const patternNormalized = pattern.replace(/\s+/g, '').toLowerCase();

    if (responseLower.includes(patternLower) || responseNormalized.includes(patternNormalized)) {
      matchCount++;
    }
  }

  const score = matchCount / expected.expectedPatterns.length;
  const correct = score >= 0.5; // At least 50% of patterns matched

  return { correct, score };
}

// Check format adherence
function checkFormatAdherence(response: string): {
  hasLatex: boolean;
  hasBoxedAnswer: boolean;
  hasSteps: boolean;
  hasTables: boolean;
  formatScore: number;
} {
  const hasLatex = response.includes('$') || response.includes('\\frac') || response.includes('\\int');
  const hasBoxedAnswer = response.includes('\\boxed') || response.includes('**Answer:**') || response.includes('## Answer');
  const hasSteps = response.includes('Step 1') || response.includes('### Step') || response.includes('## Step');
  const hasTables = response.includes('|') && response.split('|').length > 4;

  let formatScore = 0;
  if (hasLatex) formatScore += 3;
  if (hasBoxedAnswer) formatScore += 3;
  if (hasSteps) formatScore += 2;
  if (hasTables) formatScore += 2;

  return {
    hasLatex,
    hasBoxedAnswer,
    hasSteps,
    hasTables,
    formatScore
  };
}

// Main analysis function
function analyzeResults() {
  const resultsPath = path.join(RESULTS_DIR, 'experiment-results.json');
  const results: ExperimentResult[] = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

  console.log('STEM Few-Shot Experiment Analysis');
  console.log('==================================\n');
  console.log(`Total experiments: ${results.length}\n`);

  // Analysis storage
  interface AnalysisRecord {
    problemId: string;
    model: string;
    condition: string;
    domain: string;
    correct: boolean;
    correctnessScore: number;
    formatScore: number;
    hasLatex: boolean;
    hasBoxedAnswer: boolean;
    hasSteps: boolean;
    tokenCount: number;
    latencyMs: number;
  }

  const analysisRecords: AnalysisRecord[] = [];

  for (const result of results) {
    const { correct, score: correctnessScore } = checkCorrectness(result.problemId, result.response);
    const formatAnalysis = checkFormatAdherence(result.response);
    const domain = result.problemId.split('-')[0];

    analysisRecords.push({
      problemId: result.problemId,
      model: result.model,
      condition: result.condition,
      domain,
      correct,
      correctnessScore,
      formatScore: formatAnalysis.formatScore,
      hasLatex: formatAnalysis.hasLatex,
      hasBoxedAnswer: formatAnalysis.hasBoxedAnswer,
      hasSteps: formatAnalysis.hasSteps,
      tokenCount: result.tokenCount,
      latencyMs: result.latencyMs
    });
  }

  // Aggregate by condition
  const conditions = ['zero-shot', '1-shot', '3-shot', '5-shot'];
  const domains = ['math', 'physics', 'chem', 'bio'];

  console.log('=== CORRECTNESS BY CONDITION ===\n');
  console.log('| Condition  | Correct | Total | Accuracy | Avg Score |');
  console.log('|------------|---------|-------|----------|-----------|');

  for (const condition of conditions) {
    const conditionRecords = analysisRecords.filter(r => r.condition === condition);
    const correctCount = conditionRecords.filter(r => r.correct).length;
    const avgScore = conditionRecords.reduce((sum, r) => sum + r.correctnessScore, 0) / conditionRecords.length;

    console.log(`| ${condition.padEnd(10)} | ${correctCount.toString().padStart(7)} | ${conditionRecords.length.toString().padStart(5)} | ${((correctCount / conditionRecords.length) * 100).toFixed(1).padStart(7)}% | ${(avgScore * 100).toFixed(1).padStart(8)}% |`);
  }

  console.log('\n=== CORRECTNESS BY DOMAIN ===\n');
  console.log('| Domain    | Zero-Shot | 1-Shot | 3-Shot | 5-Shot |');
  console.log('|-----------|-----------|--------|--------|--------|');

  for (const domain of domains) {
    const row = [domain.padEnd(9)];
    for (const condition of conditions) {
      const records = analysisRecords.filter(r => r.domain === domain && r.condition === condition);
      const correctCount = records.filter(r => r.correct).length;
      const accuracy = records.length > 0 ? ((correctCount / records.length) * 100).toFixed(0) + '%' : 'N/A';
      row.push(accuracy.padStart(condition === 'zero-shot' ? 9 : 6));
    }
    console.log(`| ${row.join(' | ')} |`);
  }

  console.log('\n=== FORMAT ADHERENCE BY CONDITION ===\n');
  console.log('| Condition  | Avg Format | LaTeX % | Boxed % | Steps % |');
  console.log('|------------|------------|---------|---------|---------|');

  for (const condition of conditions) {
    const conditionRecords = analysisRecords.filter(r => r.condition === condition);
    const avgFormat = conditionRecords.reduce((sum, r) => sum + r.formatScore, 0) / conditionRecords.length;
    const latexPct = (conditionRecords.filter(r => r.hasLatex).length / conditionRecords.length) * 100;
    const boxedPct = (conditionRecords.filter(r => r.hasBoxedAnswer).length / conditionRecords.length) * 100;
    const stepsPct = (conditionRecords.filter(r => r.hasSteps).length / conditionRecords.length) * 100;

    console.log(`| ${condition.padEnd(10)} | ${avgFormat.toFixed(1).padStart(10)} | ${latexPct.toFixed(0).padStart(6)}% | ${boxedPct.toFixed(0).padStart(6)}% | ${stepsPct.toFixed(0).padStart(6)}% |`);
  }

  console.log('\n=== TOKEN EFFICIENCY BY CONDITION ===\n');
  console.log('| Condition  | Avg Tokens | Avg Latency (ms) |');
  console.log('|------------|------------|------------------|');

  for (const condition of conditions) {
    const conditionRecords = analysisRecords.filter(r => r.condition === condition);
    const avgTokens = conditionRecords.reduce((sum, r) => sum + r.tokenCount, 0) / conditionRecords.length;
    const avgLatency = conditionRecords.reduce((sum, r) => sum + r.latencyMs, 0) / conditionRecords.length;

    console.log(`| ${condition.padEnd(10)} | ${avgTokens.toFixed(0).padStart(10)} | ${avgLatency.toFixed(0).padStart(16)} |`);
  }

  console.log('\n=== DETAILED PROBLEM RESULTS ===\n');
  console.log('| Problem ID | Zero-Shot | 1-Shot | 3-Shot | 5-Shot |');
  console.log('|------------|-----------|--------|--------|--------|');

  const problemIds = [...new Set(analysisRecords.map(r => r.problemId))];
  for (const problemId of problemIds) {
    const row = [problemId.padEnd(10)];
    for (const condition of conditions) {
      const record = analysisRecords.find(r => r.problemId === problemId && r.condition === condition);
      const status = record?.correct ? '✓' : '✗';
      const score = record ? `${(record.correctnessScore * 100).toFixed(0)}%` : 'N/A';
      row.push(`${status} ${score}`.padStart(condition === 'zero-shot' ? 9 : 6));
    }
    console.log(`| ${row.join(' | ')} |`);
  }

  // Save detailed analysis
  const analysisOutput = {
    summary: {
      totalExperiments: results.length,
      byCondition: {} as Record<string, { correct: number; total: number; accuracy: number; avgScore: number; avgFormat: number; avgTokens: number; avgLatency: number }>,
      byDomain: {} as Record<string, Record<string, { correct: number; total: number; accuracy: number }>>
    },
    detailedRecords: analysisRecords
  };

  for (const condition of conditions) {
    const records = analysisRecords.filter(r => r.condition === condition);
    const correctCount = records.filter(r => r.correct).length;
    analysisOutput.summary.byCondition[condition] = {
      correct: correctCount,
      total: records.length,
      accuracy: correctCount / records.length,
      avgScore: records.reduce((sum, r) => sum + r.correctnessScore, 0) / records.length,
      avgFormat: records.reduce((sum, r) => sum + r.formatScore, 0) / records.length,
      avgTokens: records.reduce((sum, r) => sum + r.tokenCount, 0) / records.length,
      avgLatency: records.reduce((sum, r) => sum + r.latencyMs, 0) / records.length
    };
  }

  for (const domain of domains) {
    analysisOutput.summary.byDomain[domain] = {};
    for (const condition of conditions) {
      const records = analysisRecords.filter(r => r.domain === domain && r.condition === condition);
      const correctCount = records.filter(r => r.correct).length;
      analysisOutput.summary.byDomain[domain][condition] = {
        correct: correctCount,
        total: records.length,
        accuracy: records.length > 0 ? correctCount / records.length : 0
      };
    }
  }

  const outputPath = path.join(RESULTS_DIR, 'detailed-analysis.json');
  fs.writeFileSync(outputPath, JSON.stringify(analysisOutput, null, 2));
  console.log(`\nDetailed analysis saved to: ${outputPath}`);

  return analysisOutput;
}

analyzeResults();
