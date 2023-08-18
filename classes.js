const Type = {
    SPACE: 0,
    APPLE: 1,
    EATEN_APPLE: 2,
    SNAKE_BODY: 3,
    SNAKE_HEAD: 4
}

const Movement = {
    UP: 0,
    RIGHT: 1,
    DOWN: 2,
    LEFT: 3,
    STILL: 4
}

class Square {
    constructor(context, x, y) {
        this.context = context;
        this.x = x;
        this.y = y;
        this.type = Type.SPACE;
        this.lastMovement = Movement.STILL;
        this.movement = Movement.STILL;
        this.eatingApple = false;
    }

    update() {
        this.context.clearRect(this.x * 50 + 5, this.y * 50 + 5, 50, 50);
        this.context.strokeStyle = "black";
        this.context.lineWidth = 2;
        switch (this.type) {
            case Type.APPLE:
                this.context.fillStyle = "red";
                break;
            case Type.EATEN_APPLE:
                this.context.fillStyle = "purple";
                break;
            case Type.SNAKE_HEAD:
                this.context.fillStyle = "darkgreen";
                break;
            case Type.SNAKE_BODY:
                this.context.fillStyle = "green";
                break;
        }
        if (this.type !== Type.SPACE)
            this.context.fillRect(this.x * 50 + 5, this.y * 50 + 5, 50, 50);
        this.context.strokeRect(this.x * 50 + 5, this.y * 50 + 5, 50, 50);
    }

    changeMovementTo(movement) {
        this.lastMovement = this.movement ? this.movement : movement;
        this.movement = movement;
    }

    hitsWall(width, height) {
        const hitsUpWall = this.movement === Movement.UP && this.y === 0;
        const hitsDownWall = this.movement === Movement.DOWN && this.y === height - 1;
        const hitsLeftWall = this.movement === Movement.LEFT && this.x === 0;
        const hitsRightWall = this.movement === Movement.RIGHT && this.x === width - 1;
        return hitsUpWall || hitsDownWall || hitsLeftWall || hitsRightWall;
    }

    nextSquare(grid) {
        if (this.movement === Movement.UP)
            return grid[this.y - 1][this.x];
        if (this.movement === Movement.DOWN)
            return grid[this.y + 1][this.x];
        if (this.movement === Movement.LEFT)
            return grid[this.y][this.x - 1];
        if (this.movement === Movement.RIGHT)
            return grid[this.y][this.x + 1];
        return grid[this.x][this.y];
    }
}

// stores: state (previous grid), action (Movement), reward (value) and nextState (current grid)
class Experience {
    constructor(state, action, reward, nextState, isDone) {
        this.state = state;
        this.action = action;
        this.reward = reward;
        this.nextState = nextState;
        this.isDone = isDone;
    }
}

// stores and manages an array of experiences
class ReplayMemory {
    constructor(size) {
        this.size = size;
        this.memories = [];
    }

    push(experience) {
        if (this.memories.length >= this.size)
            this.memories.shift();
        this.memories.push(experience);
    }

    batch(size) {
        if (size >= this.memories.length) {
            return this.memories;
        } else {
            let selectedMemories = [];
            while (selectedMemories.length < size) {
                const memory = this.memories[Math.floor(Math.random() * this.memories.length)];
                if (!selectedMemories.includes(memory))
                    selectedMemories.push(memory);
            }
            return selectedMemories;
        }
    }

    isFull() {
        return this.memories.length == this.size;
    }
}

// environment agent
class DQNAgent {
    constructor(mutationRate) {
        this.mutationRate = mutationRate;
        this.memory = new ReplayMemory(MEMORY_SIZE);
        this.onlineBrain = new NeuralNetwork();
        this.targetBrain = this.onlineBrain.copy();
        this.epsilon = EPSILON_MAX;
        this.updateInterval = UPDATE_INTERVAL;
    }

    isExploration() {
        // if (this.epsilon > EPSILON_MIN)
        //     this.epsilon *= EPSILON_DECAY;
        return Math.random() < this.epsilon;
    }

    normalizeInputs(inputs) {
        const flattenedInputs = inputs.flat(2);
        const min = Math.min(...flattenedInputs);
        const max = Math.max(...flattenedInputs);
        const normalizedInputs = inputs.map((row) =>
            row.map((subArray) =>
                subArray.map((value) => (value - min) / (max - min))
            )
        );
        return normalizedInputs;
    }

    predictedAction(state) {
        if (!this.memory.isFull() || this.isExploration()) {
            let randomAction = Math.floor(Math.random() * 4);
            if (randomAction === 0)
                return Movement.UP;
            if (randomAction === 1)
                return Movement.RIGHT;
            if (randomAction === 2)
                return Movement.DOWN;
            return Movement.LEFT;
        } else {
            //let inputs = this.normalizeInputs(state);
            let prediction = this.targetBrain.predict(state);
            //console.log(prediction)
            return this.predictionToAction(prediction);
        }
    }

    predictionToAction(prediction) {
        let actionIndex = 0;
        for (let i = 1; i < prediction.length; i++)
            if (prediction[i] > prediction[actionIndex])
                actionIndex = i;
        if (actionIndex === 0)
            return Movement.UP;
        if (actionIndex === 1)
            return Movement.RIGHT;
        if (actionIndex === 2)
            return Movement.DOWN;
        return Movement.LEFT;
    }

    async train(batchSize) {
        // get a batch of experiences from replay memory
        let experiences = this.memory.batch(batchSize);

        // calculate new next states reward
        let targetPredictions = experiences.map(experience => this.targetBrain.predict(experience.nextState));
        for (let i = 0; i < experiences.length; i++) {
            let nextStateMaxQ = Math.max(...targetPredictions[i]);
            for (let j = 0; j < targetPredictions[i].length; j++) {
                if (!experiences[i].isDone)
                    targetPredictions[i][j] = experiences[i].reward + GAMMA * nextStateMaxQ;
                else
                    targetPredictions[i][j] = experiences[i].reward;
            }
            // let nextStateMaxQ = Math.max(...targetPredictions[i]);
            // if (experiences[i].isDone)
            //     targetPredictions[i][experiences[i].action] = experiences[i].reward;
            // else
            //     targetPredictions[i][experiences[i].action] = experiences[i].reward + GAMMA * nextStateMaxQ;
        }

        // train the online network
        const history = await this.onlineBrain.train(experiences.map(experience => experience.state), targetPredictions);
        //console.log(history)

        // update the target network weights (equal to online network) at regular intervals
        if (this.updateInterval == 0) {
            //this.targetBrain.model.setWeights(this.onlineBrain.model.getWeights());
            this.targetBrain = this.onlineBrain.copy();
            this.updateInterval = UPDATE_INTERVAL;
        } else {
            this.updateInterval--;
        }
    }

    async trainOld(batchSize) {
        // get a batch of experiences from replay memory
        let experiences = this.memory.batch(batchSize);

        // get normalized states and nextStates from experiences
        let states = experiences.map(experience => this.normalizeInputs(experience.state));
        let nextStates = experiences.map(experience => this.normalizeInputs(experience.nextState));

        // get the q-values for the action performed on the experience using the online network
        //let onlinePredictions = states.map(state => this.onlineBrain.predict(state));
        // let onlineQValues = [];
        // for (let i = 0; i < experiences.length; i++)
        //     onlineQValues.push(onlinePredictions[i][experiences[i].action]);

        // get the predicted q-values of the best actions using the target network
        //let targetPredictions = nextStates.map(state => this.targetBrain.predict(state));
        // let actions = targetPredictions.map(prediction => this.predictionToAction(prediction));
        // let targetQValues = [];
        // for (let i = 0; i < experiences.length; i++)
        //     targetQValues.push(targetPredictions[i][actions[i]]);

        // calculate target reward
        let targetPredictions = nextStates.map(state => this.targetBrain.predict(state));
        for (let i = 0; i < experiences.length; i++) {

            //targetPredictions[i][experiences[i].action] += experiences[i].reward;

            // if (experiences[i].reward === -1)
            //     targetPredictions[i][experiences[i].action] = experiences[i].reward;
            // else
            //     targetPredictions[i][experiences[i].action] += experiences[i].reward;

            let nextStateMaxQ = Math.max(...targetPredictions[i]);

            if (experiences[i].isDone)
                targetPredictions[i][experiences[i].action] = experiences[i].reward;
            else
                targetPredictions[i][experiences[i].action] = experiences[i].reward + GAMMA * nextStateMaxQ;
            //targetPredictions[i][experiences[i].action] = experiences[i].reward + nextStateMaxQ;
        }

        // train the online network
        const history = await this.onlineBrain.train(states, targetPredictions);
        //console.log(history)

        // update the target network weights (equal to online network) at regular intervals
        if (this.updateInterval == 0) {
            //this.targetBrain.model.setWeights(this.onlineBrain.model.getWeights());
            this.targetBrain = this.onlineBrain.copy();
            this.updateInterval = UPDATE_INTERVAL;
        } else {
            this.updateInterval--;
        }
    }
}

class DQNEnvironment {
    constructor(context, width, height) {
        this.context = context;
        this.width = width;
        this.height = height;
        this.agent = new DQNAgent(0.01);
        this.reset();

        // moves left to start storing experiences
        // this.trainingGap = 0;
        // this.hungerPenalty = 10;
        // this.distanceReward = 0;

    }

    // reset variables for next episode
    reset() {
        this.grid = this.createGrid();
        this.snake = [];
        this.moves = 0;
        this.movesLeft = MAX_MOVES;
        this.apple = null;
        this.lastMovement = Movement.STILL;
    }

    calculateReward(action) {
        let head = this.snake[this.snake.length - 1];

        if (this.lastMovement == Movement.RIGHT && head.movement == Movement.LEFT)
            return -1;
        if (this.lastMovement == Movement.LEFT && head.movement == Movement.RIGHT)
            return -1;
        if (this.lastMovement == Movement.UP && head.movement == Movement.DOWN)
            return -1;
        if (this.lastMovement == Movement.DOWN && head.movement == Movement.UP)
            return -1;

        if (action === Movement.RIGHT) {
            if (head.x === this.width - 1)
                return -1;
            if (head.x + 1 === this.apple.x && head.y === this.apple.y)
                return 1;
        }
        if (action === Movement.LEFT) {
            if (head.x === 0)
                return -1;
            if (head.x - 1 === this.apple.x && head.y === this.apple.y)
                return 1;
        }
        if (action === Movement.UP) {
            if (head.y === 0)
                return -1;
            if (head.x === this.apple.x && head.y - 1 === this.apple.y)
                return 1;
        }
        if (action === Movement.DOWN) {
            if (head.y === this.height - 1)
                return -1;
            if (head.x === this.apple.x && head.y + 1 === this.apple.y)
                return 1;
        }
        let distance = Math.sqrt(Math.pow(head.x - this.apple.x, 2) + Math.pow(head.y - this.apple.y, 2));
        return 1 / Math.max(1, distance);
    }

    calculateRewardAdvanced(action) {

        let distanceReward = 0;
        let hungerReward = 0;

        let head = this.snake[this.snake.length - 1];
        let currentDistanceHeadTarget = Math.abs(head.y - this.apple.y) + Math.abs(head.x - this.apple.x);
        let nextDistanceHeadTarget;
        if (action === Movement.RIGHT)
            nextDistanceHeadTarget = Math.abs(head.y - this.apple.y) + Math.abs(head.x + 1 - this.apple.x);
        else if (action === Movement.LEFT)
            nextDistanceHeadTarget = Math.abs(head.y - this.apple.y) + Math.abs(head.x - 1 - this.apple.x);
        else if (action === Movement.UP)
            nextDistanceHeadTarget = Math.abs(head.y - 1 - this.apple.y) + Math.abs(head.x - this.apple.x);
        else
            nextDistanceHeadTarget = Math.abs(head.y + 1 - this.apple.y) + Math.abs(head.x - this.apple.x);

        // console.log("head", head)
        // console.log("currentDistanceHeadTarget", currentDistanceHeadTarget)
        // console.log("nextDistanceHeadTarget", nextDistanceHeadTarget)

        if (!nextDistanceHeadTarget) {
            //this.trainingGap = this.snake.length <= 10 ? 6 : 0.4 * this.snake.length + 2;
            return 1;
        } else if (this.snake.length > 1) {
            distanceReward = parseInt(Math.log((this.snake.length + currentDistanceHeadTarget) / (this.snake.length + nextDistanceHeadTarget)) / Math.log(this.snake.length));
        }

        if (this.timeout - this.movesLeft > this.hungerPenalty) {
            hungerReward = -0.5 / this.snake.length;
        }

        // console.log("this.snake.length", this.snake.length)
        // console.log("distanceReward", distanceReward)
        // console.log("hungerReward", hungerReward)
        // console.log("this.timeout", this.timeout)
        // console.log("this.hungerPenalty", this.hungerPenalty)
        // console.log("this.movesLeft", this.movesLeft)

        return distanceReward + hungerReward;
    }

    // returns an empty grid
    createGrid() {
        let grid = [];
        for (let y = 0; y < this.height; y++)
            for (let x = 0; x < this.width; x++)
                if (x == 0) grid[y] = [new Square(this.context, x, y)];
                else grid[y].push(new Square(this.context, x, y));
        return grid;
    }

    // returns a copy of the grid (state)
    getGrid() {
        let result = [];
        for (let row of this.grid)
            result.push(row.map(square => [square.type]));
        return result;
    }

    printGrid() {
        let squareToLetter = function (square) {
            if (square.type == Type.SPACE) return " ";
            if (square.type == Type.SNAKE_HEAD) return "H";
            if (square.type == Type.SNAKE_BODY) return "B";
            if (square.type == Type.APPLE) return "A";
            if (square.type == Type.EATEN_APPLE) return "E";
        }
        this.grid.forEach(function (row, index) {
            const rowString = row.map(square => squareToLetter(square));
            console.log(index + " > " + rowString.join("|"));
        });
    }

    // updates all grid squares visually
    update() {
        for (const row of this.grid)
            for (const square of row)
                square.update();
    }

    // spawns the snake's head
    spawnHead(x, y) {
        if (!(x >= 0 && x < SIZE && y >= 0 && y < SIZE)) {
            x = Math.floor(this.width / 2);
            y = Math.floor(this.height / 2);
        }
        this.grid[x][y].type = Type.SNAKE_HEAD;
        this.snake.push(this.grid[x][y]);
    }

    // changes the head movement
    changeMovementTo(movement) {
        this.snake[this.snake.length - 1].movement = movement;
    }

    move() {
        // get current head and tail
        let head = this.snake[this.snake.length - 1];
        let tail = this.snake[0];

        // check if head hits any wall after moving
        if (head.hitsWall(this.width, this.height))
            return false;

        // new head
        let newHead = head.nextSquare(this.grid);
        if (newHead.type === Type.APPLE) {
            if (this.snake.length === this.width * this.height)
                return false;
            this.movesLeft = MAX_MOVES;
            newHead.eatingApple = true;
            this.generateApple();
        }
        newHead.type = Type.SNAKE_HEAD;
        newHead.changeMovementTo(head.movement);

        // check if head hits any snake body
        if (this.snake.includes(newHead) && newHead !== tail)
            return false;

        // if head is going to hit tail
        if (newHead === tail) {
            // if tail is EATEN_APPLE (snake will grow), game ends
            if (tail.type === Type.EATEN_APPLE) {
                return false;
            }
            this.snake.shift();
            tail = this.snake[0];
            // change from SNAKE_HEAD to EATEN_APPLE
            if (!head.eatingApple) {
                head.type = Type.SNAKE_BODY;
            } else {
                head.eatingApple = false;
                head.type = Type.EATEN_APPLE;
            }
        }
        // if snake size > 1
        else if (head !== tail) {
            // increase tail if is EATEN_APPLE
            if (tail.type === Type.SNAKE_BODY) {
                this.snake.shift();
                tail.type = Type.SPACE;
                tail.changeMovementTo(Movement.STILL);
            } else if (tail.type === Type.EATEN_APPLE) {
                tail.type = Type.SNAKE_BODY;
            }
            // change from SNAKE_HEAD to EATEN_APPLE
            if (!head.eatingApple) {
                head.type = Type.SNAKE_BODY;
            } else {
                head.eatingApple = false;
                head.type = Type.EATEN_APPLE;
            }
        }
        // if snake size = 1
        else {
            // if head is eating apple, new tail will be SNAKE_BODY (not EATEN_APPLE)
            if (!head.eatingApple) {
                this.snake.shift();
                head.type = Type.SPACE;
                head.movement = Movement.STILL;
            } else {
                head.eatingApple = false;
                head.type = Type.SNAKE_BODY;
            }
        }
        this.snake.push(newHead);
        return true;
    }

    // generates an apple on a random empty square
    generateApple(x, y) {
        let square;
        if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
            square = this.grid[x][y];
        } else {
            do {
                x = Math.floor(Math.random() * this.width);
                y = Math.floor(Math.random() * this.height);
                square = this.grid[x][y];
            } while (square.type !== Type.SPACE);
        }
        square.type = Type.APPLE;
        square.changeMovementTo(Movement.STILL);
        this.apple = square;
    }

    async play() {
        this.spawnHead();
        this.generateApple();
        let hasMoved = false;
        do {
            hasMoved = this.move();
            if (hasMoved) {
                this.update();
                await new Promise(r => setTimeout(r, 500));
            }
        } while (hasMoved && this.movesLeft > 0);
    }

    async run(initialization, skip) {

        this.spawnHead();
        //this.generateApple(2, 3);
        this.generateApple();
        let hasMoved = false;

        if (!initialization) {
            this.update();
            if (!skip) await new Promise(r => setTimeout(r, 100));
        }

        // if (!initialization)
        //     this.printGrid()

        do {
            this.moves++;
            this.movesLeft--;
            let state = this.getGrid();

            // perform action (epsilon-greedy strategy)
            let action = this.agent.predictedAction(state);
            this.changeMovementTo(action);

            // get reward and next state
            let reward = this.calculateReward(action);
            hasMoved = this.move();
            let nextState = this.getGrid();

            let experience = new Experience(state, action, reward, nextState, !hasMoved);
            this.agent.memory.push(experience);
            this.lastMovement = action;

            // train agent if replay memory is full
            // if (this.agent.memory.isFull() && !initialization) {
            //     await this.agent.train(BATCH_SIZE);
            // }

            // if (!initialization && this.snake.length > 1) {
            //     let goodExperiences = this.agent.memory.memories.filter(memory => memory.reward > 0);
            //     console.log(goodExperiences)
            // }

            if (!skip && hasMoved) {
                this.update();
                await new Promise(r => setTimeout(r, 100));
            }

            // if (!initialization) {
            //     let actionString = action == Movement.RIGHT ? "right" : action == Movement.LEFT ? "left" : action == Movement.UP ? "up" : "down"
            //     console.log("action: " + actionString)
            //     if (hasMoved) this.printGrid()
            // }

        } while (hasMoved && this.movesLeft > 0);
    }
}