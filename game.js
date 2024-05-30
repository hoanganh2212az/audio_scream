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
let gameOver = false;
let audioContext;
let analyser;
let dataArray;
let microphone;
let javascriptNode;

function createObstacle() {
    const height = Math.random() * (canvas.height / 4) + 50; // Lower the height of the obstacles
    obstacles.push({
        x: canvas.width,
        y: canvas.height - height,
        width: 50,
        height: height
    });
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

function detectCollision() {
    obstacles.forEach(obstacle => {
        // Check for collision with the sides of the obstacle
        if (character.x < obstacle.x + obstacle.width &&
            character.x + character.width > obstacle.x &&
            character.y < obstacle.y + obstacle.height &&
            character.y + character.height > obstacle.y) {
            // Check if the character lands on top of the obstacle
            if (character.dy > 0 && character.y + character.height <= obstacle.y + 10) {
                character.y = obstacle.y - character.height;
                character.dy = 0;
                character.onGround = true;
            } else {
                gameOver = true;
                document.getElementById('game-over').style.display = 'block';
            }
        }
    });
}

function gameLoop() {
    if (gameOver) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawCharacter();
    drawObstacles();
    updateCharacter();
    updateObstacles();
    detectCollision();

    requestAnimationFrame(gameLoop);
}

setInterval(createObstacle, 2000);

async function startVoiceControl() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    microphone = audioContext.createMediaStreamSource(stream);
    javascriptNode = audioContext.createScriptProcessor(512, 1, 1); // Reduced buffer size to 512

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
