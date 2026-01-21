# STEM Few-Shot Prompting Experiments

Experimental comparison of zero-shot vs few-shot prompting for STEM problems using Claude Sonnet 4.

## Key Findings

We ran **64 experiments** across 16 STEM problems (mathematics, physics, chemistry, biology) with 4 conditions each (zero-shot, 1-shot, 3-shot, 5-shot).

| Metric | Zero-Shot | 1-Shot | 3-Shot | 5-Shot |
|--------|-----------|--------|--------|--------|
| Accuracy | 87.5% | 87.5% | 87.5% | 87.5% |
| LaTeX Usage | 69% | 81% | 81% | 81% |
| Boxed Answers | 50% | 81% | 81% | 81% |
| Avg Tokens | 295 | 234 | 236 | 238 |

**Main insight**: Few-shot prompting doesn't improve accuracy for capable models like Claude Sonnet 4—it improves **format consistency** and **token efficiency**.

## Files

- `run-experiments.ts` - Experiment runner with 16 STEM problems and few-shot example sets
- `analyze-results.ts` - Analysis script for correctness and format adherence
- `results/experiment-results.json` - Raw experiment results (64 experiments)
- `results/detailed-analysis.json` - Detailed analysis with per-problem breakdowns
- `results/analysis-summary.json` - Summary statistics

## Running the Experiments

```bash
# Run experiments (requires Claude CLI)
npx tsx run-experiments.ts

# Analyze results
npx tsx analyze-results.ts
```

## Problem Categories

| Domain | Problems | Examples |
|--------|----------|----------|
| Mathematics | 5 | Integrals, derivatives, limits |
| Physics | 4 | Kinematics, oscillations, circuits |
| Chemistry | 4 | Equation balancing, stoichiometry, redox |
| Biology | 3 | Metabolic pathways, DNA, biochemistry |

## License

MIT

## Related Article

See the full analysis in our article: [Few-Shot Prompting for STEM: A Practitioner's Guide](https://mathematicon.com/articles/few-shot-prompting-stem-guide)
