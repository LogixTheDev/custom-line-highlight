/**
 * Yes, this was shamefully adapted from https://github.com/cliffordfajardo/highlight-line-vscode, which seems to have been abandoned. Issues had been posted about
 * the extension not respecting selection highlight, so I created this fork to fix that. It's nothing fancy, I just wanted to be able to see my text selections.
 * This extension is intended to be used with "editor.renderLineHighlight": "gutter", otherwise it's pointless. It allows you to have a separate line highlight colour.
 * 
 * TODO: Currently, I can't find a way to get the line highlight to stretch to the end of the line when there's a selection. We'd need a decoration with isWholeLine set
 * to true, but this obviously causes it to overlap the highlighted text range too, so that's a non-starter.
 * 
 * Also, yes, this code is probably super jank. I've never made a VSC extension before, nor have I used TypeScript, so excuse this mess! (Feel free to point out any heinous
 * errors I've made on the GitHub repo).
 */

'use strict';

import { commands, ExtensionContext, window, workspace, Range, Position, TextEditorDecorationType, Selection, TextEditor, DecorationOptions} from 'vscode';
import { setTimeout } from 'timers';

export class LHDecorations
{
	LHActive?: TextEditorDecorationType;
	LHFullLineActive?: TextEditorDecorationType;
	LHInactive?: TextEditorDecorationType;
	LHFullLineInactive?: TextEditorDecorationType;

	cleanup() : void
	{
		if (this.LHActive)
		{
			this.LHActive.dispose();
		}
		if (this.LHFullLineActive)
		{
			this.LHFullLineActive.dispose();
		}
		if (this.LHInactive)
		{
			this.LHInactive.dispose();
		}
		if (this.LHFullLineInactive)
		{
			this.LHFullLineInactive.dispose();
		}
	}
}

export async function activate(context: ExtensionContext)
{
    let decorations : LHDecorations = getDecorationsFromConfig();

    let lastActivePosition : Position;
	let lastSelection : Selection;

	commands.registerCommand("custom-line-highlight.activate", (decorations) =>
		{
			if (window.activeTextEditor)
			{
				updateDecorations(decorations);
			}
		});

    window.onDidChangeActiveTextEditor(() =>
	{
        try
		{
            updateDecorations(decorations);
        }
		catch (error)
		{
            console.error("window.onDidChangeActiveTextEditor() error: ", error);
        }
		finally
		{
			if (window.activeTextEditor)
			{
            	lastActivePosition = new Position(window.activeTextEditor.selection.active.line, window.activeTextEditor.selection.active.character);
				lastSelection = window.activeTextEditor.selection;
			}
        }
    });

    window.onDidChangeTextEditorSelection(() =>
	{
		try
		{
        	updateDecorations(decorations);
		}
		catch (error)
		{
			console.error("window.onDidChangeTextEditorSelection() error: ", error);
		}
		finally
		{
			if (window.activeTextEditor)
			{
            	lastSelection = window.activeTextEditor.selection;
			}
        }
    });

	window.onDidChangeActiveTextEditor(() =>
	{
		try
		{
        	updateDecorations(decorations);
		}
		catch (error)
		{
			console.error("window.onDidChangeActiveTextEditor() error: ", error);
		}
		finally
		{
			if (window.activeTextEditor)
			{
            	lastActivePosition = new Position(window.activeTextEditor.selection.active.line, window.activeTextEditor.selection.active.character);
				lastSelection = window.activeTextEditor.selection;
			}
        }
	});

	/**
	 * Clears decorations for each of the TextEditorDecorationTypes.
	 * @param editor The editor for which to clear the decorations.
	 * @param decorations The decoration collection to use for clearing. All of the decorations will be cleared, regardless of whether they were used.
	 */
	function clearDecorations(editor: TextEditor, decorations: LHDecorations)
	{
		editor.setDecorations(decorations.LHActive!, []);
		editor.setDecorations(decorations.LHFullLineActive!, []);
		editor.setDecorations(decorations.LHInactive!, []);
		editor.setDecorations(decorations.LHFullLineInactive!, []);
	}

	/**
	 * Calls clearDecorations(), then determines the correct decoration to use (based on whether the given editor is the active one, and whether fullLine is true or false), and
	 * sets the decorations accordingly.
	 * @param pEditor The editor for which to set the decorations.
	 * @param pDecorations The decoration collection to use.
	 * @param pFullLine Whether the full-line highlight should be used (if true), or the partial line highlight should be used (if false).
	 * @param pRangesOrOptions The ranges/options to pass to the 2nd parameter of editor.setDecorations().
	 */
	function useDecorations(pEditor: TextEditor, pDecorations: LHDecorations, pFullLine: boolean, pRangesOrOptions: readonly Range[] | readonly DecorationOptions[])
	{
		const active = pEditor === window.activeTextEditor;

		clearDecorations(pEditor, decorations);
		if (active)
		{
			pEditor.setDecorations(pFullLine ? pDecorations.LHFullLineActive! : pDecorations.LHActive!, pRangesOrOptions);
		}
		else
		{
			pEditor.setDecorations(pFullLine ? pDecorations.LHFullLineInactive! : pDecorations.LHInactive!, pRangesOrOptions);
		}
	}

	/**
	 * Uses the decorations for a full-line highlight.
	 * @param pEditor The editor for which to set the decorations.
	 * @param pDecorations The decoration collection to use.
	 */
	function useDecorationsForFullLine(pEditor: TextEditor, pDecorations: LHDecorations)
	{
		const fullLineDecoration : DecorationOptions = { range: new Range(pEditor.selection.start, pEditor.selection.end) };
							
		useDecorations(pEditor, pDecorations, true, [fullLineDecoration]);
	}

	/**
	 * Uses the decorations for a partial line highlight, avoiding the selection.
	 * @param pEditor The editor for which to set the decorations.
	 * @param pDecorations The decoration collection to use.
	 */
	function useDecorationsForSelection(pEditor: TextEditor, pDecorations: LHDecorations)
	{
		const line = pEditor.selection.start.line;

		// Create a line highlight decoration before the selection
		const startOfLine = new Position(line, 0);
		const startOfSelection = new Position(line, pEditor.selection.start.character);
		const newDecoration1 = { range: new Range(startOfLine, startOfSelection) };

		// TODO: Create a line highlight decoration after the selection
		// NOTE: Currently does not work because OF COURSE mimicking the isWholeLine beahviour couldn't just be simple... MICROSOFT! (Please fix this!)
		/*
		const endOfSelection = selection.end;
		const endOfLine = editor.document.lineAt(line).range.end; // TRON reference?
		const newDecoration2 = { range: new Range(endOfSelection, endOfLine }; // new Position(endOfLine.line, Number.MAX_SAFE_INTEGER))
		*/

		useDecorations(pEditor, pDecorations, false, [newDecoration1]);
	}

	/**
	 * Updates the decorations automagically.
	 * @param pDecorations The decoration collection to use.
	 * @param pForce Whether to just force-update all visible editors. Defaults to false.
	 */
    function updateDecorations(pDecorations : LHDecorations, pForce : boolean = false)
	{
        try
		{
			window.visibleTextEditors.forEach((editor) =>
			{
				const currentPosition = editor.selection.active;
				const editorHasChangedLines = lastActivePosition.line !== currentPosition.line;
				const isNewEditor = window.activeTextEditor && window.activeTextEditor.document.lineCount === 1 && lastActivePosition.line === 0 && lastActivePosition.character === 0;
				const editorHasChangedSelection = editor.selection !== lastSelection;
				
				if(pForce || (editorHasChangedLines || editorHasChangedSelection || isNewEditor))
				{
					const selection = editor.selection;

					if (selection && !selection.isSingleLine)
					{
						clearDecorations(editor, pDecorations);
						return;
					}

					if (selection && !selection.isEmpty)
					{
						useDecorationsForSelection(editor, pDecorations);
					}
					else
					{
						useDecorationsForFullLine(editor, pDecorations);
					}
				}
			});
		}
        catch (error)
		{
            console.error("updateDecorations() error: ", error);
        }
		finally
		{
			if (window.activeTextEditor)
			{
            	lastActivePosition = new Position(window.activeTextEditor.selection.active.line, window.activeTextEditor.selection.active.character);
				lastSelection = window.activeTextEditor.selection;
			}
        }
    }

    workspace.onDidChangeConfiguration(() =>
	{
        decorations.cleanup();
        decorations = getDecorationsFromConfig();

        updateDecorations(decorations, true);
    });
	
	updateDecorations(decorations, true);
}

//UTILITIES
function getDecorationsFromConfig() : LHDecorations
{
    const config = workspace.getConfiguration("customLineHighlight");

    const lineHighlightColourActive = config.get("lineHighlightColourActive");
    const lineHighlightColourInactive = config.get("lineHighlightColourInactive");
    const borderHeight = config.get("borderHeight");

	const decorations = new LHDecorations();

	decorations.LHActive = window.createTextEditorDecorationType({
			isWholeLine: false,
			borderWidth: `0 0 ${borderHeight} 0`,
			borderStyle: `solid`,
			borderColor: `${lineHighlightColourActive}`,
		});
	decorations.LHFullLineActive = window.createTextEditorDecorationType({
			isWholeLine: true,
			borderWidth: `0 0 ${borderHeight} 0`,
			borderStyle: `solid`,
			borderColor: `${lineHighlightColourActive}`,
		});
	decorations.LHInactive = window.createTextEditorDecorationType({
			isWholeLine: false,
			borderWidth: `0 0 ${borderHeight} 0`,
			borderStyle: `solid`,
			borderColor: `${lineHighlightColourInactive}`,
		});
	decorations.LHFullLineInactive = window.createTextEditorDecorationType({
			isWholeLine: true,
			borderWidth: `0 0 ${borderHeight} 0`,
			borderStyle: `solid`,
			borderColor: `${lineHighlightColourInactive}`,
		});

    return decorations;
}

export function deactivate()
{
}