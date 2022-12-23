const path = require('path');
const fs = require('fs/promises');

async function getCWD() {
    const head = __dirname;

    while (true) {
        try {
            await fs.access(path.join(head, 'package.json'));

            return head;
        } catch {}

        head = path.dirname(head);
    }
}

async function main() {
    const cwd = getCWD();

    return require('node-gyp-build')(cwd);
}

module.exports = main;
module.exports.default = main;
