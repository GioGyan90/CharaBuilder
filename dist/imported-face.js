// One continuous surface, overlapping skeletal editing domains, donor-local frame.
// Domain boundaries are for inspection only: they never split vertices or normals.
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const value=(s,k)=>Math.max(-1,Math.min(1,((Number.isFinite(s[k])?s[k]:50)-50)/50));
export function importedFaceWeights(x,y,z,rig){
 const p=[(x-rig.headX)/.19+.003,(y-rig.eyeY)/.19-.055,(z-rig.headZ)/.19-.07];
 const weights={};
 for(const d of rig.structure.domains){const dx=(d.paired?Math.abs(p[0]):p[0])-d.center[0];const r=Math.hypot(dx/d.radius[0],(p[1]-d.center[1])/d.radius[1],(p[2]-d.center[2])/d.radius[2]);weights[d.id]=1-smooth(.2,1,r);}
 return {p,weights};
}
export function importedFaceRegion(x,y,z,rig){
 const {weights}=importedFaceWeights(x,y,z,rig);
 // Compact eye, brow, nose and lip domains win over their broad support planes.
 const priority={brow:1.15,orbit:1.25,nasal:1.25,lip:1.4,ear:1.35};
 let best=rig.structure.support,score=.12;
 for(const d of rig.structure.domains){const w=weights[d.id]*(priority[d.id]||1);if(w>score){best=d;score=w;}}
 return best;
}
export function deformImportedFace(x,y,z,state,rig){
 const source=[x,y,z],{p,weights:w}=importedFaceWeights(x,y,z,rig),v=k=>value(state,k),sx=Math.sign(p[0])||1,lateral=Math.tanh(p[0]/.12);
 const front=smooth(-.05,.28,p[2]),neck=smooth(-.72,-.52,p[1]);
 const add=(dx,dy,dz,weight)=>{x+=dx*weight;y+=dy*weight;z+=dz*weight;};
 const turn=(key,cy,cz,weight)=>{const a=v(key)*.16,dy=source[1]-cy,dz=source[2]-cz;add(0,dy*Math.cos(a)-dz*Math.sin(a)-dy,dy*Math.sin(a)+dz*Math.cos(a)-dz,weight);};
 const localY=py=>rig.eyeY+(py+.055)*.19,localZ=pz=>rig.headZ+(pz+.07)*.19;
 add(0,0,.012*v('forehead'),w.frontal);
 add(lateral*.009*v('templeWidth'),0,.009*v('templeDepth'),w.temporal*(1-w.ear));
 const cheek=w.zygoma*(1-w.orbit*.8)*(1-w.ear);
 add(lateral*.008*v('cheekboneWidth'),.009*v('cheekboneHeight'),.004*v('cheekboneDepth'),cheek);
 add(lateral*.005*v('cheekboneSharpness'),0,.004*v('cheekboneSharpness'),cheek);
 turn('cheekboneAngle',localY(-.21),localZ(.31),cheek);
 add(lateral*.0035*v('cheek'),0,.0035*v('cheek'),w.maxilla*(1-w.lip));
 const jaw=w.mandible*(1-w.ear)*(1-w.lip)*neck;
 add(lateral*(.008*v('jawWidth')+.006*v('jawAngle')*(1-front)),.008*v('jawHeight'),.014*v('jawDepth'),jaw);
 turn('jawTilt',localY(-.46),localZ(.12),jaw);
 const chin=w.chin*(1-w.lip)*neck;
 add((source[0]-rig.headX)*(.25*v('chinWidth')+.12*v('chinSize')),-.017*v('chinLength')-.008*v('chinSize'),.016*v('chinProjection')+.006*v('chinSize'),chin);
 turn('chinAngle',localY(-.55),localZ(.34),chin);
 // Upper jaw moves its support plane and lips together; nasal root/eye remain fixed.
 const upper=w.maxilla*(1-w.orbit)*(1-w.nasal*.65)*neck;
 add(lateral*.010*v('maxillaWidth'),.010*v('maxillaHeight'),.006*v('maxillaDepth'),upper);
 const eye=rig.eyes[p[0]<0?0:1],dx=source[0]-eye[0],dy=source[1]-eye[1];
 const ex=dx*(1+.25*v('eyeSize')+.22*v('eyeWidth')),ey=dy*(1+.25*v('eyeSize')+.20*v('eyeHeight')),angle=sx*.16*v('eyeTilt');
 add(ex*Math.cos(angle)-ey*Math.sin(angle)-dx+sx*.010*v('eyeSpace'),ex*Math.sin(angle)+ey*Math.cos(angle)-dy+.006*v('eyeVertical'),.004*v('eyeDepth'),w.orbit*smooth(.015,.065,Math.abs(p[0])));
 const brow=rig.brows[p[0]<0?0:1];
 add(0,.008*v('browHeight')+.008*v('browRidgeHeight')+(source[0]-brow[0])*sx*.22*v('browAngle'),.007*v('browRidge'),w.brow);
 const root=1-smooth(.025,.15,Math.abs(p[1]+.045)),tip=1-smooth(.02,.11,Math.abs(p[1]+.245));
 const bridge=1-smooth(.03,.16,Math.abs(p[1]+.12));
 add((source[0]-rig.headX)*(.26*v('nose')+.25*v('noseWidth')+.30*v('noseBridgeWidth')*bridge),.013*v('noseHeight')-.010*v('noseLength')+.006*v('noseTipAngle')*tip,.008*v('nose')+.014*v('noseProjection')+.010*v('noseRootDepth')*root+.010*v('noseTipProjection')*tip,w.nasal);
 add((source[0]-rig.mouth[0])*.30*v('mouth'),.009*v('mouthHeight')+(source[1]-rig.mouth[1])*.35*v('mouthThickness')+.005*v('mouthCorner')*Math.min(1,Math.abs(p[0])/.15),.007*v('mouthProjection'),w.lip);
 const mid=smooth(-.40,-.12,p[1])*(1-smooth(-.07,.18,p[1]));
 const lower=smooth(-.65,-.42,p[1])*(1-smooth(-.38,-.10,p[1]));
 add(0,.008*v('midFaceLength')*mid+.008*v('lowerFaceLength')*lower+(source[1]-rig.eyeY)*.12*v('faceHeight')*(1-smooth(-.05,.18,p[1])),0,front*neck);
 // Independent donor-space adult controls. No juvenile template offsets are added.
 const bell=(a,c,r)=>Math.exp(-(((a-c)/r)**2));
 add(lateral*.007*v('zygomaticArchDepth'),0,0,w.zygoma*(1-w.ear));
 add(lateral*.003*v('midfaceSupport'),0,.006*v('midfaceSupport'),upper);
 add(lateral*(.004*v('jawBodySupport')+.006*v('jawBase')+.004*v('masseter')),-.009*v('jawRamus'),.007*v('jawCornerDepth')+.004*v('jawBodySupport'),jaw);
 add(lateral*.004*v('chinSquareness'),.004*v('chinSquareness'),0,chin*bell(p[1],-.55,.10));
 add(0,0,-.003*v('mentolabialDepth'),bell(p[1],-.455,.035)*bell(p[0],0,.13)*front);
 add(0,0,.004*v('submentalDepth'),chin*bell(p[1],-.62,.08));
 add(0,0,.008*v('foreheadSlope'),w.frontal*smooth(.02,.25,p[1]));
 add(0,0,.004*v('noseBaseDepth'),w.nasal*bell(p[1],-.28,.06));
 const oral=upper+w.lip*(1-upper),lipY=p[1]+.386;
 add(0,0,.005*v('muzzleDepth'),oral);
 add(0,-.005*v('philtrumLength'),0,w.lip);
 add(0,0,-.002*v('philtrumDepth'),bell(p[0],0,.025)*bell(p[1],-.325,.045)*front);
 const upperLip=bell(lipY,.025,.035)*smooth(0,.012,lipY)*w.lip;
 const lowerLip=bell(lipY,-.028,.035)*(1-smooth(-.012,0,lipY))*w.lip;
 add((source[0]-rig.headX)*.25*v('upperLipWidth'),0,0,upperLip);
 add((source[0]-rig.headX)*.25*v('lowerLipWidth'),0,0,lowerLip);
 // Lower-density triangles need smaller displacement gradients between anchors.
 return source.map((v,i)=>v+([x,y,z][i]-v)*.65);
}


