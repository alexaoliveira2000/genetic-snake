class NeuralNetwork {
  constructor(model = {}) {
    if (model instanceof tf.Sequential) {
      this.model = model;
    } else {
      this.model = this.createModel();
    }
  }

  copy() {
    return tf.tidy(() => {
      const modelCopy = this.createModel();
      const weights = this.model.getWeights();
      const weightCopies = [];
      for (let i = 0; i < weights.length; i++) {
        weightCopies[i] = weights[i].clone();
      }
      modelCopy.setWeights(weightCopies);
      return new NeuralNetwork(modelCopy);
    });
  }

  randomGaussian() {
    let mean = 0;
    let stdDev = 1;
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return num * stdDev + mean;
  }

  mutate(rate) {
    tf.tidy(() => {
      const weights = this.model.getWeights();
      const mutatedWeights = [];
      for (let i = 0; i < weights.length; i++) {
        let tensor = weights[i];
        let shape = weights[i].shape;
        let values = tensor.arraySync();
        if (shape.length === 4) {
          for (let j = 0; j < values.length; j++)
            for (let k = 0; k < values[j].length; k++)
              for (let m = 0; m < values[j][k].length; m++)
                for (let n = 0; n < values[j][k][m].length; n++)
                  if (Math.random() < rate) {
                    let w = values[j][k][m][n];
                    values[j][k][m][n] = w + this.randomGaussian();
                  }
        }
        else if (shape.length === 3) {
          for (let j = 0; j < values.length; j++)
            for (let k = 0; k < values[j].length; k++)
              for (let m = 0; m < values[j][k].length; m++)
                if (Math.random() < rate) {
                  let w = values[j][k][m];
                  values[j][k][m] = w + this.randomGaussian();
                }
        } else if (shape.length === 2) {
          for (let j = 0; j < values.length; j++)
            for (let k = 0; k < values[j].length; k++)
              if (Math.random() < rate) {
                let w = values[j][k];
                values[j][k] = w + this.randomGaussian();
              }
        } else {
          for (let j = 0; j < values.length; j++)
            if (Math.random() < rate) {
              let w = values[j];
              values[j] = w + this.randomGaussian();
            }
        }
        let newTensor = tf.tensor(values, shape);
        mutatedWeights[i] = newTensor;
      }
      this.model.setWeights(mutatedWeights);
    });
  }

  // predict(inputs) {
  //   return tf.tidy(() => {
  //     const xs = tf.tensor([inputs.flat()], [1, 25]);
  //     const ys = this.model.predict(xs);
  //     const output = Array.from(ys.dataSync());
  //     return output;
  //   });
  // }

  async train(inputs, targets) {
    const xs = tf.tensor(inputs, [inputs.length, SIZE, SIZE, 1]);
    const ys = tf.tensor(targets, [targets.length, 4]);
    return await this.model.fit(xs, ys, { epochs: EPOCHS });
  }

  predict(inputs) {
    return tf.tidy(() => {
      const xs = tf.tensor([inputs], [1, SIZE, SIZE, 1]);
      const ys = this.model.predict(xs);
      const output = Array.from(ys.dataSync());
      return output;
    });
  }

  crossover(model, crossoverProbability) {
    let weightsModel1 = this.model.getWeights();
    let weightsModel2 = model.getWeights();
    const mutatedWeights1 = [];
    const mutatedWeights2 = [];

    // for each tensor
    for (let i = 0; i < weightsModel1.length; i++) {
      let tensor1 = weightsModel1[i];
      let tensor2 = weightsModel2[i];
      let shape = weightsModel1[i].shape;
      let values = tensor1.arraySync();
      let values2 = tensor2.arraySync();
      if (shape.length === 4) {
        for (let j = 0; j < values.length; j++)
          for (let k = 0; k < values[j].length; k++)
            for (let m = 0; m < values[j][k].length; m++)
              for (let n = 0; n < values[j][k][m].length; n++)
                if (Math.random() < crossoverProbability) {
                  let temp = values2[j][k][m][n];
                  values2[j][k][m][n] = values[j][k][m][n];
                  values[j][k][m][n] = temp;
                }
      }
      else if (shape.length === 3) {
        for (let j = 0; j < values.length; j++)
          for (let k = 0; k < values[j].length; k++)
            for (let m = 0; m < values[j][k].length; m++)
              if (Math.random() < crossoverProbability) {
                let temp = values2[j][k][m];
                values2[j][k][m] = values[j][k][m];
                values[j][k][m] = temp;
              }
      } else if (shape.length === 2) {
        for (let j = 0; j < values.length; j++)
          for (let k = 0; k < values[j].length; k++)
            if (Math.random() < crossoverProbability) {
              let temp = values2[j][k];
              values2[j][k] = values[j][k];
              values[j][k] = temp;
            }
      } else {
        for (let j = 0; j < values.length; j++)
          if (Math.random() < crossoverProbability) {
            let temp = values2[j];
            values2[j] = values[j];
            values[j] = temp;
          }
      }
      let newTensor1 = tf.tensor(values, shape);
      let newTensor2 = tf.tensor(values2, shape);
      mutatedWeights1[i] = newTensor1;
      mutatedWeights2[i] = newTensor2;
    }

    this.model.setWeights(mutatedWeights1);
    model.setWeights(mutatedWeights2);
    return model;
  }

  // createModel() {
  //   const model = tf.sequential();
  //   const hiddenLayer1 = tf.layers.dense({
  //     units: 20,
  //     inputShape: 25,
  //     activation: "relu"
  //   });
  //   model.add(hiddenLayer1);
  //   model.add(tf.layers.batchNormalization());
  //   const hiddenLayer2 = tf.layers.dense({
  //     units: 10,
  //     inputShape: 20,
  //     activation: "relu"
  //   });
  //   model.add(hiddenLayer2);
  //   model.add(tf.layers.batchNormalization());
  //   const outputLayer = tf.layers.dense({
  //     units: 4,
  //     activation: "softmax"
  //   });
  //   model.add(outputLayer);
  //   return model;
  // }

  createModel() {
    const model = tf.sequential();
    model.add(tf.layers.conv2d({
      inputShape: [SIZE, SIZE, 1],
      filters: 4,
      kernelSize: 2,
      padding: 'valid',
      strides: [1, 1],
      activation: 'relu'
    }));
    model.add(tf.layers.batchNormalization());
    //model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
    model.add(tf.layers.flatten());
    model.add(tf.layers.dense({ units: 30, activation: "relu" }));
    //model.add(tf.layers.dropout({ rate: 0.2 }));
    //model.add(tf.layers.batchNormalization());
    model.add(tf.layers.dense({ units: 4, activation: 'linear' }));

    model.compile({
      loss: 'meanSquaredError',
      optimizer: 'adam',
    });

    return model;
  }

  showShapes() {
    for (let i = 0; i < 4; i++) {
      const layer = this.model.getLayer(undefined, i);
      console.log("layer", layer)
      console.log("name:\t\t\t", layer.name)
      if (layer.name.includes("conv2d")) {
        console.log("input shape:\t", layer.batchInputShape.slice(1))
      }
      console.log("output shape:\t", layer.outputShape.slice(1))
      console.log("---------------------------------------------")
    }
  }

}