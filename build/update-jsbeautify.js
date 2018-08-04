/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

var path = require('path');
var fs = require('fs');

function getVersion(moduleName) {
    var packageJSONPath = path.join(__dirname, '..', 'node_modules', moduleName, 'package.json');
    return readFile(packageJSONPath).then(function (content) {
        try {
            return JSON.parse(content).version;
        } catch (e) {
            return Promise.resolve(null);
        }
    });
}

function readFile(path) {
    return new Promise((s, e) => {
        fs.readFile(path, (err, res) => {
            if (err) {
                e(err);
            } else {
                s(res.toString());
            }
        })
    });

}

function update(moduleName, repoPath, dest, addHeader, patch) {
    var contentPath = path.join(__dirname, '..', 'node_modules', moduleName, repoPath);
    console.log('Reading from ' + contentPath);
    return readFile(contentPath).then(function (content) {
        return getVersion(moduleName).then(function (version) {
            let header = '';
            if (addHeader) {
                header = '// copied from js-beautify/' + repoPath + '\n';
                if (version) {
                    header += '// version: ' + version + '\n';
                }
            }
            try {
                if (patch) {
                    content = patch(content);
                }
                fs.writeFileSync(dest, header + content);
                if (version) {
                    console.log('Updated ' + path.basename(dest) + ' (' + version + ')');
                } else {
                    console.log('Updated ' + path.basename(dest));
                }
            } catch (e) {
                console.error(e);
            }
        });

    }, console.error);
}

update('js-beautify', 'LICENSE', './src/beautify/beautify-license');

update('js-beautify', 'js/lib/beautifier.js', './src/beautify/beautifier.js', true);

// ESM version
update('js-beautify', 'js/lib/beautifier.js', './src/beautify/esm/beautifier.js', true, function (contents) {
    contents = 'var local_beautifier = \n' + contents.substring(
        contents.indexOf('return') + 'return'.length,
        contents.indexOf('/******/ ]);') + '/******/ ]);'.length);
    contents = contents + `
export const beautifier = local_beautifier;
export function html_beautify(html_source, options) {
    return local_beautifier.html(html_source, options, function js_beautify(js_source_text, options) {
        // no js formatting
        return js_source_text;
    });
}
`;

    contents = contents + `
export function css_beautify(css_source, options) {
    return local_beautifier.css(css_source, options);
}
`;

    return contents;
});
