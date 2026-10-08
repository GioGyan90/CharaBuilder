// Stable IDs are persisted in character JSON. Every donor is an explicitly CC0 beta model.
export const hairPresets = {
  female:[['source','双马尾'],['trim','短款双马尾'],['bobPreset','齐耳短发'],['longPreset','直长发'],['wavePreset','侧卷马尾'],['bald','光头']],
  male:[['source','利落短发'],['trim','紧凑短发'],['layeredPreset','层次中短发'],['bald','光头']],
};
export const outfitPresets = {
  female:[['source','日常连衣裙'],['solid','素色连衣裙'],['uniformPreset','衬衫领结 · 短裙'],['classicPreset','古典洋装']],
  male:[['source','连帽上装 · 长裤'],['solid','素色上装 · 长裤'],['uniformPreset','衬衫领带 · 长裤']],
};
export const hairAsset = {bobPreset:'bob',longPreset:'long',wavePreset:'classic',layeredPreset:'uniform'};
export function outfitAsset(state) {return state.clothes==='uniformPreset' ? state.gender==='male'?'uniform':'long' : state.clothes==='classicPreset'?'classic':null;}
