const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let character = {
    x: 50,
    y: canvas.height - 150,
    width: 50,
    height: 50,
    dy: 0,
    speed: 2,
    gravity: 0.5,
    jumpPower: -15,
    onGround: false
};

let obstacles = [];
let coins = [];
let score = 0;
let gameOver = false;
let audioContext;
let analyser;
let dataArray;
let microphone;
let javascriptNode;

const voiceMeterBar = document.getElementById('voice-meter-bar');

function createObstacle() {
    const height = Math.random() * (canvas.height / 4) + 100; 
    const width = Math.random() * 50 + 150;
    const obstacle = {
        x: canvas.width,
        y: canvas.height - height,
        width: width,
        height: height
    };
    obstacles.push(obstacle);
    createCoins(obstacle);
}

function createCoins(obstacle) {
    const coinRadius = 10;
    const desiredSpacing = 2; 
    const numberOfCoins = Math.floor(obstacle.width / (coinRadius * 1 * desiredSpacing));
    const coinSpacing = (obstacle.width - (numberOfCoins * 2 * coinRadius)) / (numberOfCoins - 1);

    for (let i = 0; i < numberOfCoins; i++) {
        const coin = {
            x: obstacle.x + i * (coinRadius * 2 + coinSpacing) + coinRadius,
            y: obstacle.y - coinRadius,
            radius: coinRadius
        };
        coins.push(coin);
    }
}

function drawCharacter() {
    ctx.fillStyle = 'red';
    ctx.fillRect(character.x, character.y, character.width, character.height);
}

function drawObstacles() {
    ctx.fillStyle = 'green';
    obstacles.forEach(obstacle => {
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });
}

function drawCoins() {
    ctx.fillStyle = 'yellow';
    coins.forEach(coin => {
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    });
}

function updateCharacter() {
    character.y += character.dy;
    character.dy += character.gravity;

    // Check if the character is on the ground or on top of an obstacle
    if (character.y + character.height > canvas.height) {
        character.y = canvas.height - character.height;
        character.dy = 0;
        character.onGround = true;
    } else {
        character.onGround = false;
    }

    // Prevent the character from moving above the canvas
    if (character.y < 0) {
        character.y = 0;
        character.dy = 0;
    }
}

function updateObstacles() {
    obstacles.forEach(obstacle => {
        obstacle.x -= character.speed;
    });

    obstacles = obstacles.filter(obstacle => obstacle.x + obstacle.width > 0);
}

function updateCoins() {
    coins.forEach(coin => {
        coin.x -= character.speed;
    });

    coins = coins.filter(coin => coin.x + coin.radius > 0);
}

function detectCollision() {
    obstacles.forEach(obstacle => {
        // Check if the character is horizontally aligned with the obstacle
        if (character.x < obstacle.x + obstacle.width &&
            character.x + character.width > obstacle.x) {

            // Check if the character lands on top of the obstacle
            if (character.y + character.height > obstacle.y &&
                character.y + character.height - character.dy <= obstacle.y) {
                character.y = obstacle.y - character.height;
                character.dy = 0;
                character.onGround = true;
            } 
            // Check for collision with the sides or bottom of the obstacle
            else if (character.y < obstacle.y + obstacle.height &&
                     character.y + character.height > obstacle.y) {
                gameOver = true;
                document.getElementById('game-over').style.display = 'block';
            }
        }
    });

    coins.forEach((coin, index) => {
        if (character.x < coin.x + coin.radius &&
            character.x + character.width > coin.x - coin.radius &&
            character.y < coin.y + coin.radius &&
            character.y + character.height > coin.y - coin.radius) {
            score += 1;
            coins.splice(index, 1); // Remove the collected coin
        }
    });
}

function drawScore() {
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';
    ctx.fillText('Score: ' + score, 20, 30);
}

function gameLoop() {
    if (gameOver) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawCharacter();
    drawObstacles();
    drawCoins();
    drawScore();
    updateCharacter();
    updateObstacles();
    updateCoins();
    detectCollision();

    requestAnimationFrame(gameLoop);
}

setInterval(createObstacle, 1500); //ms

async function startVoiceControl() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    microphone = audioContext.createMediaStreamSource(stream);
    
    javascriptNode = audioContext.createScriptProcessor(512, 1, 1);

    microphone.connect(analyser);
    analyser.connect(javascriptNode);
    javascriptNode.connect(audioContext.destination);

    javascriptNode.onaudioprocess = function() {
        analyser.getByteTimeDomainData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            sum += (dataArray[i] - 128) ** 2;
        }
        const volume = Math.sqrt(sum / bufferLength);

        if (volume > 5) { // Lowered the threshold for better sensitivity
            character.dy = character.jumpPower * (volume / 50); // Adjusted the scaling factor for better response
        } else if (character.onGround) {
            character.dy = 0; // Stop vertical movement when on the ground or obstacle
        }
        character.speed = Math.min(10, 2 + volume / 10); // Adjusted the scaling factor for better response
    };
}

document.getElementById('start-button').addEventListener('click', () => {
    document.getElementById('start-button').style.display = 'none';
    startVoiceControl();
    gameLoop();
});
