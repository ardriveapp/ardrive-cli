import { promisify} from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as rollup from 'rollup'
import * as terser from 'terser'

const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)

const bundleName = "ardrive-cli"
const __dirname = path.resolve(path.dirname('')).concat('\\build');

const srcPath = path.join(__dirname, "..", "src")
const compiledPath = path.join(__dirname, "compiled")
const distNpmPath = path.join(__dirname, "..")

async function build() {
  const bundle = await rollup.rollup({
    input: path.join(compiledPath, "index.js")
  })
  const { output } = await bundle.generate({
    format: "commonjs",
    exports: "named",
    sourcemap: false,
  })

  const minified = await terser.minify({
    bundle: output[0].code
  })
  if (minified.error)
    throw minified.error

  await writeFile(path.join(distNpmPath, `${bundleName}.min.js`), minified.code)
  await writeFile(path.join(distNpmPath, `${bundleName}.d.ts`), await makeDefinitionsCode())
}

async function makeDefinitionsCode() {
  const defs = [
    "// -- Usage definitions --",
    removeLocalImportsExports((await readFile(path.join(srcPath, "exported-definitions.d.ts"), "utf-8")).trim()),
    "// -- Entry point definition --",
    removeSemicolons(
      removeLocalImportsExports((await readFile(path.join(compiledPath, "index.d.ts"), "utf-8")).trim()),
    )
  ]
  return defs.join("\n\n")
}

function removeLocalImportsExports(code) {
  const localImportExport = /^\s*(import|export) .* from "\.\/.*"\s*;?\s*$/
  return code.split("\n").filter(line => {
    return !localImportExport.test(line)
  }).join("\n").trim()
}

function removeSemicolons(code) {
  return code.replace(/;/g, "")
}

build().catch(err => console.log(err.message, err.stack))