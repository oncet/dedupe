import { readdir, readFile } from "fs/promises";
import { createHash } from "crypto";

const [startingDir] = process.argv.slice(2);

const getFiles = async (currentDir, files = []) => {
  console.log(`Checking dir ${currentDir}`);

  const dirents = await readdir(currentDir, { withFileTypes: true });

  const subDirs = dirents
    .filter((dirent) => !dirent.isFile())
    .map((dirent) => dirent.name + "/");

  files.push(
    ...dirents
      .filter((dirent) => dirent.isFile())
      .map((dirent) => currentDir + dirent.name)
  );

  console.log(`Found ${files.length} file(s) and ${subDirs.length} sub-dir(s)`);

  for (const currentSubDir of subDirs) {
    await getFiles(currentDir + currentSubDir, files);
  }

  return files;
};

const processFiles = async (files, hashes = {}) => {
  for (const file of files) {
    console.log(`Checking file ${file}...`);

    const buffer = await readFile(file);

    const hash = createHash("sha256").update(buffer, "binary").digest("base64");

    if (hashes.hasOwnProperty(hash)) {
      const currentHash = hashes[hash];
      const { count, files } = currentHash;

      currentHash.count = count + 1;
      currentHash.files = [...files, file];
    } else {
      hashes[hash] = {
        count: 1,
        files: [file],
      };
    }
  }

  return hashes;
};

const files = await getFiles(startingDir);

console.log("files", files);

const results = await processFiles(files);

console.log("results", results);
