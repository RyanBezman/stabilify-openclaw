#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const FEATURE_DOC_HEADINGS = [
  "## Goal",
  "## Policy Rules",
  "## Data Contracts",
  "## UX States",
  "## Analytics",
  "## QA",
];
const FEATURE_DOC_DIRS = ["docs/product", "docs/implementation"];
const FEATURE_DOC_EXCLUDES = new Set(["docs/product/change-log.md"]);
const REFERENCE_FILES = ["AGENTS.md", "docs/README.md"];
const AGENTS_MAX_LINES = 220;

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function resolveFromRoot(relativePath) {
  return path.join(ROOT, relativePath);
}

function existsFile(relativePath) {
  try {
    return fs.statSync(resolveFromRoot(relativePath)).isFile();
  } catch {
    return false;
  }
}

function existsDirectory(relativePath) {
  try {
    return fs.statSync(resolveFromRoot(relativePath)).isDirectory();
  } catch {
    return false;
  }
}

function readFile(relativePath) {
  return fs.readFileSync(resolveFromRoot(relativePath), "utf8");
}

function listMarkdownFiles(relativeDir) {
  const files = [];

  function walk(currentRelativeDir) {
    if (!existsDirectory(currentRelativeDir)) {
      return;
    }

    const entries = fs.readdirSync(resolveFromRoot(currentRelativeDir), { withFileTypes: true });
    for (const entry of entries) {
      const entryRelativePath = toPosixPath(path.join(currentRelativeDir, entry.name));
      if (entry.isDirectory()) {
        walk(entryRelativePath);
        continue;
      }
      if (entry.isFile() && path.extname(entry.name) === ".md") {
        files.push(entryRelativePath);
      }
    }
  }

  walk(relativeDir);
  return files;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectDocReferences(content) {
  const matches = content.match(/`[^`]+`/g) ?? [];
  const references = [];

  for (const match of matches) {
    const token = match.slice(1, -1).trim();
    if (token === "AGENTS.md" || token.startsWith("docs/")) {
      references.push(token);
    }
  }

  return references;
}

function validateReference(sourceFile, reference, violations) {
  if (reference.includes("*")) {
    const wildcardBase = reference.slice(0, reference.indexOf("*")).replace(/\/$/, "");
    if (!wildcardBase || (!existsDirectory(wildcardBase) && !existsFile(wildcardBase))) {
      violations.push(`${sourceFile}: broken wildcard reference \`${reference}\``);
    }
    return;
  }

  const normalized = reference.replace(/\/$/, "");
  if (!existsFile(normalized) && !existsDirectory(normalized)) {
    violations.push(`${sourceFile}: missing reference target \`${reference}\``);
  }
}

function lintLegibility() {
  const violations = [];

  if (!existsFile("AGENTS.md")) {
    violations.push("AGENTS.md: file missing.");
  } else {
    const agentsContent = readFile("AGENTS.md");
    const agentsLines = agentsContent.split(/\r?\n/).length;

    if (agentsLines > AGENTS_MAX_LINES) {
      violations.push(
        `AGENTS.md: ${agentsLines} lines. Keep AGENTS concise (<= ${AGENTS_MAX_LINES} lines) and move detail to docs.`,
      );
    }

    if (!/^## Decision Table$/m.test(agentsContent)) {
      violations.push("AGENTS.md: missing `## Decision Table` heading.");
    }
    if (!/^## Source Hierarchy$/m.test(agentsContent)) {
      violations.push("AGENTS.md: missing `## Source Hierarchy` heading.");
    }
  }

  for (const referenceFile of REFERENCE_FILES) {
    if (!existsFile(referenceFile)) {
      violations.push(`${referenceFile}: file missing.`);
      continue;
    }

    const content = readFile(referenceFile);
    const uniqueReferences = new Set(collectDocReferences(content));
    for (const reference of uniqueReferences) {
      validateReference(referenceFile, reference, violations);
    }
  }

  const featureDocs = FEATURE_DOC_DIRS.flatMap((dir) => listMarkdownFiles(dir));
  for (const relativePath of featureDocs) {
    if (FEATURE_DOC_EXCLUDES.has(relativePath)) {
      continue;
    }

    const content = readFile(relativePath);
    const missingHeadings = FEATURE_DOC_HEADINGS.filter((heading) => {
      const headingRegex = new RegExp(`^${escapeRegex(heading)}$`, "m");
      return !headingRegex.test(content);
    });

    if (missingHeadings.length > 0) {
      violations.push(`${relativePath}: missing required headings: ${missingHeadings.join(", ")}`);
    }
  }

  violations.sort((a, b) => a.localeCompare(b));

  if (violations.length === 0) {
    console.log("Legibility lint passed.");
    return 0;
  }

  console.error(`Legibility lint found ${violations.length} issue(s):`);
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  return 1;
}

process.exitCode = lintLegibility();
