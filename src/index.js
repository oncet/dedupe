import { readdir, readFile } from "fs/promises";
import { createHash } from "crypto";

const [startingDir] = process.argv.slice(2);

const checkDirectory = async (dir, hashes = {}) => {
  console.log(`Checking dir ${dir}`);

  const dirents = await readdir(dir, { withFileTypes: true });

  const subDirs = dirents
    .filter((dirent) => !dirent.isFile())
    .map((dirent) => dirent.name + "/");

  const files = dirents
    .filter((dirent) => dirent.isFile())
    .map((dirent) => dirent.name);

  console.log(`Found ${files.length} file(s) and ${subDirs.length} sub-dir(s)`);

  for (const file of files) {
    console.log(`Checking file ${file}...`);

    const buffer = await readFile(dir + file);

    const hash = createHash("sha256").update(buffer, "binary").digest("base64");

    if (hashes.hasOwnProperty(hash)) {
      const currentHash = hashes[hash];
      const { count, files } = currentHash;

      currentHash.count = count + 1;
      currentHash.files = [...files, dir + file];
    } else {
      hashes[hash] = {
        count: 1,
        files: [dir + file],
      };
    }
  }

  for (const directory of subDirs) {
    await checkDirectory(dir + directory, hashes);
  }

  return hashes;
};

const hashes = await checkDirectory(startingDir);

const results = Object.entries(hashes).reduce((acc, hash) => {
  const [, { count, files }] = hash;
  if (count > 1) acc.push(files);
  return acc;
}, []);

results.forEach((result) => {
  console.log("Duplicated files:");
  result.forEach((file) => {
    console.log(" * " + file);
  });
});

if (!results.length) {
  console.log("No duplicated files found :D");
}
