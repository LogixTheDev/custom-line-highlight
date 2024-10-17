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

import { commands, ExtensionContext, window, workspace, Range, Position, TextEditorDecorationType, Selection} from 'vscode';
import { setTimeout } from 'timers';

export async function activate(context: ExtensionContext)
{
    let decorationType = getDecorationTypeFromConfig();
    let decorationTypeWholeLine = getDecorationTypeWholeLineFromConfig();
    let activeEditor = window.activeTextEditor;
    let lastActivePosition : Position;
	let lastSelection : Selection;

    window.onDidChangeActiveTextEditor(() =>
	{
        try
		{
            activeEditor = window.activeTextEditor;
            updateDecorations(decorationType, decorationTypeWholeLine);
        }
		catch (error)
		{
            console.error("Error from ' window.onDidChangeActiveTextEditor' -->", error);
        }
		finally
		{
			if (activeEditor)
			{
            	lastActivePosition = new Position(activeEditor.selection.active.line, activeEditor.selection.active.character);
			}
        }
    });

    window.onDidChangeTextEditorSelection(() =>
	{
        updateDecorations(decorationType, decorationTypeWholeLine);
    });

	window.onDidChangeActiveTextEditor(() =>
	{
		activeEditor = window.activeTextEditor;
		updateDecorations(decorationType, decorationTypeWholeLine, true);
	});

    function updateDecorations(decorationType : TextEditorDecorationType, decorationTypeWholeLine : TextEditorDecorationType, updateAllVisibleEditors : boolean = false)
	{
        try
		{
            if (updateAllVisibleEditors)
			{
                window.visibleTextEditors.forEach((editor) =>
				{
					const selection = editor.selection;
					if (selection && selection.isEmpty)
					{
						const currentPosition = editor.selection.active;
						const newDecoration = { range: new Range(currentPosition, currentPosition) };
						editor.setDecorations(decorationType, [newDecoration]);
					}
					else
					{
						editor.setDecorations(decorationType, []);
					}
                });
            }
            else
			{
                window.visibleTextEditors.forEach((editor) =>
				{
                    if(editor !== window.activeTextEditor) 
					{
						return;
					}
                    
                    const currentPosition = editor.selection.active;
                    const editorHasChangedLines = lastActivePosition.line !== currentPosition.line;
                    const isNewEditor = activeEditor && activeEditor.document.lineCount === 1 && lastActivePosition.line === 0 && lastActivePosition.character === 0;
					const editorHasChangedSelection = editor.selection !== lastSelection;
                    
                    if(editorHasChangedLines || editorHasChangedSelection || isNewEditor)
					{
						const selection = editor.selection;

						if (selection && !selection.isSingleLine)
						{
							editor.setDecorations(decorationTypeWholeLine, []);
							editor.setDecorations(decorationType, []);
							return;
						}

						if (selection && !selection.isEmpty)
						{
							const line = selection.start.line;

							// Create a line highlight decoration before the selection
							const startOfLine = new Position(line, 0);
							const startOfSelection = new Position(line, selection.start.character);
							const newDecoration1 = { range: new Range(startOfLine, startOfSelection) };

							// TODO: Create a line highlight decoration after the selection
							// NOTE: Currently does not work because OF COURSE mimicking the isWholeLine beahviour couldn't just be simple... MICROSOFT! (Please fix this!)
							/*
							const endOfSelection = selection.end;
							const endOfLine = editor.document.lineAt(line).range.end; // TRON reference?
							const newDecoration2 = { range: new Range(endOfSelection, endOfLine }; // new Position(endOfLine.line, Number.MAX_SAFE_INTEGER))
							*/

							editor.setDecorations(decorationTypeWholeLine, []);
							editor.setDecorations(decorationType, [newDecoration1]);
						}
						else
						{
							const fullLineDecoration = { range: new Range(selection.start, selection.end) };
								
							editor.setDecorations(decorationType, []);
							editor.setDecorations(decorationTypeWholeLine, [fullLineDecoration]);
						}
                    }
                });
            }
        }
        catch (error)
		{
            console.error("Error from ' updateDecorations' -->", error);
        }
		finally
		{
			if (activeEditor)
			{
            	lastActivePosition = new Position(activeEditor.selection.active.line, activeEditor.selection.active.character);
				lastSelection = activeEditor.selection;
			}
        }
    }

    workspace.onDidChangeConfiguration(() =>
	{
        decorationType.dispose();
        decorationTypeWholeLine.dispose();
        decorationType = getDecorationTypeFromConfig();
        decorationTypeWholeLine = getDecorationTypeWholeLineFromConfig();
        updateDecorations(decorationType, decorationTypeWholeLine, true);
    });

	if (activeEditor)
	{
        updateDecorations(decorationType, decorationTypeWholeLine, true);
    }
}

//UTILITIES
function getDecorationTypeFromConfig()
{
    const config = workspace.getConfiguration("customLineHighlight");
    const borderColor = config.get("borderColour");
    const borderHeight = config.get("borderHeight");
    const decorationType = window.createTextEditorDecorationType(
		{
			isWholeLine: false,
			borderWidth: `0 0 ${borderHeight} 0`,
			borderStyle: `solid`,
			borderColor: `${borderColor}`,
		});
    return decorationType;
}

function getDecorationTypeWholeLineFromConfig()
{
	const config = workspace.getConfiguration("customLineHighlight");
    const borderColor = config.get("borderColour");
    const borderHeight = config.get("borderHeight");
    const decorationType = window.createTextEditorDecorationType(
		{
			isWholeLine: true,
			borderWidth: `0 0 ${borderHeight} 0`,
			borderStyle: `solid`,
			borderColor: `${borderColor}`,
		});
    return decorationType;
}

export function deactivate()
{
}