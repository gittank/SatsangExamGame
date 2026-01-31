/**
 * Neural Network implementation for 21 Questions game
 * Based on https://github.com/earthtojake/20q
 *
 * Architecture:
 * - Input layer: Questions answered (1 for yes, -1 for no, 0 for not asked)
 * - Hidden layer: Intermediate processing
 * - Output layer: Probability distribution over entities
 */

export interface NeuralNetworkConfig {
  numInputs: number;      // Number of questions
  numHidden: number;      // Number of hidden neurons
  numOutputs: number;     // Number of entities
  learningRate: number;
  hiddenLayerBias: number;
  outputLayerBias: number;
}

export interface NeuralNetworkData {
  numInputs: number;
  numHidden: number;
  numOutputs: number;
  learningRate: number;
  hiddenLayerBias: number;
  outputLayerBias: number;
  hiddenWeights: number[][];
  outputWeights: number[][];
}

class Neuron {
  bias: number;
  weights: number[] = [];
  inputs: number[] = [];
  output: number = 0;

  constructor(bias: number) {
    this.bias = bias;
  }

  /**
   * Calculate output using sigmoid activation
   */
  calculateOutput(inputs: number[]): number {
    this.inputs = inputs;
    this.output = this.sigmoid(this.totalNetInput());
    return this.output;
  }

  /**
   * Net input = sum(inputs * weights) + bias
   */
  totalNetInput(): number {
    let total = 0;
    for (let i = 0; i < this.inputs.length; i++) {
      total += this.inputs[i] * this.weights[i];
    }
    return total + this.bias;
  }

  /**
   * Sigmoid squashing function: 1 / (1 + e^(-x))
   */
  sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Partial derivative of error with respect to total net input (delta)
   */
  errorWrtTotalInput(targetOutput: number): number {
    return this.errorWrtOutput(targetOutput) * this.totalInputWrtInput();
  }

  /**
   * Mean squared error: 0.5 * (target - output)^2
   */
  calculateError(targetOutput: number): number {
    return 0.5 * Math.pow(targetOutput - this.output, 2);
  }

  /**
   * Partial derivative of error with respect to output: -(target - output)
   */
  errorWrtOutput(targetOutput: number): number {
    return -(targetOutput - this.output);
  }

  /**
   * Derivative of sigmoid: output * (1 - output)
   */
  totalInputWrtInput(): number {
    return this.output * (1 - this.output);
  }

  /**
   * Partial derivative of total input with respect to weight
   */
  totalInputWrtWeight(index: number): number {
    return this.inputs[index];
  }
}

class NeuronLayer {
  neurons: Neuron[] = [];
  bias: number;

  constructor(numNeurons: number, bias: number) {
    this.bias = bias || Math.random();
    for (let i = 0; i < numNeurons; i++) {
      this.neurons.push(new Neuron(this.bias));
    }
  }

  feedForward(inputs: number[]): number[] {
    const outputs: number[] = [];
    for (const neuron of this.neurons) {
      outputs.push(neuron.calculateOutput(inputs));
    }
    return outputs;
  }

  getOutputs(): number[] {
    return this.neurons.map(n => n.output);
  }
}

export class NeuralNetwork {
  numInputs: number;
  numHidden: number;
  numOutputs: number;
  learningRate: number;
  hiddenLayerBias: number;
  outputLayerBias: number;
  hiddenLayer: NeuronLayer;
  outputLayer: NeuronLayer;

  constructor(config: NeuralNetworkConfig) {
    this.numInputs = config.numInputs;
    this.numHidden = config.numHidden;
    this.numOutputs = config.numOutputs;
    this.learningRate = config.learningRate;
    this.hiddenLayerBias = config.hiddenLayerBias;
    this.outputLayerBias = config.outputLayerBias;

    // Initialize layers
    this.hiddenLayer = new NeuronLayer(this.numHidden, this.hiddenLayerBias);
    this.outputLayer = new NeuronLayer(this.numOutputs, this.outputLayerBias);

    // Initialize weights randomly
    this.initHiddenLayerWeights();
    this.initOutputLayerWeights();
  }

  private initHiddenLayerWeights(): void {
    for (const neuron of this.hiddenLayer.neurons) {
      neuron.weights = [];
      for (let i = 0; i < this.numInputs; i++) {
        neuron.weights.push(Math.random() * 2 - 1); // Random between -1 and 1
      }
    }
  }

  private initOutputLayerWeights(): void {
    for (const neuron of this.outputLayer.neurons) {
      neuron.weights = [];
      for (let h = 0; h < this.numHidden; h++) {
        neuron.weights.push(Math.random() * 2 - 1);
      }
    }
  }

  /**
   * Feed input through the network and get output probabilities
   */
  feedForward(inputs: number[]): number[] {
    const hiddenOutputs = this.hiddenLayer.feedForward(inputs);
    return this.outputLayer.feedForward(hiddenOutputs);
  }

  /**
   * Train the network using backpropagation
   */
  backpropagate(trainingInputs: number[], trainingOutputs: number[]): void {
    // Forward pass
    this.feedForward(trainingInputs);

    // Calculate output layer deltas
    const outputDeltas: number[] = [];
    for (let o = 0; o < this.outputLayer.neurons.length; o++) {
      outputDeltas[o] = this.outputLayer.neurons[o].errorWrtTotalInput(trainingOutputs[o]);
    }

    // Calculate hidden layer deltas
    const hiddenDeltas: number[] = [];
    for (let h = 0; h < this.hiddenLayer.neurons.length; h++) {
      let errorWrtHiddenOutput = 0;
      for (let o = 0; o < this.outputLayer.neurons.length; o++) {
        errorWrtHiddenOutput += outputDeltas[o] * this.outputLayer.neurons[o].weights[h];
      }
      hiddenDeltas[h] = errorWrtHiddenOutput * this.hiddenLayer.neurons[h].totalInputWrtInput();
    }

    // Update output layer weights
    for (let o = 0; o < this.outputLayer.neurons.length; o++) {
      for (let w = 0; w < this.outputLayer.neurons[o].weights.length; w++) {
        const pdErrorWrtWeight = outputDeltas[o] * this.outputLayer.neurons[o].totalInputWrtWeight(w);
        this.outputLayer.neurons[o].weights[w] -= this.learningRate * pdErrorWrtWeight;
      }
    }

    // Update hidden layer weights
    for (let h = 0; h < this.hiddenLayer.neurons.length; h++) {
      for (let w = 0; w < this.hiddenLayer.neurons[h].weights.length; w++) {
        const pdErrorWrtWeight = hiddenDeltas[h] * this.hiddenLayer.neurons[h].totalInputWrtWeight(w);
        this.hiddenLayer.neurons[h].weights[w] -= this.learningRate * pdErrorWrtWeight;
      }
    }
  }

  /**
   * Calculate total MSE for a set of training examples
   */
  calculateTotalError(trainingSets: [number[], number[]][]): number {
    let totalError = 0;
    for (const [inputs, outputs] of trainingSets) {
      this.feedForward(inputs);
      for (let o = 0; o < outputs.length; o++) {
        totalError += this.outputLayer.neurons[o].calculateError(outputs[o]);
      }
    }
    return totalError;
  }

  /**
   * Serialize network to JSON for saving
   */
  toJSON(): NeuralNetworkData {
    return {
      numInputs: this.numInputs,
      numHidden: this.numHidden,
      numOutputs: this.numOutputs,
      learningRate: this.learningRate,
      hiddenLayerBias: this.hiddenLayerBias,
      outputLayerBias: this.outputLayerBias,
      hiddenWeights: this.hiddenLayer.neurons.map(n => [...n.weights]),
      outputWeights: this.outputLayer.neurons.map(n => [...n.weights]),
    };
  }

  /**
   * Load network from saved JSON data
   */
  static fromJSON(data: NeuralNetworkData): NeuralNetwork {
    const nn = new NeuralNetwork({
      numInputs: data.numInputs,
      numHidden: data.numHidden,
      numOutputs: data.numOutputs,
      learningRate: data.learningRate,
      hiddenLayerBias: data.hiddenLayerBias,
      outputLayerBias: data.outputLayerBias,
    });

    // Load saved weights
    for (let h = 0; h < data.hiddenWeights.length; h++) {
      nn.hiddenLayer.neurons[h].weights = [...data.hiddenWeights[h]];
    }
    for (let o = 0; o < data.outputWeights.length; o++) {
      nn.outputLayer.neurons[o].weights = [...data.outputWeights[o]];
    }

    return nn;
  }
}
