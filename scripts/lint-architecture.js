#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const ROOT = process.cwd();
const SCAN_DIRS = ["screens", "lib/features"];
const FILE_EXTENSIONS = new Set([".ts", ".tsx"]);
const RESOLVE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

const RULES = {
  noSupabaseInScreens: "ARCH001",
  noCrossFeatureInternalImports: "ARCH002",
  oneWayLayers: "ARCH003",
};

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function toRelativePath(absPath) {
  return toPosixPath(path.relative(ROOT, absPath));
}

function existsFile(absPath) {
  try {
    return fs.statSync(absPath).isFile();
  } catch {
    return false;
  }
}

function walkFiles(absDir, out) {
  if (!fs.existsSync(absDir)) {
    return;
  }
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  for (const entry of entries) {
    const absEntry = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(absEntry, out);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (FILE_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(absEntry);
    }
  }
}

function collectSourceFiles() {
  const files = [];
  for (const dir of SCAN_DIRS) {
    walkFiles(path.join(ROOT, dir), files);
  }
  return files;
}

function parseImports(absFilePath) {
  const sourceText = fs.readFileSync(absFilePath, "utf8");
  const sourceFile = ts.createSourceFile(
    absFilePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    absFilePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const imports = [];

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      imports.push({
        specifier: node.moduleSpecifier.text,
        line,
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports;
}

function resolveImport(absSourceFilePath, specifier) {
  let basePath = null;

  if (specifier.startsWith(".")) {
    basePath = path.resolve(path.dirname(absSourceFilePath), specifier);
  } else if (specifier.startsWith("lib/") || specifier.startsWith("screens/")) {
    basePath = path.resolve(ROOT, specifier);
  } else {
    return null;
  }

  if (path.extname(basePath)) {
    return existsFile(basePath) ? basePath : null;
  }

  for (const ext of RESOLVE_EXTENSIONS) {
    const candidate = `${basePath}${ext}`;
    if (existsFile(candidate)) {
      return candidate;
    }
  }

  for (const ext of RESOLVE_EXTENSIONS) {
    const indexCandidate = path.join(basePath, `index${ext}`);
    if (existsFile(indexCandidate)) {
      return indexCandidate;
    }
  }

  return null;
}

function featureFromPath(relativePath) {
  const match = relativePath.match(/^lib\/features\/([^/]+)\//);
  return match ? match[1] : null;
}

function layerFromPath(relativePath) {
  if (relativePath.startsWith("screens/")) {
    return "screens";
  }

  const featureFileMatch = relativePath.match(/^lib\/features\/[^/]+\/(.+)$/);
  if (!featureFileMatch) {
    return null;
  }

  const featureSubPath = featureFileMatch[1];
  const baseName = path.basename(relativePath);

  if (featureSubPath.startsWith("hooks/") || /^use[A-Z0-9].*\.(ts|tsx)$/.test(baseName)) {
    return "hooks";
  }

  if (featureSubPath.startsWith("services/") || featureSubPath.startsWith("models/")) {
    return "services_models";
  }

  return null;
}

function isFeatureRootIndex(relativePath) {
  return /^lib\/features\/[^/]+\/index\.(ts|tsx|js|jsx|mjs|cjs)$/.test(relativePath);
}

function isSupabaseImport(specifier, resolvedRelativePath) {
  if (specifier === "@supabase/supabase-js" || specifier.startsWith("@supabase/")) {
    return true;
  }

  if (specifier === "supabase" || specifier.startsWith("supabase/")) {
    return true;
  }

  if (specifier.includes("supabase")) {
    return true;
  }

  if (!resolvedRelativePath) {
    return false;
  }

  return (
    resolvedRelativePath === "lib/supabase.ts" ||
    resolvedRelativePath === "lib/supabase.tsx" ||
    resolvedRelativePath.startsWith("supabase/")
  );
}

function formatViolation(violation) {
  return `${violation.file}:${violation.line} [${violation.rule}] ${violation.message} (import: "${violation.specifier}")`;
}

function lintArchitecture() {
  const files = collectSourceFiles();
  const violations = [];

  for (const absSourceFilePath of files) {
    const sourceRelativePath = toRelativePath(absSourceFilePath);
    const sourceFeature = featureFromPath(sourceRelativePath);
    const sourceLayer = layerFromPath(sourceRelativePath);
    const imports = parseImports(absSourceFilePath);

    for (const item of imports) {
      const resolvedImportPath = resolveImport(absSourceFilePath, item.specifier);
      const resolvedRelativePath = resolvedImportPath ? toRelativePath(resolvedImportPath) : null;
      const targetFeature = resolvedRelativePath ? featureFromPath(resolvedRelativePath) : null;
      const targetLayer = resolvedRelativePath ? layerFromPath(resolvedRelativePath) : null;

      if (sourceRelativePath.startsWith("screens/") && isSupabaseImport(item.specifier, resolvedRelativePath)) {
        violations.push({
          rule: RULES.noSupabaseInScreens,
          file: sourceRelativePath,
          line: item.line,
          specifier: item.specifier,
          message: "Screens must not import Supabase directly.",
        });
      }

      if (sourceFeature && targetFeature && sourceFeature !== targetFeature && !isFeatureRootIndex(resolvedRelativePath)) {
        violations.push({
          rule: RULES.noCrossFeatureInternalImports,
          file: sourceRelativePath,
          line: item.line,
          specifier: item.specifier,
          message: `Cross-feature imports are only allowed via lib/features/${targetFeature}/index.ts.`,
        });
      }

      if (sourceLayer === "screens" && targetLayer === "services_models") {
        violations.push({
          rule: RULES.oneWayLayers,
          file: sourceRelativePath,
          line: item.line,
          specifier: item.specifier,
          message: "Screens may depend on hooks, not services/models.",
        });
      }

      if (sourceLayer === "hooks" && targetLayer === "screens") {
        violations.push({
          rule: RULES.oneWayLayers,
          file: sourceRelativePath,
          line: item.line,
          specifier: item.specifier,
          message: "Hooks must not import screens.",
        });
      }

      if (sourceLayer === "services_models" && (targetLayer === "hooks" || targetLayer === "screens")) {
        violations.push({
          rule: RULES.oneWayLayers,
          file: sourceRelativePath,
          line: item.line,
          specifier: item.specifier,
          message: "Services/models must not import hooks or screens.",
        });
      }
    }
  }

  violations.sort((a, b) => {
    if (a.file !== b.file) {
      return a.file.localeCompare(b.file);
    }
    return a.line - b.line;
  });

  if (violations.length === 0) {
    console.log("Architecture lint passed.");
    return 0;
  }

  console.error(`Architecture lint found ${violations.length} violation(s):`);
  for (const violation of violations) {
    console.error(`- ${formatViolation(violation)}`);
  }

  return 1;
}

process.exitCode = lintArchitecture();
