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
        let values = tensor.dataSync().slice();
        for (let j = 0; j < values.length; j++) {
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


  predict(inputs) {
    return tf.tidy(() => {
      const xs = tf.tensor([inputs], [1, 10, 10, 1]);
      const ys = this.model.predict(xs);
      const output = Array.from(ys.dataSync());
      return output;
    });
  }

  createModel() {
    const model = tf.sequential();
    model.add(tf.layers.conv2d({
      inputShape: [10, 10, 1],
      filters: 16,
      kernelSize: 3,
      padding: 'valid',
      strides: [1, 1],
      activation: 'relu'
    }));
    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
    model.add(tf.layers.flatten());
    model.add(tf.layers.dense({ units: 4, activation: 'softmax' }));
    return model;
  }

  showShapes() {
    for (let i = 0; i < 4; i++) {
      const layer = this.model.getLayer(undefined, i);
      //console.log("layer", layer)
      console.log("name:\t\t\t", layer.name)
      if (layer.name.includes("conv2d")) {
        console.log("input shape:\t", layer.batchInputShape.slice(1))
      }
      console.log("output shape:\t", layer.outputShape.slice(1))
      console.log("---------------------------------------------")
    }
  }

}