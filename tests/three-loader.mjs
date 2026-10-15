export async function resolve(s,c,next){if(s==='three')return {url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true};return next(s,c);}
