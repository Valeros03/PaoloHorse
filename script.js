// Game Constants
const SUITS = ['Coppe', 'Denari', 'Bastoni', 'Spade'];
const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // 9 is Cavallo (Horse)
const HORSE_VALUE = 9;

// Suit symbols for display
const SUIT_SYMBOLS = {
    'Coppe': '🏆',
    'Denari': '🪙',
    'Bastoni': '🥖',
    'Spade': '🗡️'
};

const SUIT_COLORS = {
    'Coppe': 'coppe',
    'Denari': 'denari',
    'Bastoni': 'bastoni',
    'Spade': 'spade'
};

// Game State
let deck = [];
let horses = {}; // Stores horse positions and DOM elements { suit: { position: 1, element: el, colIndex: i } }
let sideCards = []; // The 6 side cards, { card: cardObj, element: el, revealed: bool, row: number }
let gameOver = false;
let isAnimating = false;

// DOM Elements
const boardEl = document.getElementById('board');
const drawBtn = document.getElementById('draw-btn');
const resetBtn = document.getElementById('reset-btn');
const messageEl = document.getElementById('message');
const drawnCardEl = document.getElementById('drawn-card');

// Initialization
function initGame() {
    // Reset state
    deck = [];
    horses = {};
    sideCards = [];
    gameOver = false;
    isAnimating = false;
    boardEl.innerHTML = '';
    drawnCardEl.innerHTML = '';
    messageEl.textContent = 'Press "Draw Card" to start!';
    drawBtn.disabled = false;
    drawBtn.classList.remove('hidden');
    resetBtn.classList.add('hidden');

    buildDeck();
    setupBoard();
}

// Build and shuffle deck
function buildDeck() {
    let tempDeck = [];
    for (let suit of SUITS) {
        for (let value of VALUES) {
            tempDeck.push({ suit, value });
        }
    }

    // Extract horses
    tempDeck = tempDeck.filter(card => {
        if (card.value === HORSE_VALUE) {
            // We'll add them directly to horses object during setup
            return false;
        }
        return true;
    });

    // Shuffle the rest
    for (let i = tempDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tempDeck[i], tempDeck[j]] = [tempDeck[j], tempDeck[i]];
    }

    // Extract 6 side cards
    const sideCardsRaw = tempDeck.splice(0, 6);

    // Remaining are the draw pile
    deck = tempDeck;

    // Save side cards to state
    // Positioned at rows 2 to 7
    for (let i = 0; i < 6; i++) {
        sideCards.push({
            card: sideCardsRaw[i],
            revealed: false,
            row: i + 2, // Rows 2 to 7
            element: null
        });
    }
}

// Draw a single card element
function createCardElement(card, covered = false) {
    const el = document.createElement('div');
    el.classList.add('card');

    if (covered) {
        el.classList.add('covered');
    } else {
        el.classList.add(SUIT_COLORS[card.suit]);

        let displayValue = card.value;
        if (card.value === 8) displayValue = 'Fante';
        else if (card.value === 9) displayValue = 'Cavallo';
        else if (card.value === 10) displayValue = 'Re';
        else if (card.value === 1) displayValue = 'Asso';

        el.innerHTML = `
            <div class="card-text">${displayValue}</div>
            <div class="suit-icon">${SUIT_SYMBOLS[card.suit]}</div>
        `;
    }

    return el;
}

// Setup the board grid
function setupBoard() {
    for (let row = 8; row >= 1; row--) {
        for (let col = 0; col < 5; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;

            // Add side cards (col 0, rows 2-7)
            if (col === 0 && row >= 2 && row <= 7) {
                // Find the matching side card data
                const sideCardData = sideCards.find(sc => sc.row === row);
                if (sideCardData) {
                    const cardEl = createCardElement(sideCardData.card, true);
                    sideCardData.element = cardEl;
                    cell.appendChild(cardEl);
                }
            }

            boardEl.appendChild(cell);
        }
    }

    // Place horses at row 1 (starting position)
    setTimeout(placeHorses, 50);
}

// Place horse cards with absolute positioning
function placeHorses() {
    SUITS.forEach((suit, index) => {
        const colIndex = index + 1; // cols 1-4
        const horseObj = { suit, value: HORSE_VALUE };
        const horseEl = createCardElement(horseObj);
        horseEl.classList.add('horse');

        boardEl.appendChild(horseEl);

        horses[suit] = {
            position: 1,
            element: horseEl,
            colIndex: colIndex
        };

        updateHorsePosition(suit);
    });
}

// Update DOM position based on current grid
function updateHorsePosition(suit) {
    const horse = horses[suit];

    const targetCell = document.querySelector(`.cell[data-row="${horse.position}"][data-col="${horse.colIndex}"]`);

    if (targetCell) {
        const boardRect = boardEl.getBoundingClientRect();
        const cellRect = targetCell.getBoundingClientRect();

        const top = cellRect.top - boardRect.top;
        const left = cellRect.left - boardRect.left;

        // Center logic, use offsetWidth of card if available, otherwise fallback
        const cardWidth = horse.element.offsetWidth || 70;
        const cardHeight = horse.element.offsetHeight || 100;

        const topOffset = (cellRect.height - cardHeight) / 2;
        const leftOffset = (cellRect.width - cardWidth) / 2;

        horse.element.style.top = `${top + topOffset}px`;
        horse.element.style.left = `${left + leftOffset}px`;
    }
}

// Reveal a side card
async function revealSideCard(sideCardIndex) {
    const sideCardObj = sideCards[sideCardIndex];
    sideCardObj.revealed = true;

    // Animate flip
    sideCardObj.element.style.transform = 'scale(0)';
    await new Promise(r => setTimeout(r, 150));

    // Replace element visually
    const cell = sideCardObj.element.parentElement;
    cell.innerHTML = '';
    const newCardEl = createCardElement(sideCardObj.card, false);
    sideCardObj.element = newCardEl;
    cell.appendChild(newCardEl);

    // Scale up
    newCardEl.style.transform = 'scale(0)';
    // Force reflow
    void newCardEl.offsetWidth;
    newCardEl.style.transform = 'scale(1)';

    await new Promise(r => setTimeout(r, 300));

    const suit = sideCardObj.card.suit;
    messageEl.textContent = `Side card revealed: ${suit}! ${suit} advances.`;

    // Advance the horse corresponding to the side card's suit
    horses[suit].position += 1;
    updateHorsePosition(suit);
    await new Promise(r => setTimeout(r, 600));
}

// Check game rules: win conditions and side card reveals
async function checkGameState() {
    // Check win condition first
    for (let suit of SUITS) {
        if (horses[suit].position >= 8) {
            gameOver = true;
            messageEl.textContent = `🎉 ${suit} wins! 🎉`;
            drawBtn.classList.add('hidden');
            resetBtn.classList.remove('hidden');
            return;
        }
    }

    // Find the minimum position among all horses
    let minPos = 8;
    for (let suit of SUITS) {
        if (horses[suit].position < minPos) {
            minPos = horses[suit].position;
        }
    }

    // If the slowest horse has reached or passed a row with a covered side card, flip it
    // Note: If all horses are at position 2, row 2 side card flips.
    for (let i = 0; i < sideCards.length; i++) {
        if (!sideCards[i].revealed && minPos >= sideCards[i].row) {
            await revealSideCard(i);
            // After revealing a side card, the horse moves, which might trigger a win or another reveal
            await checkGameState();
            return; // We restart the check from the top through the recursive call
        }
    }
}

// Drawing Logic
async function drawCard() {
    if (gameOver || isAnimating || deck.length === 0) return;

    isAnimating = true;
    drawBtn.disabled = true;

    // Draw top card
    const drawnCard = deck.pop();

    // Display card
    drawnCardEl.innerHTML = '';
    const newCardEl = createCardElement(drawnCard);
    drawnCardEl.appendChild(newCardEl);

    messageEl.textContent = `Drawn: ${drawnCard.value} of ${drawnCard.suit}. Moving ${drawnCard.suit}!`;

    // Move corresponding horse
    const suit = drawnCard.suit;
    horses[suit].position += 1;
    updateHorsePosition(suit);

    // Wait for animation to finish
    await new Promise(r => setTimeout(r, 600));

    // After movement, check for win or side card flips
    await checkGameState();

    if (!gameOver) {
        isAnimating = false;
        drawBtn.disabled = false;
        messageEl.textContent = 'Draw next card!';
    }
}

// Listeners
drawBtn.addEventListener('click', drawCard);
window.addEventListener('resize', () => {
    if (Object.keys(horses).length > 0) {
        Object.keys(horses).forEach(updateHorsePosition);
    }
});
document.addEventListener('DOMContentLoaded', initGame);
resetBtn.addEventListener('click', initGame);
