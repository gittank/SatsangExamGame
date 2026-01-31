# Plan: Update Backend AI Engine to Match 20Q.net Approach

## Analysis Summary

### How 20Q.net Works (Key Insights)

Based on research and the reference implementation:

1. **Neural Network Architecture**: Uses a 3-layer neural network (input → hidden → output)
   - Input: Vector of size `num_questions` where each position is +1 (yes), -1 (no), or 0 (not asked)
   - Output: Probability distribution over all entities

2. **Considers ALL Entities Simultaneously**: Unlike decision trees, the neural network updates probabilities for every entity with each answer. It doesn't hard-eliminate candidates.

3. **Smart Question Selection**: Simulates both yes/no outcomes for each unasked question and picks the one with maximum "worst-case" impact on probabilities (minimax approach).

4. **Robust to Wrong Answers**: Because it uses soft probabilities rather than hard elimination, it can recover from incorrect or contradictory answers.

5. **Continuous Learning via Backpropagation**: After each game, the network trains on the input vector (questions/answers) and target vector (correct entity).

### Current Implementation Issues

| Aspect | Current | 20Q.net Style |
|--------|---------|---------------|
| Model | Probabilistic scoring with thresholds | Neural Network |
| Elimination | Hard (score < 0.01 eliminated) | Soft (all entities considered) |
| Question Selection | Information gain (entropy) | Max-min impact simulation |
| Error Tolerance | Low (mismatches = 0.1x penalty) | High (recovers gracefully) |
| Learning | Confidence score updates | Backpropagation |

## Implementation Plan

### Phase 1: Neural Network Core (`src/services/neuralNetwork.ts`)

Create a TypeScript neural network implementation:

```typescript
// New file: src/services/neuralNetwork.ts
export class NeuralNetwork {
  // 3-layer network: input → hidden → output
  // Uses sigmoid activation
  // Supports feed-forward and backpropagation
}
```

**Tasks:**
1. Implement `Neuron` class with sigmoid activation
2. Implement `NeuronLayer` class for feed-forward
3. Implement `NeuralNetwork` class with:
   - `feedForward(inputs: number[]): number[]`
   - `backpropagate(inputs: number[], targets: number[]): void`
   - `save(filename: string)` / `load(filename: string)`

### Phase 2: Smart Question Selection (`src/services/gameEngine.ts`)

Replace entropy-based question selection with 20Q's approach:

**Current:**
```typescript
calculateInformationGain(questionId, candidates) // Entropy-based
```

**New:**
```typescript
selectBestQuestion(currentOutput: number[], inputVector: number[], askedQuestions: number[]): number {
  // For each unasked question:
  //   1. Simulate yes (+1) → get output_yes
  //   2. Simulate no (-1) → get output_no
  //   3. Calculate impact = sum of probability changes
  //   4. Use minimax: worst_case_impact = min(impact_yes, impact_no)
  // Return question with maximum worst_case_impact
}
```

### Phase 3: Scoring System Overhaul

Replace multiplicative scoring with neural network inference:

**Current:**
```typescript
getCandidateScores(answers): CandidateScore[] {
  // Multiplicative penalties for mismatches
  // Hard threshold elimination
}
```

**New:**
```typescript
getCandidateScores(inputVector: number[]): CandidateScore[] {
  const output = this.nn.feedForward(inputVector);
  // Output is probability distribution over all entities
  return output.map((score, idx) => ({ entityId: idx + 1, score }));
}
```

### Phase 4: Learning System Update (`src/services/learner.ts`)

Replace confidence updates with backpropagation:

**Current:**
```typescript
updateFromGame(sessionId, actualEntityId) {
  // Update confidence scores incrementally
}
```

**New:**
```typescript
learnFromGame(inputVector: number[], correctEntityId: number) {
  // Create target vector: [0, 0, ..., 1, ..., 0] (1 at correct entity position)
  const targetVector = Array(this.numEntities).fill(0);
  targetVector[correctEntityId - 1] = 1;

  // Train network
  this.nn.backpropagate(inputVector, targetVector);
  this.nn.save('data/network.json');
}
```

### Phase 5: API & State Management Updates

Update the input vector format:

**New State:**
```typescript
interface GameState {
  sessionId: number;
  inputVector: number[];  // Size = num_questions, values: -1, 0, +1
  askedQuestions: number[];
  currentOutput: number[];  // Probability distribution
}
```

**Answer Mapping:**
```typescript
const answerToValue = {
  'yes': 1,
  'no': -1,
  'sometimes': 0.5,
  'unknown': 0
};
```

### Phase 6: Network Initialization

Create initialization script to bootstrap the network:

1. Load existing entity-question-answer data from database
2. Create training set from existing data
3. Pre-train network
4. Save to `data/network.json`

## File Changes Summary

| File | Action |
|------|--------|
| `src/services/neuralNetwork.ts` | **NEW** - Neural network implementation |
| `src/services/gameEngine.ts` | **MODIFY** - Replace scoring & question selection |
| `src/services/learner.ts` | **MODIFY** - Replace with backpropagation |
| `src/types.ts` | **MODIFY** - Add neural network types, update GameState |
| `src/db/initNetwork.ts` | **NEW** - Network initialization script |
| `package.json` | **MODIFY** - Add initialization script |

## Key Algorithm: Smart Question Selection

```typescript
selectBestQuestion(output: number[], inputVector: number[], asked: number[]): number {
  let bestQuestion = -1;
  let bestDiff = -1;

  for (let q = 0; q < this.numQuestions; q++) {
    if (asked.includes(q)) continue;

    // Simulate YES answer
    const yesVector = [...inputVector];
    yesVector[q] = 1;
    const yesOutput = this.nn.feedForward(yesVector);
    const yesDiff = output.reduce((sum, val, i) => sum + Math.abs(yesOutput[i] - val), 0);

    // Simulate NO answer
    const noVector = [...inputVector];
    noVector[q] = -1;
    const noOutput = this.nn.feedForward(noVector);
    const noDiff = output.reduce((sum, val, i) => sum + Math.abs(noOutput[i] - val), 0);

    // Minimax: use worst-case impact
    const worstCaseDiff = Math.min(yesDiff, noDiff);

    if (worstCaseDiff > bestDiff) {
      bestDiff = worstCaseDiff;
      bestQuestion = q;
    }
  }

  return bestQuestion;
}
```

## Benefits of This Approach

1. **Robustness**: Can recover from incorrect/contradictory answers
2. **Better Guessing**: Considers all entities simultaneously
3. **Smarter Questions**: Picks questions that discriminate best regardless of answer
4. **Continuous Learning**: Gets better with each game played
5. **Handles Uncertainty**: Gracefully handles "sometimes" and "unknown" answers

## Sources

- [20Q Wikipedia](https://en.wikipedia.org/wiki/20Q)
- [Scienceline - Twenty Questions, Ten Million Synapses](https://scienceline.org/2006/07/tech-schrock-20q/)
- [Baeldung - How Do "20 Questions" AI Algorithms Work?](https://www.baeldung.com/cs/decision-trees-20-questions)
- [Reference implementation](./20q-reference/)
