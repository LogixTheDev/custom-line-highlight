# Custom Line Highlight (Visual Studio Code Extension)

This is a simple Visual Studio Code extension, adapted from the (seemingly-abandoned) [highlight-line](https://github.com/cliffordfajardo/highlight-line-vscode) extension by [Clifford Fajardo](https://github.com/cliffordfajardo).

The adaptation aims to fix a critical problem with decorations not playing nice with selections. So far, I've been successful in restoring the selection highlight with a VERY janky work-around.

However, it's unfinished. I would like to get the line highlight to span the entire width of the editor when there is a selection, without it overlapping the selection range, and this has proven challenging thanks to the limitations arbitrarily imposed on us by Microsoft.

If anyone knows how to mimic a decoration with `isWholeLine` set to `true` (without it actually being set to `true`), please get in touch! (Post an issue if you can, I'll hopefully see it).

(Rest of the Readme coming soon<sup>TM</sup>)