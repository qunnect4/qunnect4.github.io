/*!

   Copyright 2023 Avery Yang

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

*/

const OPEN_STATE_CLASS = 'open'
const PLACED_STATE_CLASS = 'placed'
const MEASURABLE_STATE_CLASS = 'measurable'
const COLLAPSED_STATE_CLASS = 'collapsed'

const BOTTOM_CLASS = 'bottom'
const DISABLED_CLASS = 'disabled'
const DONE_CLASS = 'done'

const RED_CLASS = 'red'
const BLUE_CLASS = 'blue'
const WIN_CLASS = 'win'

const BOARD_WIDTH = 7
const BOARD_HEIGHT = 6
const WIN_SEQ_LENGTH = 4

const messageBoard = document.getElementById('messageBoard')
const messageText = document.getElementById('messageText')
const slots = document.querySelectorAll('[data-slot]')
const cells = document.querySelectorAll('[data-cell]')
const restartButton = document.getElementById('restartButton')

let isPlayerRed = false
let placement = 1

startGame()

restartButton.addEventListener('click', startGame)

function startGame() {
	placement = 1
	initCells()
	initSlots()
	initMessage()
}

/***************************
 * functions about message
 * 
 */

function initMessage() {
	displayNextPlayerMessage()
}

// This should not be called before switchPlayer() is called
function displayNextPlayerMessage() {
	const player = currentPlayer()
	let msg = player + ': select a <img src="images/arrow.png" class="arrow" > to drop a token'
	if (isMeasurable()) {
		msg = player + ': select a <img src="images/yinyang_color.png" class="yinyang" > to measure'
		if (isPlaceable()) {
			msg = player + ': select a <img src="images/arrow.png" class="arrow" > to drop a token '
				+ 'or press a <img src="images/yinyang_color.png" class="yinyang" > to measure'
		}
	} 
	setMessageHTML(msg)
	setMessageColor()
}

function displaySecondTokenMessage() {
	const player = currentPlayer()
	const msg = player + ': select a <img src="images/arrow.png" class="arrow" > to drop the entangled token'
	setMessageHTML(msg)
}

function displayPlayerWinMessage(color) {
	const winner = currentPlayer()
	const msg = winner + ' won!'
	setMessageHTML(msg)
	setMessageColor(color)
}

function displayOpponentWinMessage(color) {
	const winner = opponent()
	const msg = winner + ' won!'
	setMessageHTML(msg)
	setMessageColor(color)
}

function displayTieMessage() {
	setMessageHTML("It's a tie")
	clearMessageColor()
}

function setMessageColor(color=null) {
	setElementColor(messageBoard, color)
}

function clearMessageColor() {
	clearElementColor(messageBoard)
}

function setMessageHTML(info) {
	messageBoard.innerHTML = info
}

function isMeasurable() {
	return [...cells].some(cell => {
		if (cell.classList.contains(MEASURABLE_STATE_CLASS)) {
			return true
		}
	})
}

function isPlaceable() {
	return [...cells].some(cell => {
		if (cell.classList.contains(OPEN_STATE_CLASS)) {
			return true
		}
	})
}

/***************************
 * functions about slots
 * 
 */

function initSlots() {
	slots.forEach(slot => {
		clearSlotColor(slot)
		deactivateSlot(slot)
		slot.classList.remove(DISABLED_CLASS)
		slot.classList.remove(DONE_CLASS)
		activateSlot(slot)
	})
}

function handleSlotHoverOn(e) {
	const slot = e.target
	setSlotColor(slot)

	const column = locateSlot(slot)
	const cell = bottomOpenCell(column)
	markBottomCell(cell)
}

function handleSlotHoverOff(e) {
	const slot = e.target
	clearSlotColor(slot)

	const column = locateSlot(slot)
	const cell = bottomOpenCell(column)
	clearBottomCell(cell)
}

function handleSlotClick(e) {
	const slot = e.target	
	slot.removeEventListener('click', handleSlotClick)

	const column = locateSlot(slot)
	const cell = bottomOpenCell(column)
	markPlacedCell(cell)
	markMeasurableCells(cell)

	if (!isBothTokenPlaced()) {
		disableMeasurableCells()
		displaySecondTokenMessage()
	} else {
		switchPlayer()
		nextPlacement()
		enableMeasurableCells()
		displayNextPlayerMessage()
	}

	if (isWholeColumnFilled(column)) {
		disableSlot(slot)
	} else {
		slot.addEventListener('click', handleSlotClick, { once: true })
	}
}

function locateSlot(slot) {
	for (let i = 0; i < BOARD_WIDTH; i++) {
		if (slots[i] === slot) {
			return i
		}
	}
	// should not happen
	return -1
}

function setSlotColor(slot) {
	setElementColor(slot)
}

function clearSlotColor(slot) {
	clearElementColor(slot)
}

function disableSlot(slot) {
	clearSlotColor(slot)
	deactivateSlot(slot)
	slot.classList.add(DISABLED_CLASS)
}

function deactivateSlot(slot) {
	slot.removeEventListener('mouseenter', handleSlotHoverOn)
	slot.removeEventListener('mouseleave', handleSlotHoverOff)
	slot.removeEventListener('click', handleSlotClick)
}

function activateSlot(slot) {
	slot.addEventListener('mouseenter', handleSlotHoverOn)
	slot.addEventListener('mouseleave', handleSlotHoverOff)
	slot.addEventListener('click', handleSlotClick, { once: true })
}

/***************************
 * cell functions triggered by slot
 * 
 */

function bottomOpenCell(column) {
	for (let row = 0; row < BOARD_HEIGHT; row++) {
		let index = row * BOARD_WIDTH + column
		let cell = cells[index]
		if (!(cell.classList.contains(OPEN_STATE_CLASS))) {
			return getCellByPosition(row - 1 , column)
		}
	}
	return getCellByPosition(BOARD_HEIGHT - 1 , column)
}

function markBottomCell(cell) {
	cell.classList.add(BOTTOM_CLASS)
	setCellText(cell, placementToText(placement))
}

function clearBottomCell(cell) {
	cell.classList.remove(BOTTOM_CLASS)
	clearCellText(cell)
}

function markPlacedCell(cell) {
	cell.classList.remove(BOTTOM_CLASS)
	setCellState(cell, PLACED_STATE_CLASS)
	setCellPlacement(cell, placement)
	setCellText(cell, placementToText(placement))
}

function markMeasurableCells(cell) {
	const [row, column] = locateCell(cell)
	markMeasurableColumn(column)
	markMeasurableRow(row)
}

function markMeasurableColumn(column) {
	// mark a column only if the whole column is full
	if (isWholeColumnFilled(column)) {
		for (let rowToCheck = 0; rowToCheck < BOARD_HEIGHT; rowToCheck++) {
			let cellToCheck = getCellByPosition(rowToCheck, column)
			if (cellToCheck.classList.contains(PLACED_STATE_CLASS)) {
				setCellState(cellToCheck, MEASURABLE_STATE_CLASS)
			}
		}
	}
}

function markMeasurableRow(row) {
	// mark a row only if the whole row is full
	if (isWholeRowFilled(row)) {
		for (let columnToCheck = 0; columnToCheck < BOARD_WIDTH; columnToCheck++) {
			let cellToCheck = getCellByPosition(row, columnToCheck)
			if (cellToCheck.classList.contains(PLACED_STATE_CLASS)) {
				setCellState(cellToCheck, MEASURABLE_STATE_CLASS)

			}
		}
	}
}

function isWholeColumnFilled(column) {
	for (let row = 0; row < BOARD_HEIGHT; row++) {
		let cellToCheck = getCellByPosition(row, column)
		if (cellToCheck.classList.contains(OPEN_STATE_CLASS)) {
			return false
		}
	}
	return true
}

function isWholeRowFilled(row) {
	for (let column = 0; column < BOARD_WIDTH; column++) {
		let cellToCheck = getCellByPosition(row, column)
		if (cellToCheck.classList.contains(OPEN_STATE_CLASS)) {
			return false
		}
	}
	return true
}

function isBothTokenPlaced() {
	let count = 0 
	cells.forEach(cell => {
		if (cell.classList.contains(OPEN_STATE_CLASS)) {
			count ++
		}
	})
	if (count % 2 == 0) {
		return true
	}
	return false
}

function disableMeasurableCells() {
	cells.forEach(cell => {
		if (cell.classList.contains(MEASURABLE_STATE_CLASS)) {
			cell.classList.add(DISABLED_CLASS)
			deactivateCell(cell)
		}
	})
}

function enableMeasurableCells() {
	cells.forEach(cell => {
		if (cell.classList.contains(MEASURABLE_STATE_CLASS)) {
			cell.classList.remove(DISABLED_CLASS)
			activateCell(cell)
		}
	})
}

/***************************
 * functions about cells
 * 
 */

function initCells() {
	cells.forEach(cell => {
		cell.classList.remove(DONE_CLASS)
		cell.classList.remove(DISABLED_CLASS)
		cell.classList.remove(WIN_CLASS)
		cell.classList.remove(BOTTOM_CLASS)
		setCellState(cell, OPEN_STATE_CLASS)
		clearCellColor(cell)
		clearCellText(cell)
		cell.placement = 0
		deactivateCell(cell)
	})
}

function locateCell(cell) {
	for (let row = 0; row < BOARD_HEIGHT; row++) {
		for (let column = 0; column < BOARD_WIDTH; column++) {
			let cellToCheck = getCellByPosition(row, column)
			if (cellToCheck == cell) {
				return [row, column]
			}
		}
	}
	// should not happen
	return [-1, -1]
}

function getCellByPosition(row, col) {
	let i = row * BOARD_WIDTH + col
	let cell = cells[i]
	return cell
}

function setCellState(cell, state) {
	cell.classList.remove(OPEN_STATE_CLASS)
	cell.classList.remove(PLACED_STATE_CLASS)
	cell.classList.remove(MEASURABLE_STATE_CLASS)
	cell.classList.remove(COLLAPSED_STATE_CLASS)
	cell.classList.add(state)
}

function setCellText(cell, info) {
	cell.innerText = info
}

function clearCellText(cell) {
	cell.innerText = ''
}

function setCellColor(cell, color = null) {
	setElementColor(cell, color)
}

function clearCellColor(cell) {
	clearElementColor(cell)
}

function setCellPlacement(cell, placement) {
	cell.placement = placement
}

function clearCellPlacement(cell) {
	cell.placement = 0
}

function deactivateCell(cell) {
	cell.removeEventListener('mouseenter', handleCellHoverOn)
	cell.removeEventListener('mouseleave', handleCellHoverOff)
	cell.removeEventListener('click', handleCellClick)
}

function activateCell(cell) {
	cell.addEventListener('mouseenter', handleCellHoverOn)
	cell.addEventListener('mouseleave', handleCellHoverOff)
	cell.addEventListener('click', handleCellClick, { once: true })
}

function handleCellHoverOn(e) {
	const cell = e.target
	const entangled = getEntangled(cell)

	const [playerColor, opponentColor] = playerColors()
	setCellColor(cell, playerColor)
	clearCellText(cell)
	setCellColor(entangled, opponentColor)
	clearCellText(entangled)
}

function handleCellHoverOff(e) {
	const cell = e.target
	const entangled = getEntangled(cell)

	clearCellColor(cell)
	setCellText(cell, placementToText(cell.placement))
	clearCellColor(entangled)
	setCellText(entangled, placementToText(entangled.placement))
}

function handleCellClick(e) {
	const cell = e.target
	const entangled = getEntangled(cell)
	const [playerColor, opponentColor] = playerColors()

	deactivateCell(cell)
	clearCellText(cell)
	setCellState(cell, COLLAPSED_STATE_CLASS)
	setCellColor(cell, playerColor)

	deactivateCell(entangled)
	clearCellText(entangled)
	setCellState(entangled, COLLAPSED_STATE_CLASS)
	setCellColor(entangled, opponentColor)

	let winners = 0
	if (checkWin(playerColor, cell)) {
		winners ++
		displayPlayerWinMessage(playerColor)
	}
	if (checkWin(opponentColor, entangled)) {
		winners ++
		displayOpponentWinMessage(opponentColor)
	}
	if (winners == 2) {
		displayTieMessage()
	}

	if (winners > 0) {
		done()
	} else if (checkTie()) {
		displayTieMessage()
		done()
	} else {
		switchPlayer()
		displayNextPlayerMessage()
	}
}

function checkWin(currentClass, cell) {
	if (checkWinAlongRow(currentClass, cell) ||
		checkWinAlongColumn(currentClass, cell) || 
		checkWinAlongSlopeUp(currentClass, cell) || 
		checkWinAlongSlopeDown(currentClass, cell)) {
		return true
	}
	return false
}

function checkWinAlongRow(currentClass, cell) {
	return doCheckWin(currentClass, cell, 0, 1)
}

function checkWinAlongColumn(currentClass, cell, row, column) {
	return doCheckWin(currentClass, cell, 1, 0)
}

function checkWinAlongSlopeUp(currentClass, cell, row, column) {
	return doCheckWin(currentClass, cell, 1, 1)
}

function checkWinAlongSlopeDown(currentClass, cell, row, column) {
	return doCheckWin(currentClass, cell, 1, -1)
}

function doCheckWin(currentClass, cell, stepByRow, stepByColumn) {
	let candidates = [cell]
	const [row, column] = locateCell(cell)

	// check backward
	let rowToCheck = row
	let columnToCheck = column
	while (true) {
		rowToCheck -= stepByRow
		columnToCheck -= stepByColumn
		if ((rowToCheck < 0) || (columnToCheck < 0) || (rowToCheck >= BOARD_HEIGHT) || (columnToCheck >= BOARD_WIDTH)) {
			// out of boundary
			break
		}
		let cellToCheck = getCellByPosition(rowToCheck, columnToCheck)
		if (! cellToCheck.classList.contains(currentClass)) {
			// color not continuous
			break
		}
		candidates.push(cellToCheck)
	}

	// check forward
	rowToCheck = row
	columnToCheck = column
	while (true) {
		rowToCheck += stepByRow
		columnToCheck += stepByColumn
		if ((rowToCheck < 0) || (columnToCheck < 0) || (rowToCheck >= BOARD_HEIGHT) || (columnToCheck >= BOARD_WIDTH)) {
			// out of boundary
			break
		}
		cellToCheck = getCellByPosition(rowToCheck, columnToCheck)
		if (! cellToCheck.classList.contains(currentClass)) {
			// color not continuous
			break
		}
		candidates.push(cellToCheck)
	}

	if (candidates.length >= WIN_SEQ_LENGTH) {
		candidates.forEach(candidate => {
			candidate.classList.add(WIN_CLASS)
		})
		return true
	}
	return false
}

function checkTie() {
	return [...cells].every(cell => {
		return cell.classList.contains(RED_CLASS) || cell.classList.contains(BLUE_CLASS)
	})
}

function done() {
	cells.forEach(cell => {
		deactivateCell(cell)
		cell.classList.add(DONE_CLASS)
	})
	slots.forEach(slot => {
		deactivateSlot(slot)
		slot.classList.add(DONE_CLASS)
	})
}

function getEntangled(cell) {
	let entangled = null
	const placement = cell.placement

	cells.forEach(cellToCheck => {
		if (cellToCheck == cell) {
			return
		}
		if (cellToCheck.placement == placement) {
			entangled = cellToCheck
		}
	})

	return entangled
}

/***************************
 * functions about player, placement and others
 * 
 */
function currentPlayer() {
	if (isPlayerRed) {
		return 'Red'
	}
	return 'Blue'
}

function switchPlayer() {
	isPlayerRed = !isPlayerRed
}

function opponent() {
	if (isPlayerRed) {
		return 'Blue'
	}
	return 'Red'
}

function playerColors() {
	if (isPlayerRed) {
		return [RED_CLASS, BLUE_CLASS]
	}
	return [BLUE_CLASS, RED_CLASS]
}

function nextPlacement() {
	placement ++
}

function setElementColor(element, color = null) {
	element.classList.remove(RED_CLASS)
	element.classList.remove(BLUE_CLASS)
	if (color != null) {
		element.classList.add(color)
	}
	else if (isPlayerRed) {
		element.classList.add(RED_CLASS)
	} else {
		element.classList.add(BLUE_CLASS)
	}
}

function clearElementColor(element) {
	element.classList.remove(RED_CLASS)
	element.classList.remove(BLUE_CLASS)
}

function placementToText(placement) {
	if ((placement >0) && (placement < 26)) {
		return String.fromCharCode(placement + 912)
	}
	return ''
}
