(function(){
  const startScreen = document.getElementById('startScreen');
  const startBtn = document.getElementById('startBtn');
  const gameContainer = document.getElementById('game');
  const statusDiv = document.getElementById('status');
  const resetBtn = document.getElementById('resetBtn');
  const homeBtn = document.getElementById('homeBtn');
  const modeRadios = document.querySelectorAll('input[name="gameMode"]');
  const diffRadios = document.querySelectorAll('input[name="botDifficulty"]');
  const difficultySelection = document.getElementById('difficultySelection');
  const clickSound = document.getElementById('clickSound');
  const confettiCanvas = document.getElementById('confettiCanvas');
  const ctx = confettiCanvas.getContext('2d');

  let board = Array(9).fill('');
  let currentPlayer = 'X';
  let gameOver = false;
  let gameStarted = false;
  let playWithBot = true;
  let botDifficulty = 'easy';

  // Winning combinations indices
  const winningCombinations = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6]
  ];

  // Confetti variables
  const confettiPieces = [];
  const confettiCount = 150;
  const gravity = 0.3;
  const terminalVelocity = 5;
  const drag = 0.075;
  let confettiActive = false;

  function randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  // Confetti piece class
  class ConfettiPiece {
    constructor() {
      this.x = randomRange(0, confettiCanvas.width);
      this.y = randomRange(-confettiCanvas.height, 0);
      this.w = randomRange(7, 12);
      this.h = randomRange(10, 18);
      this.color = `hsl(${randomRange(0, 360)}, 70%, 60%)`;
      this.tilt = randomRange(-10, 10);
      this.tiltAngle = 0;
      this.tiltAngleIncrement = randomRange(0.05, 0.12);
      this.vx = randomRange(-2, 2);
      this.vy = randomRange(2, 5);
    }
    update() {
      this.tiltAngle += this.tiltAngleIncrement;
      this.tilt = Math.sin(this.tiltAngle) * 15;
      this.x += this.vx;
      this.y += this.vy;
      this.vy += gravity;
      this.vy = Math.min(this.vy, terminalVelocity);
      this.vx *= 0.98; // air resistance
      if (this.y > confettiCanvas.height) {
        this.y = randomRange(-confettiCanvas.height, 0);
        this.x = randomRange(0, confettiCanvas.width);
        this.vy = randomRange(2, 5);
        this.vx = randomRange(-2, 2);
      }
    }
    draw(ctx) {
      ctx.beginPath();
      ctx.lineWidth = this.h / 2;
      ctx.strokeStyle = this.color;
      ctx.moveTo(this.x + this.tilt + this.w / 2, this.y);
      ctx.lineTo(this.x + this.tilt, this.y + this.tilt + this.h / 2);
      ctx.stroke();
    }
  }

  function initConfetti() {
    confettiPieces.length = 0;
    for(let i=0; i<confettiCount; i++){
      confettiPieces.push(new ConfettiPiece());
    }
  }

  function resizeCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }

  window.addEventListener('resize', () => {
    resizeCanvas();
    if(confettiActive) {
      drawConfetti();
    }
  });

  function drawConfetti() {
    if(!confettiActive) return;
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiPieces.forEach(c => {
      c.update();
      c.draw(ctx);
    });
    requestAnimationFrame(drawConfetti);
  }

  function startConfetti() {
    confettiActive = true;
    resizeCanvas();
    initConfetti();
    drawConfetti();
    setTimeout(stopConfetti, 5000);
  }

  function stopConfetti() {
    confettiActive = false;
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }

  // Play click sound function with volume control and catch errors if any
  function playClickSound() {
    try {
      clickSound.currentTime = 0;
      clickSound.volume = 0.3;
      clickSound.play();
    } catch (e) {
      // ignore play errors in some browsers
    }
  }

  // Create cells
  function createBoard() {
    gameContainer.innerHTML = '';
    for(let i=0; i<9; i++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.setAttribute('data-index', i);
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('tabindex', '0');
      cell.setAttribute('aria-label', `Cell ${i+1}, empty`);
      cell.addEventListener('click', onCellClick);
      cell.addEventListener('keydown', onCellKeyDown);
      gameContainer.appendChild(cell);
    }
  }

  // Handle cell click
  function onCellClick(e) {
    if(gameOver || !gameStarted) return;
    const idx = e.target.getAttribute('data-index');
    if(board[idx] !== '') return;

    playClickSound();

    if(playWithBot) {
      if(currentPlayer === 'X') {
        makeMove(idx);
        if(!gameOver) {
          setTimeout(botMove, 300);
        }
      }
    } else {
      makeMove(idx);
    }
  }

  // Handle keyboard accessibility (Enter or Space to mark)
  function onCellKeyDown(e) {
    if(gameOver || !gameStarted) return;
    if(e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const idx = e.target.getAttribute('data-index');
      if(board[idx] === '') {
        playClickSound();
        if(playWithBot) {
          if(currentPlayer === 'X') {
            makeMove(idx);
            if(!gameOver) {
              setTimeout(botMove, 300);
            }
          }
        } else {
          makeMove(idx);
        }
      }
    }
  }

  // Make a move on board
  function makeMove(idx) {
    if(board[idx] !== '') return;
    board[idx] = currentPlayer;
    updateCell(idx);

    if(isWinner(currentPlayer)) {
      statusDiv.textContent = `Player ${currentPlayer} wins! 🎉`;
      gameOver = true;
      highlightWinningCells();

      // Start confetti on win
      startConfetti();
      return;
    }

    if(isDraw()) {
      statusDiv.textContent = "It's a draw! 🤝";
      gameOver = true;
      return;
    }

    togglePlayer();
    statusDiv.textContent = `Current turn: ${currentPlayer}`;
  }

  // Update cell UI after move
  function updateCell(idx) {
    const cell = gameContainer.querySelector(`.cell[data-index='${idx}']`);
    cell.textContent = board[idx];
    cell.classList.add('disabled');
    cell.removeEventListener('click', onCellClick);
    cell.removeEventListener('keydown', onCellKeyDown);
    cell.setAttribute('aria-label', `Cell ${parseInt(idx)+1}, marked ${board[idx]}`);
  }

  // Check for winner
  function isWinner(player) {
    return winningCombinations.some(combination => {
      return combination.every(i => board[i] === player);
    });
  }

  // Highlight winning cells
  function highlightWinningCells() {
    winningCombinations.forEach(combination => {
      if(combination.every(i => board[i] === currentPlayer)) {
        combination.forEach(i => {
          const cell = gameContainer.querySelector(`.cell[data-index='${i}']`);
          cell.style.backgroundColor = currentPlayer === 'X' ? '#70c1b3' : '#ff6f91';
          cell.style.color = '#fff';
          cell.style.boxShadow = '0 0 15px 3px rgba(255,255,255,0.7)';
        });
      }
    });
  }

  // Check for draw
  function isDraw() {
    return board.every(cell => cell !== '');
  }

  // Switch current player
  function togglePlayer() {
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  }

  // Reset game state and UI
  function resetGame() {
    stopConfetti();
    board.fill('');
    currentPlayer = 'X';
    gameOver = false;
    statusDiv.textContent = `Current turn: ${currentPlayer}`;
    const cells = gameContainer.querySelectorAll('.cell');
    cells.forEach(cell => {
      cell.textContent = '';
      cell.classList.remove('disabled');
      cell.style.backgroundColor = '';
      cell.style.color = '#4a4a4a';
      cell.style.boxShadow = '0 8px 15px rgba(0,0,0,0.2)';
      cell.addEventListener('click', onCellClick);
      cell.addEventListener('keydown', onCellKeyDown);
      cell.setAttribute('aria-label', `Cell ${parseInt(cell.getAttribute('data-index'))+1}, empty`);
    });
    // If bot plays first and currentPlayer is 'O', bot should move immediately on start
    if (gameStarted && playWithBot && currentPlayer === 'O' && !gameOver) {
      setTimeout(botMove, 300);
    }
  }

  // Bot move logic with difficulty
  function botMove() {
    if(gameOver) return;

    const bestMoveIndex = findBotMove(board, botDifficulty);
    if(bestMoveIndex !== -1) {
      playClickSound();
      makeMove(bestMoveIndex);
    }
  }

  // Find bot move according to difficulty
  function findBotMove(board, difficulty) {
    // Easy: random available move
    if (difficulty === 'easy') {
      const available = board.map((v, i) => v === '' ? i : -1).filter(i => i !== -1);
      if (available.length === 0) return -1;
      return available[Math.floor(Math.random() * available.length)];
    }
    // Medium: 50% chance to play like hard, 50% random
    if (difficulty === 'medium') {
      if (Math.random() < 0.5) {
        return findBestMove(board); // Like hard
      } else {
        const available = board.map((v, i) => v === '' ? i : -1).filter(i => i !== -1);
        if (available.length === 0) return -1;
        return available[Math.floor(Math.random() * available.length)];
      }
    }
    // Hard: always best move
    return findBestMove(board);
  }

  // Finds best move for bot using defensive and winning logic (hard)
  function findBestMove(board) {
    // 1. Win if possible
    for(let i=0; i<9; i++) {
      if(board[i] === '') {
        board[i] = 'O';
        if(isWinner('O')) {
          board[i] = '';
          return i;
        }
        board[i] = '';
      }
    }
    // 2. Block player if they can win next move
    for(let i=0; i<9; i++) {
      if(board[i] === '') {
        board[i] = 'X';
        if(isWinner('X')) {
          board[i] = '';
          return i;
        }
        board[i] = '';
      }
    }
    // 3. Take center if free
    if(board[4] === '') return 4;

    // 4. Take any corner free
    const corners = [0,2,6,8];
    for(const c of corners) {
      if(board[c] === '') return c;
    }

    // 5. Take any side
    const sides = [1,3,5,7];
    for(const s of sides) {
      if(board[s] === '') return s;
    }

    // If no moves, return -1
    return -1;
  }

  // Show/hide difficulty selector depending on game mode
  function updateDifficultyVisibility() {
    const botSelected = document.querySelector('input[name="gameMode"]:checked').value === 'bot';
    difficultySelection.style.display = botSelected ? 'flex' : 'none';
  }

  // Start game from start screen
  function startGame() {
    playWithBot = document.querySelector('input[name="gameMode"]:checked').value === 'bot';
    botDifficulty = document.querySelector('input[name="botDifficulty"]:checked').value;
    gameStarted = true;
    startScreen.style.display = 'none';
    gameContainer.classList.add('active');
    statusDiv.classList.add('active');
    resetBtn.classList.add('active');
    homeBtn.classList.add('active');

    // Update aria-hidden attributes for screen readers
    gameContainer.setAttribute('aria-hidden', 'false');
    statusDiv.setAttribute('aria-hidden', 'false');
    resetBtn.setAttribute('aria-hidden', 'false');
    homeBtn.setAttribute('aria-hidden', 'false');

    createBoard();
    statusDiv.textContent = `Current turn: ${currentPlayer}`;
    // Bot starts immediately if it plays first
    if (playWithBot && currentPlayer === 'O') {
      setTimeout(botMove, 300);
    }
  }

  // Home button functionality
  function goHome() {
    // Hide game elements
    gameContainer.classList.remove('active');
    statusDiv.classList.remove('active');
    resetBtn.classList.remove('active');
    homeBtn.classList.remove('active');
    // Set aria-hidden for accessibility
    gameContainer.setAttribute('aria-hidden', 'true');
    statusDiv.setAttribute('aria-hidden', 'true');
    resetBtn.setAttribute('aria-hidden', 'true');
    homeBtn.setAttribute('aria-hidden', 'true');
    // Show start screen
    startScreen.style.display = '';
    // Reset game state
    stopConfetti();
    board.fill('');
    currentPlayer = 'X';
    gameOver = false;
    gameStarted = false;
  }

  startBtn.addEventListener('click', startGame);
  resetBtn.addEventListener('click', resetGame);
  homeBtn.addEventListener('click', goHome);

  // Listen for mode changes to show/hide difficulty
  modeRadios.forEach(radio => {
    radio.addEventListener('change', updateDifficultyVisibility);
  });
  // Initial
  updateDifficultyVisibility();

})();