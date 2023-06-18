window.onload = async function () {
    let canvas = document.getElementById("canvas");
    let context = canvas.getContext("2d");
    let model = document.getElementById("model");
    let modelContext = model.getContext("2d");
    // player keyboard actions
    document.addEventListener("keydown", function (event) {
        switch (event.key) {
            case "ArrowUp":
                environment.changeMovementTo(Movement.UP);
                break;
            case "ArrowDown":
                environment.changeMovementTo(Movement.DOWN);
                break;
            case "ArrowLeft":
                environment.changeMovementTo(Movement.LEFT);
                break;
            case "ArrowRight":
                environment.changeMovementTo(Movement.RIGHT);
                break;
        }
    });

    let generations = 200;
    let population = new Population(10, 0.01);
    let environment = new Environment(context, 10, 10);

    //let nn = new NeuralNetwork();
    //let weights = nn.model.getWeights();
    //console.log(weights)
    //const convLayer = nn.model.getLayer(undefined, 0);
    //const convLayerConfig = convLayer.getConfig();
    //console.log(convLayerConfig);
    //console.log(convLayer.outputShape);
    //nn.showShapes()

    let skip = false;

    for (let generation = 1; generation <= generations; generation++) {
        console.log("generation", generation)
        for (let agentNumber = 1; agentNumber <= population.members.length; agentNumber++) {
            environment.reset();
            environment.agent = population.members[agentNumber - 1];
            await environment.run(skip && generation < generations);
        }
        population.members = population.nextGeneration();
    }

    // environment.spawnHead();
    // environment.generateApple();
    // console.log(environment.getGrid())
    // console.log(environment.normalizeInputs(environment.getGrid()))


    // environment.agent = population.members[0];
    // environment.spawnHead();
    // environment.generateApple();
    //let brain = environment.agent.brain;
    // console.log(brain.model.getWeights()[0].arraySync())
    // brain.mutate(0.5);
    // console.log(brain.model.getWeights()[0].arraySync())


    //updateModel(modelContext, environment);


    console.log("acabou o jogo")

}


let updateModel = function (context, environment) {

    let drawSquare = function (x, y, grayscaleValue) {
        context.fillStyle = `rgb(${grayscaleValue}, ${grayscaleValue}, ${grayscaleValue})`;
        context.fillRect(x, y, 15, 15);
        context.strokeRect(x, y, 15, 15);
    }

    context.clearRect(0, 0, 1000, 600);
    context.strokeStyle = "black";
    context.lineWidth = 1;

    console.log(environment.grid)
    console.log(context)

    // input image (10x10x1)
    for (const row of environment.grid) {
        for (const square of row) {
            const grayscaleValue = Math.round(((4 - square.type) / 4) * 255);
            drawSquare(square.x * 15 + 5, square.y * 15 + 5, grayscaleValue);
        }
    }

    let model = environment.agent.brain.model;
    let layer = model.getLayer(undefined, 0);
    let weights = model.getWeights();

    console.log(layer);
    console.log(weights);

    let convolutionalShape = weights[0].shape;
    let convolutionalWeights = weights[0].arraySync();
    console.log(convolutionalShape)
    console.log(convolutionalWeights)

    // conv layer feature maps
    for (let i = 0; i < convolutionalShape.length; i++) {

    }

}