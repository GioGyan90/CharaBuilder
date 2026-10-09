import {hexToHsl,hslToHex} from '../dist/colors.js';
for(let r=0;r<256;r+=17)for(let g=0;g<256;g+=17)for(let b=0;b<256;b+=17){const hex='#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');if(hslToHex(...hexToHsl(hex))!==hex)throw Error('HSL roundtrip '+hex);}
console.log('PASS 4096 RGB/HSL roundtrips, including black, white and grays');
