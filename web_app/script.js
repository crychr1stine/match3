document.addEventListener('DOMContentLoaded', () => {
    // --- Инициализация Telegram Web App ---
    const tg = window.Telegram.WebApp;
    tg.ready();

    // Настраиваем главную кнопку Telegram
    tg.MainButton.setText('Завершить игру и забрать золото');
    tg.MainButton.onClick(finishGame);
    tg.MainButton.hide(); // Прячем кнопку, пока не набран счет

    // --- Настройки игры ---
    const board = document.getElementById('game-board');
    const scoreDisplay = document.getElementById('score');
    const width = 8; // Ширина поля
    const items = ['🐟', '🧶', '🐭', '🍖', '🥛', '🌿']; // Эмодзи-предметы
    let grid = [];
    let score = 0;
    let selectedTile = null;

    // --- Логика игры ---

    // Создание игрового поля
    function createBoard() {
        board.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
        for (let i = 0; i < width * width; i++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            tile.setAttribute('data-id', i);
            tile.addEventListener('click', onTileClick);
            
            let randomItem = items[Math.floor(Math.random() * items.length)];
            tile.textContent = randomItem;
            
            board.appendChild(tile);
            grid.push(tile);
        }
        // Убедимся, что на старте нет готовых комбинаций
        checkForMatches();
    }

    // Обработка клика по ячейке
    function onTileClick() {
        const clickedTile = this;

        if (!selectedTile) {
            // Первое нажатие - выбираем ячейку
            selectedTile = clickedTile;
            selectedTile.classList.add('selected');
        } else {
            // Второе нажатие - пытаемся поменять местами
            const firstId = parseInt(selectedTile.getAttribute('data-id'));
            const secondId = parseInt(clickedTile.getAttribute('data-id'));
            
            // Проверяем, что ячейки рядом
            const isAdjacent = 
                secondId === firstId - 1 || // слева
                secondId === firstId + 1 || // справа
                secondId === firstId - width || // сверху
                secondId === firstId + width; // снизу

            if (isAdjacent) {
                // Меняем эмодзи местами
                let tempItem = selectedTile.textContent;
                selectedTile.textContent = clickedTile.textContent;
                clickedTile.textContent = tempItem;

                // Проверяем, создал ли этот ход комбинацию
                if (!checkForMatches()) {
                    // Если нет, возвращаем все как было
                    let tempItem = selectedTile.textContent;
                    selectedTile.textContent = clickedTile.textContent;
                    clickedTile.textContent = tempItem;
                }
            }
            
            selectedTile.classList.remove('selected');
            selectedTile = null;
        }
    }

    // Проверка и удаление комбинаций
    function checkForMatches() {
        let matched = false;
        // Проверяем горизонтальные и вертикальные ряды
        for (let i = 0; i < width * width; i++) {
            // Горизонтальные
            if (i % width <= width - 3) {
                if (grid[i].textContent && grid[i].textContent === grid[i+1].textContent && grid[i].textContent === grid[i+2].textContent) {
                    score += 30;
                    grid[i].textContent = '';
                    grid[i+1].textContent = '';
                    grid[i+2].textContent = '';
                    matched = true;
                }
            }
            // Вертикальные
            if (i < width * (width - 2)) {
                 if (grid[i].textContent && grid[i].textContent === grid[i+width].textContent && grid[i].textContent === grid[i+width*2].textContent) {
                    score += 30;
                    grid[i].textContent = '';
                    grid[i+width].textContent = '';
                    grid[i+width*2].textContent = '';
                    matched = true;
                }
            }
        }
        
        if (matched) {
            scoreDisplay.textContent = score;
            if (score > 0) {
                tg.MainButton.show(); // Показываем кнопку, как только набран счет
            }
            // Запускаем падение новых элементов после небольшой задержки
            setTimeout(() => {
                dropNewItems();
                checkForMatches(); // Проверяем снова, т.к. новые могли создать комбо
            }, 300);
        }
        return matched;
    }

    // Падение новых элементов
    function dropNewItems() {
        for (let i = 0; i < width * (width - 1); i++) {
            if (grid[i + width].textContent === '') {
                grid[i + width].textContent = grid[i].textContent;
                grid[i].textContent = '';
            }
        }
        // Заполняем верхний ряд
        for (let i = 0; i < width; i++) {
            if (grid[i].textContent === '') {
                grid[i].textContent = items[Math.floor(Math.random() * items.length)];
            }
        }
    }
    
    // Функция завершения игры и отправки данных
    function finishGame() {
        // Отправляем данные в формате JSON
        const dataToSend = JSON.stringify({ score: score });
        tg.sendData(dataToSend);
        // После отправки данных можно закрыть Web App
        // tg.close(); // Раскомментируйте, если хотите, чтобы окно закрывалось автоматически
    }

    // Запуск игры
    createBoard();
});