// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cheerio from 'cheerio';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    vscode.commands.registerCommand('mdnDocs.showMdnDocs', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const cursorPosition = editor.selection.start;
        const wordRange = editor.document.getWordRangeAtPosition(cursorPosition);
        const text = editor.document.getText(wordRange);

        const response = await fetch('https://api.duckduckgo.com/?format=json&q=!+site%3Adeveloper.mozilla.org+' + text);
        const responseUrl = response.url;
        const config = vscode.workspace.getConfiguration();
        const shouldOpenInBrowser = config.get('mdnDocs.openInBrowser');
        if (shouldOpenInBrowser) {
            vscode.env.openExternal(vscode.Uri.parse(responseUrl));
            return;
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const $article = $('article');
        $article.find('.play-sample').remove();
        $article.find('.sample-code-frame').remove();
        $article.find('.code-example').parents().find('h1,h2,h3,h4,h5,h6').filter((i, el) => {
            return $(el).text().trim().toLowerCase() === 'result';
        }).remove();
        $article.find('aside.metadata').remove();
        $article.find('a').each((i, el) => {
            const $el = $(el);
            const href = $el.attr('href');
            if (href && href.startsWith('/')) {
                $el.attr('href', `https://developer.mozilla.org${href}`);
            } else if (href && href.startsWith('#')) {
                $el.attr('href', `${responseUrl}${href}`);
            } else if (href && href.startsWith('http')) {
                $el.attr('target', '_blank');
            } else {
                $el.removeAttr('href');
            }
        });
        const articleHtml = $article.length && $article.html();
        if (articleHtml) {
            const panel = vscode.window.createWebviewPanel(
                'mdnDocs',
                `MDN Docs: ${text}`,
                vscode.ViewColumn.Two,
                {}
            );
            panel.webview.html = `
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>MDN Docs</title>
                <style>
                .token.boolean, .token.char, .token.constant, .token.deleted, .token.number, .token.string, .token.symbol, .token.tag {
                    color: #00d061;
                }
                .token.keyword {
                    color: #c1cff1;
                }
                .token.attr-name, .token.builtin, .token.inserted, .token.selector, .token.property, .token.class-name, .token.function {
                    color: #ff97a0;
                }
                .token.comment, .token.prolog, .token.doctype, .token.cdatam, .token.punctuation {
                    color: #b3b3b3;
                }
                .token.important, .token.bold {
                    font-weight: bold;
                }
                .token.italic {
                    font-style: italic;
                }
                .token.entity {
                    cursor: help;
                }
                pre {
                    background-color: #343434;
                    border: 1px solid transparent;
                    margin: 1rem 0 2rem;
                    padding: 1rem 2.5rem 1rem 1rem;
                    overflow: auto;
                    border-top: none;
                    border-top-left-radius: 0;
                    border-top-right-radius: 0;
                    border-bottom-left-radius: 0.25rem;
                    border-bottom-right-radius: 0.25rem;
                    margin-top: 0;
                }
                .code-example > pre {
                    --vscode-textPreformat-background: transparent !important;
                    --vscode-textPreformat-foreground: #ffffff !important;
                }

                pre > code {
                    padding: 0 !important;
                }

                .example-header {
                    align-items: baseline;
                    background-color: #313131;
                    border-bottom: 1px solid #696969;
                    border-top-left-radius: 0.25rem;
                    border-top-right-radius: 0.25rem;
                    gap: 1rem;
                    margin: 0;
                    padding: .1rem 1rem;
                }

                .example-header > .language-name {
                    text-transform: uppercase;
                    text-decoration: bold;
                }

                </style>
              </head>
              <body>
                ${articleHtml}
              </body>
            </html>
            `;
        } else {
            vscode.window.showErrorMessage(`No MDN Docs found for "${text}"`);
        }
    });
}

// This method is called when your extension is deactivated
export function deactivate() {}
