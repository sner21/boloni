/**
 * 检查源码文件行数和人工命名长度，避免文件过大或名称过长。
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

// 需要检查的源码根目录。
const src = path.join(process.cwd(), "src");
// 单个源码文件允许的最大行数。
const maxLines = 1000;
// 用于提取常见声明名称的正则表达式。
const wordPattern = /\b(?:function|const|let|class|type|interface)\s+([A-Za-z][A-Za-z0-9]*)/g;

/**
 * 递归列出目录下的 TypeScript 源文件。
 *
 * @param dir 要扫描的目录。
 * @returns 源文件绝对路径列表。
 */
async function listFiles(dir: string): Promise<string[]> {
  // 当前目录条目。
  const entries = await readdir(dir, { withFileTypes: true });
  // 当前目录及子目录中的 TypeScript 文件。
  const files = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return listFiles(full);
      return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
    }),
  );
  return files.flat();
}

/**
 * 把 camelCase、kebab-case 或 snake_case 名称拆成语义词。
 *
 * @param name 待检查的名称。
 * @returns 拆分后的词列表。
 */
function words(name: string) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * 执行代码形状检查，检查失败时退出进程。
 */
async function main() {
  // 待检查文件列表。
  const files = await listFiles(src);
  // 收集到的检查错误。
  const errors: string[] = [];

  for (const file of files) {
    // 当前文件源码文本。
    const text = await readFile(file, "utf8");
    // 当前文件行数。
    const lines = text.split(/\r?\n/).length;
    if (lines > maxLines) errors.push(`${file} 有 ${lines} 行`);

    for (const match of text.matchAll(wordPattern)) {
      // 被检查的声明名称。
      const name = match[1];
      if (name.startsWith("__")) continue;
      if (words(name).length > 4) errors.push(`${file} 存在过长命名 ${name}`);
    }
  }

  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log(`代码形状检查通过：已检查 ${files.length} 个文件。`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
