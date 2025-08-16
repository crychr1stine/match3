document.addEventListener('DOMContentLoaded', () => {
    // --- Инициализация Telegram Web App ---
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand(); // Раскрываем приложение на весь экран

    // --- Элементы DOM ---
    const boardElement = document.getElementById('game-board');
    const scoreDisplay = document.getElementById('score');
    const movesDisplay = document.getElementById('moves');
    const gameOverScreen = document.getElementById('game-over-screen');
    const finalScoreDisplay = document.getElementById('final-score');

    // --- Настройки игры ---
    const COLS = 8;
    const ROWS = 8;
    const ITEMS = ['🐟', '🧶', '🐭', '🍖', '🥛', '🌿'];
    const POINTS_PER_MATCH = 50;
    const STARTING_MOVES = 25;

    // --- Состояние игры ---
    let grid = []; // 2D массив для хранения данных поля
    let score = 0;
    let movesLeft = STARTING_MOVES;
    let selectedTile = null;
    let isAnimating = false; // Блокировка управления во время анимации

    // --- Основная игровая логика ---

    function initGame() {
        score = 0;
        movesLeft = STARTING_MOVES;
        updateDisplays();

        // Создаем поле до тех пор, пока на нем не будет возможных ходов и не будет начальных совпадений
        do {
            createGridData();
        } while (findMatches().length > 0 || !hasPossibleMoves());

        renderBoard();
        setupTelegramButton();
    }

    function createGridData() {
        grid = [];
        for (let r = 0; r < ROWS; r++) {
            const row = [];
            for (let c = 0; c < COLS; c++) {
                row.push(getRandomItem());
            }
            grid.push(row);
        }
    }

    function renderBoard() {
        boardElement.innerHTML = '';
        boardElement.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
        grid.forEach((row, r) => {
            row.forEach((item, c) => {
                const tile = document.createElement('div');
                tile.classList.add('tile');
                tile.textContent = item;
                tile.dataset.row = r;
                tile.dataset.col = c;
                tile.addEventListener('click', onTileClick);
                boardElement.appendChild(tile);
            });
        });
    }

    async function onTileClick() {
        if (isAnimating) return; // Блокируем клики во время анимации
        const clickedTile = this;

        if (!selectedTile) {
            selectedTile = clickedTile;
            selectedTile.classList.add('selected');
        } else {
            const r1 = parseInt(selectedTile.dataset.row);
            const c1 = parseInt(selectedTile.dataset.col);
            const r2 = parseInt(clickedTile.dataset.row);
            const c2 = parseInt(clickedTile.dataset.col);

            // Проверяем, что ячейки соседние
            if (Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1) {
                await handleSwap(selectedTile, clickedTile);
            }

            selectedTile.classList.remove('selected');
            selectedTile = null;
        }
    }

    async function handleSwap(tile1, tile2) {
        isAnimating = true;
        
        swapGridData(tile1, tile2);
        await animateSwap(tile1, tile2);

        const matches = findMatches();
        if (matches.length > 0) {
            movesLeft--;
            updateDisplays();
            await processMatches(matches);
            
            // Проверка на "застревание"
            if (!hasPossibleMoves()) {
                await reshuffleBoard();
            }

        } else {
            // Если совпадений нет, меняем обратно
            swapGridData(tile1, tile2);
            await animateSwap(tile1, tile2);
        }

        if (movesLeft <= 0) {
            gameOver();
        }
        
        isAnimating = false;
    }

    async function processMatches(initialMatches) {
        let matches = initialMatches;
        let comboMultiplier = 1;

        while (matches.length > 0) {
            score += matches.length * POINTS_PER_MATCH * comboMultiplier;
            updateDisplays();
            
            await animateMatches(matches);
            await shiftTilesDown();
            await fillNewTiles();

            matches = findMatches();
            if(matches.length > 0) {
                comboMultiplier++; // Увеличиваем комбо-множитель
                await delay(200); // Небольшая пауза для эффекта комбо
            }
        }
    }

    function findMatches() {
        const matches = new Set();
        // Горизонтальные
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS - 2; c++) {
                if (grid[r][c] && grid[r][c] === grid[r][c+1] && grid[r][c] === grid[r][c+2]) {
                    matches.add(`${r}-${c}`).add(`${r}-${c+1}`).add(`${r}-${c+2}`);
                }
            }
        }
        // Вертикальные
        for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS - 2; r++) {
                if (grid[r][c] && grid[r][c] === grid[r+1][c] && grid[r][c] === grid[r+2][c]) {
                    matches.add(`${r}-${c}`).add(`${r+1}-${c}`).add(`${r+2}-${c}`);
                }
            }
        }
        return Array.from(matches).map(id => getTileByCoords(id.split('-')[0], id.split('-')[1]));
    }
    
    async function shiftTilesDown() {
        for (let c = 0; c < COLS; c++) {
            let emptyRow = -1;
            for (let r = ROWS - 1; r >= 0; r--) {
                if (!grid[r][c] && emptyRow === -1) {
                    emptyRow = r;
                } else if (grid[r][c] && emptyRow !== -1) {
                    grid[emptyRow][c] = grid[r][c];
                    grid[r][c] = null;
                    emptyRow--;
                }
            }
        }
        await animateGridUpdate();
    }
    
    async function fillNewTiles() {
         for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if(!grid[r][c]) {
                    grid[r][c] = getRandomItem();
                }
            }
        }
        await animateGridUpdate();
    }

    function hasPossibleMoves() {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                // Проверяем с правым соседом
                if (c < COLS - 1) {
                    swapGridData(getTileByCoords(r, c), getTileByCoords(r, c + 1));
                    if (findMatches().length > 0) {
                        swapGridData(getTileByCoords(r, c), getTileByCoords(r, c + 1)); // меняем обратно
                        return true;
                    }
                    swapGridData(getTileByCoords(r, c), getTileByCoords(r, c + 1)); // меняем обратно
                }
                // Проверяем с нижним соседом
                if (r < ROWS - 1) {
                    swapGridData(getTileByCoords(r, c), getTileByCoords(r + 1, c));
                    if (findMatches().length > 0) {
                        swapGridData(getTileByCoords(r, c), getTileByCoords(r + 1, c)); // меняем обратно
                        return true;
                    }
                    swapGridData(getTileByCoords(r, c), getTileByCoords(r + 1, c)); // меняем обратно
                }
            }
        }
        return false;
    }

    async function reshuffleBoard() {
        isAnimating = true;
        // Можно добавить анимацию перемешивания
        do {
            createGridData();
        } while (findMatches().length > 0 || !hasPossibleMoves());
        
        await animateGridUpdate();
        isAnimating = false;
    }

    function gameOver() {
        isAnimating = true;
        finalScoreDisplay.textContent = score;
        gameOverScreen.classList.remove('hidden');
        tg.MainButton.setText(`Забрать ${score} очков`);
        tg.MainButton.show();
    }

    // --- Вспомогательные функции и анимации ---

    function updateDisplays() {
        scoreDisplay.textContent = score;
        movesDisplay.textContent = movesLeft;
    }

    function getTileByCoords(r, c) {
        return document.querySelector(`[data-row='${r}'][data-col='${c}']`);
    }

    function swapGridData(tile1, tile2) {
        const r1 = parseInt(tile1.dataset.row), c1 = parseInt(tile1.dataset.col);
        const r2 = parseInt(tile2.dataset.row), c2 = parseInt(tile2.dataset.col);
        const temp = grid[r1][c1];
        grid[r1][c1] = grid[r2][c2];
        grid[r2][c2] = temp;
    }

    async function animateSwap(tile1, tile2) {
        const tempText = tile1.textContent;
        tile1.textContent = tile2.textContent;
        tile2.textContent = tempText;
        await delay(200);
    }
    
    async function animateMatches(matchedTiles) {
        matchedTiles.forEach(tile => {
            tile.classList.add('matched');
            const r = parseInt(tile.dataset.row), c = parseInt(tile.dataset.col);
            grid[r][c] = null;
        });
        await delay(300); // Длительность анимации pop-animation
        matchedTiles.forEach(tile => tile.classList.remove('matched'));
    }

    async function animateGridUpdate() {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                getTileByCoords(r, c).textContent = grid[r][c] || '';
            }
        }
        await delay(200);
    }

    function getRandomItem() {
        return ITEMS[Math.floor(Math.random() * ITEMS.length)];
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- Интеграция с Telegram ---

    function setupTelegramButton() {
        tg.MainButton.setText('Завершить и забрать золото');
        tg.MainButton.hide();
        tg.MainButton.onClick(finishGame);
    }

    function finishGame() {
        // Защита от повторной отправки
        tg.MainButton.offClick(finishGame);
        tg.MainButton.hide();

        const dataToSend = JSON.stringify({ score: score });
        tg.sendData(dataToSend);
        // tg.close(); // Можно раскомментировать для авто-закрытия
    }

    // --- Запуск игры ---
    initGame();
});
