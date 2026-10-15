import path from 'node:path';
import {pathToFileURL} from 'node:url';
const base=process.env.CHARAMAKE_DIST?pathToFileURL(path.resolve(process.env.CHARAMAKE_DIST)+path.sep):new URL('../dist/',import.meta.url);
export async function resolve(specifier,context,nextResolve){if(specifier==='three')return {url:new URL('vendor/three.module.js',base).href,shortCircuit:true};return nextResolve(specifier,context);}
