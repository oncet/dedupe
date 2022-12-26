import { readdir, readFile, unlink } from "fs/promises";
import { createHash } from "crypto";
import prompts from "prompts";

const [startingDir] = process.argv.slice(2);

const getFiles = async (currentDir, files = []) => {
  const dirents = await readdir(currentDir, { withFileTypes: true });

  const subDirs = dirents
    .filter((dirent) => !dirent.isFile())
    .map((dirent) => dirent.name + "/");

  files.push(
    ...dirents
      .filter((dirent) => dirent.isFile())
      .map((dirent) => currentDir + dirent.name)
  );

  for (const currentSubDir of subDirs) {
    await getFiles(currentDir + currentSubDir, files);
  }

  return files;
};

const processFiles = async (files, hashes = {}) => {
  for (const file of files) {
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

const getDupes = (results) => {
  return Object.entries(results).reduce((acc, hash) => {
    const [, { count, files: filesFoo }] = hash;

    if (count > 1) acc.push(filesFoo);

    return acc;
  }, []);
};

const parseFilePath = (wslPath) => {
  const parsedPath = wslPath
    .replace("/mnt/a", "file:///A:")
    .replaceAll(" ", "%20")
    .replaceAll("(", "%28")
    .replaceAll(")", "%29");

  return parsedPath;
};

console.log("Getting complete files list...");

const files = await getFiles(startingDir);

console.log(`Processing ${files.length} file(s)...`);

const results = await processFiles(files);

console.log("Filtering duplicated files...");

const dupes = getDupes(results);

console.log(`Found ${dupes.length} duplicated file(s)!`);

for (const dupe of dupes) {
  const { fileToKeep } = await prompts({
    type: "select",
    name: "fileToKeep",
    message: "Dupe found! Which one should you keep?",
    choices: dupe.map((file) => ({
      title: parseFilePath(file),
      value: file,
    })),
  });

  if (fileToKeep) {
    const filesToDelete = dupe.filter((file) => file !== fileToKeep);

    console.log(`About to delete ${filesToDelete.length} file(s).`);

    for (const fileToDelete of filesToDelete) {
      await unlink(fileToDelete);
    }

    console.log("File(s) successfully deleted.");
  }
}
