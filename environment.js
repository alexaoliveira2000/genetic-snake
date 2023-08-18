// moves the agent can make without eating an apple
const MAX_MOVES = 30
// number of experiences per train
const BATCH_SIZE = 128
// number of steps between updating target network
const UPDATE_INTERVAL = 5
// number of epochs on each training
const EPOCHS = 3
// epsilon
const EPSILON_DECAY = 0.9
const EPSILON_MAX = 1
const EPSILON_MIN = 0.1
// replay memory size
const MEMORY_SIZE = 10000
// gamma value (importance of future reward)
const GAMMA = 1

// grid size (width * height)
const SIZE = 4
// skip training (if skip there's no visual; faster training)
const SKIP = true
// number of episodes
const EPISODES = 1000

window.onload = async function () {
    let canvas = document.getElementById("canvas");
    let context = canvas.getContext("2d");
    let model = document.getElementById("model");
    //let modelContext = model.getContext("2d");
    let playButton = document.getElementById("play");
    let trainButton = document.getElementById("train");
    let resetButton = document.getElementById("reset");

    let environment = new DQNEnvironment(context, SIZE, SIZE);

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

    playButton.addEventListener("click", async function() {
        environment.reset();
        await environment.play();
    });

    let run = false;
    trainButton.addEventListener("click", async function() {
        run = true;
        // initialize replay memory (run game until agent has enough experiences)
        console.log("initializing replay memory...")
        while (!environment.agent.memory.isFull()) {
            environment.reset();
            await environment.run(true, true);
        }
        console.log(environment.agent.memory.memories)
        // train agent
        console.log("training...")
        for (let episode = 1; episode <= EPISODES && run; episode++) {
            environment.reset();
            await environment.run(false, SKIP && episode <= EPISODES);
            // train agent after each episode
            await environment.agent.train(BATCH_SIZE);
            // decay epsilon after each episode
            if (environment.agent.epsilon > EPSILON_MIN)
                environment.agent.epsilon *= EPSILON_DECAY;

            let score = environment.snake.length - 1;
            for (const square of environment.snake)
                if (square.eatingApple || square.type == Type.EATEN_APPLE)
                    score++;
            console.log("episode " + episode + ", score: " + score + ", epsilon: " + environment.agent.epsilon.toFixed(3));
        }
        if (run) console.log("training is over");
        else console.log("training was stopped");
        run = false;
    });

    resetButton.addEventListener("click", async function() {
        run = false;
    });



    // let nn = new NeuralNetwork();
    //let weights = nn.model.getWeights();
    //console.log(weights)
    //const convLayer = nn.model.getLayer(undefined, 0);
    //const convLayerConfig = convLayer.getConfig();
    //console.log(convLayerConfig);
    //console.log(convLayer.outputShape);
    // nn.showShapes()


    // let agent1 = population.members[0];
    // let agent2 = population.members[1];
    // console.log(agent1.brain.model.getWeights()[0].arraySync())
    // console.log(agent2.brain.model.getWeights()[0].arraySync())
    // agent1.brain.crossover(agent2.brain.model, 0.5);
    // console.log(agent1.brain.model.getWeights()[0].arraySync())
    // console.log(agent2.brain.model.getWeights()[0].arraySync())


    // environment.agent = population.members[0];
    // environment.spawnHead();
    // environment.generateApple();
    // environment.agent.brain.showShapes();



    // environment.spawnHead();
    // environment.generateApple();
    // console.log(environment.getGrid())
    // console.log(environment.normalizeInputs(environment.getGrid()))


    // environment.agent = population.members[0];
    // let brain = environment.agent.brain;
    // console.log(brain.model.getWeights()[0].arraySync())
    // brain.mutate(0.1);
    // console.log(brain.model.getWeights()[0].arraySync())


    // updateModel(modelContext, environment);

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