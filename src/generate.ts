import Sheet = GoogleAppsScript.Spreadsheet.Sheet;
import { Clue, ClueDirection, CrosswordPuzzle } from "./crosswordPuzzle";

export function generateCrossword(puzzle: CrosswordPuzzle) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const ss = spreadsheet.getActiveSheet();

  // Name the crossword
  spreadsheet.setName(puzzle.name);
  ss.setName(puzzle.name);

  // Get the wider range
  const crossRange = ss.getRange(
    1,
    1,
    puzzle.dimensions.rows,
    puzzle.dimensions.cols
  );

  formatCrosswordArea(ss, puzzle.dimensions.rows, puzzle.dimensions.cols);

  const [acrossClues, downClues] = insertClueSquares(ss, puzzle.clues);

  // Build the clue text
  insertClueText(ss, acrossClues, 1, 1 + puzzle.dimensions.cols, "Across");
  insertClueText(ss, downClues, 1, 2 + puzzle.dimensions.cols, "Down");
}

function formatCrosswordArea(ss: Sheet, rows: number, cols: number) {
  const crossRange = ss.getRange(1, 1, cols, rows);
  // Resize the crossword
  ss.setColumnWidths(1, cols, 50);
  ss.setRowHeights(1, rows, 50);
  // Reformatting that affects the whole crossword
  crossRange.setBackground("black");
  crossRange.setHorizontalAlignment("center");
  crossRange.setVerticalAlignment("middle");
  crossRange.setFontSize(20);

  // Set cell borders
  // setBorder(top, left, bottom, right, vertical, horizontal)
  ss.getRange(1, 1, 1, cols).setBorder(true, null, null, null, null, null);
  ss.getRange(1, 1, rows, 1).setBorder(null, true, null, null, null, null);
  ss.getRange(rows, 1, 1, cols).setBorder(null, null, true, null, null, null);
  ss.getRange(1, cols, rows, 1).setBorder(null, null, null, true, null, null);
}

function rangeFromClue(ss: Sheet, clue: Clue) {
  if (clue.direction === ClueDirection.ACROSS) {
    return ss.getRange(
      clue.start.row + 1,
      clue.start.column + 1,
      1,
      clue.text.length
    );
  } else {
    return ss.getRange(
      clue.start.row + 1,
      clue.start.column + 1,
      clue.text.length,
      1
    );
  }
}

function insertClueSquares(ss: Sheet, entries: Clue[]) {
  // Keep track of clues for creating the clue text
  const downClues = [];
  const acrossClues = [];

  // Insert the crossword clues in the text
  for (let entry of entries) {
    let entryRange = rangeFromClue(ss, entry);
    let firstCell = entryRange.getCell(1, 1);

    if (entry.direction === ClueDirection.ACROSS) {
      acrossClues.push(entry);
    } else {
      downClues.push(entry);
    }

    // We have to combine the previous note and the current note in case this is both a
    // down and across clue
    const prevNote = firstCell.getNote();
    const newNote = entry.number + " " + entry.direction + ": " + entry.text;
    let note;
    if (prevNote.length > 0) note = prevNote + "\n\n" + newNote;
    else note = newNote;

    firstCell.setNote(note);
    firstCell.setValue(entry.number);

    entryRange.setBackground("white");
  }

  return [acrossClues, downClues];
}

function insertClueText(
  ss: Sheet,
  clues: Clue[],
  startRow: number,
  startColumn: number,
  title: string
) {
  let clueX = startColumn;
  let clueY = startRow;

  const rules = ss.getConditionalFormatRules();

  // Make the title row
  ss.getRange(clueY++, clueX)
    .setValue(title)
    .setFontWeight("bold");

  // Make the clue rows
  for (let entry of clues) {
    let clueTextRange = ss.getRange(clueY++, clueX);
    let clueSquareRange = rangeFromClue(ss, entry);

    // Add the auto-update rule
    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(
          `= COUNTBLANK(${clueSquareRange.getA1Notation()}) = 0`
        )
        .setStrikethrough(true)
        .setRanges([clueTextRange])
        .build()
    );

    clueTextRange.setValue(entry.number + ": " + entry.text);
  }
  ss.setConditionalFormatRules(rules);
  ss.autoResizeColumn(clueX);
}
