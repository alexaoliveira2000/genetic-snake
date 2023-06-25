const Type = {
    SPACE: 0,
    APPLE: 1,
    EATEN_APPLE: 2,
    SNAKE_BODY: 3,
    SNAKE_HEAD: 4
}

const Movement = {
    STILL: 0,
    UP: 1,
    RIGHT: 2,
    DOWN: 3,
    LEFT: 4
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
                this.context.fillStyle = "black";
                break;
            case Type.SNAKE_BODY:
                this.context.fillStyle = "gray";
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
        if (this.movement === Movement.UP && this.y === 0) {
            return true;
        } else if (this.movement === Movement.DOWN && this.y === height - 1) {
            return true;
        } else if (this.movement === Movement.LEFT && this.x === 0) {
            return true;
        } else if (this.movement === Movement.RIGHT && this.x === width - 1) {
            return true;
        } else {
            return false;
        }
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

class Environment {
    constructor(context, width, height, agent) {
        this.context = context;
        this.width = width;
        this.height = height;
        this.agent = agent;
        this.grid = this.createGrid();
        this.snake = [];
        this.timeout = 100;
        this.movesLeft = this.timeout;
        this.moves = 0;
    }

    reset() {
        this.grid = this.createGrid();
        this.snake = [];
        this.moves = 0;
        this.movesLeft = this.timeout;
    }

    createGrid() {
        let grid = [];
        for (let y = 0; y < this.height; y++)
            for (let x = 0; x < this.width; x++)
                if (x == 0) grid[y] = [new Square(this.context, x, y)];
                else grid[y].push(new Square(this.context, x, y));
        return grid;
    }

    getGrid() {
        let result = [];
        for (let row of this.grid)
            result.push(row.map(square => [square.type]));
        return result;
    }

    update() {
        for (const row of this.grid)
            for (const square of row)
                square.update();
    }

    spawnHead() {
        let x = Math.floor(this.width / 2);
        let y = Math.floor(this.height / 2);
        this.grid[x][y].type = Type.SNAKE_HEAD;
        this.snake.push(this.grid[x][y]);
    }

    predictedAction(prediction) {
        let actionIndex = 0;
        for (let i = 1; i < prediction.length; i++)
            if (prediction[i] > prediction[actionIndex])
                actionIndex = i;
        if (actionIndex === 0)
            return Movement.UP;
        if (actionIndex === 1)
            return Movement.DOWN;
        if (actionIndex === 2)
            return Movement.LEFT;
        return Movement.RIGHT;
    }

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
            this.movesLeft = this.timeout;
            newHead.eatingApple = true;
            this.generateApple();
        }
        newHead.type = Type.SNAKE_HEAD;
        newHead.changeMovementTo(head.movement);

        // check if head hits any snake body
        if (this.snake.includes(newHead) && newHead !== tail)
            return false;

        if (newHead === tail) {
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

    generateApple(x, y) {
        let square;
        if (x && y) {
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

    async run(skip) {
        this.spawnHead();
        this.generateApple();
        do {
            this.moves++;
            this.movesLeft--;
            let inputs = this.normalizeInputs(this.getGrid());
            let predictions = this.agent.brain.predict(inputs);
            let movement = this.predictedAction(predictions);
            this.changeMovementTo(movement);
            if (!skip) {
                this.update();
                await new Promise(r => setTimeout(r, 10));
            }
        } while (this.move() && this.movesLeft > 0);
        this.agent.score = this.snake.length - 1;
        //this.agent.score = Math.floor(this.moves / 10) + Math.pow(2, this.snake.length - 1);
        if (this.snake.length === this.width * this.height)
            console.log("EXPERT")
    }
}

class Agent {
    constructor(generation, mutationRate, brain) {
        this.score = 0;
        this.fitness = 0;
        this.generation = generation;
        if (brain instanceof NeuralNetwork) {
            this.brain = brain.copy();
            this.brain.mutate(mutationRate);
        } else {
            this.brain = new NeuralNetwork();
        }
    }
}

class Population {
    constructor(size, mutationRate) {
        this.size = size;
        this.mutationRate = mutationRate;
        this.members = [];
        for (let i = 1; i <= size; i++)
            this.members.push(new Agent(1, this.mutationRate));
        this.bestAgent = this.members[0];
    }

    checkBestAgent() {
        let bestAgentGeneration = this.members[0];
        for (const agent of this.members)
            if (agent.score > bestAgentGeneration.score)
                bestAgentGeneration = agent;
        if (bestAgentGeneration.score > this.bestAgent.score) {
            this.bestAgent = bestAgentGeneration;
            console.log("New best agent found:", this.bestAgent);
        }
    }

    nextGeneration(doCrossover) {
        // let newMembers = [];
        // this.normalizeFitness();
        // console.log(this.members);
        // let bestAgent = this.members[0];
        // for (const agent of this.members)
        //     if (agent.fitness > bestAgent.fitness)
        //         bestAgent = agent;
        // for (const agent of this.members)
        //     newMembers.push(new Agent(bestAgent.generation + 1, this.mutationRate, bestAgent.brain));
        // return newMembers;

        // this.normalizeFitness();
        // this.checkBestAgent();
        // let newMembers = [];
        // let bestAgent = this.members[0];
        // for (const agent of this.members)
        //     if (agent.fitness > bestAgent.fitness)
        //         bestAgent = agent;
        // for (const agent of this.members) {
        //     let crossoverAgent = bestAgent;
        //     agent.brain.crossover(crossoverAgent.brain.model, 0.5);
        //     let newAgent = new Agent(agent.generation + 1, this.mutationRate, agent.brain);
        //     newMembers.push(newAgent);
        // }
        // return newMembers;

        this.normalizeFitness();
        this.checkBestAgent();
        let newMembers = [];
        let pool = this.createPool(this.members);
        while (newMembers.length < this.members.length) {
            let selectedAgent = this.poolSelection(pool);
            if (doCrossover) {
                let crossoverAgent = this.poolSelection(pool, selectedAgent);
                selectedAgent.brain.crossover(crossoverAgent.brain.model, 0.5);
                let newCrossoverAgent = new Agent(crossoverAgent.generation + 1, this.mutationRate, crossoverAgent.brain);
                newMembers.push(newCrossoverAgent);
            }
            if (newMembers.length < this.members.length) {
                let newAgent = new Agent(selectedAgent.generation + 1, this.mutationRate, selectedAgent.brain);
                newMembers.push(newAgent);
            }
        }
        return newMembers;
    }

    nextGeneration_old() {
        // let newMembers = [];
        // this.normalizeFitness();
        // console.log(this.members);
        // let bestAgent = this.members[0];
        // for (const agent of this.members)
        //     if (agent.fitness > bestAgent.fitness)
        //         bestAgent = agent;
        // for (const agent of this.members)
        //     newMembers.push(new Agent(bestAgent.generation + 1, this.mutationRate, bestAgent.brain));
        // return newMembers;

        this.normalizeFitness();
        this.checkBestAgent();
        //console.log(this.members);
        let newMembers = [];
        let pool = this.createPool(this.members);
        while (newMembers.length < this.members.length) {
            let selectedAgent = this.poolSelection(pool);
            let newAgent = new Agent(selectedAgent.generation + 1, this.mutationRate, selectedAgent.brain);
            newMembers.push(newAgent);
        }
        return newMembers;
    }

    normalizeFitness() {
        for (const member of this.members)
            member.score = Math.pow(member.score, 2);
        let sum = 0;
        for (const member of this.members)
            sum += member.score;
        sum = sum || 1;
        for (const member of this.members)
            member.fitness = member.score / sum;
    }

    createPool(members) {
        let pool = [];
        members.forEach((member) => {
            let fitness = Math.floor(member.fitness * 100) || 1;
            for (let i = 0; i < fitness; i++) {
                pool.push(member);
            }
        });
        return pool;
    }

    poolSelection(pool, member) {
        let selectedMember;
        do {
            selectedMember = pool[Math.floor(Math.random() * pool.length)];
        } while (selectedMember == member);
        return selectedMember;
    }
}