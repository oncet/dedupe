import { readdir, readFile } from "fs/promises";
import { createHash } from "crypto";

const [startingDir] = process.argv.slice(2);

const dirents = await readdir(startingDir, { withFileTypes: true });

const files = dirents
  .filter((dirent) => dirent.isFile())
  .map((dirent) => dirent.name);

const hashes = {};

for (const file of files) {
  const buffer = await readFile(startingDir + file);

  const hash = createHash("sha256").update(buffer, "binary").digest("base64");

  if (hashes.hasOwnProperty(hash)) {
    const currentHash = hashes[hash];
    const { count, files } = currentHash;

    currentHash.count = count + 1;
    currentHash.files = [...files, startingDir + file];
  } else {
    hashes[hash] = {
      count: 1,
      files: [startingDir + file],
    };
  }
}

console.log(hashes);
