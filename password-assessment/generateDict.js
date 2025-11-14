import fs from 'fs';

function genPermutations() {
    const charMap = {
        'p': ['p', 'P'],
        'a': ['a', 'A', '@'],
        's': ['s', 'S', '5'],
        'w': ['w', 'W'],
        'o': ['o', 'O', '0'],
        'r': ['r', 'R'],
        'd': ['d', 'D']
    };

    const base = "password";
    let allPerms = [''];

    for (const char of base) {
        const variations = charMap[char];
        const newPerms = [];
        for (const perm of allPerms) {
            for (const variation of variations){
                newPerms.push(perm + variation);
            }
        }
        allPerms = newPerms;
    }
    return allPerms;
}

const permutations = genPermutations();
fs.writeFileSync('dict.txt', permutations.join('\n'));
console.log(`Generated ${permutations.length} passwords.`)