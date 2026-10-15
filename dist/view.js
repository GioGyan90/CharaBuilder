// Camera yaw is measured around the current OrbitControls target (+Z is front).
export const cameraAngles=[
 {id:'front',label:'正面',yaw:0},
 {id:'leftQuarter',label:'左 3/4',yaw:-Math.PI/4},
 {id:'rightQuarter',label:'右 3/4',yaw:Math.PI/4},
 {id:'leftSide',label:'左侧',yaw:-Math.PI/2},
 {id:'rightSide',label:'右侧',yaw:Math.PI/2},
 {id:'back',label:'背面',yaw:Math.PI},
 {id:'frontHigh',label:'斜前俯视',yaw:Math.PI/4,pitch:Math.PI/5},
 {id:'backHigh',label:'斜后俯视',yaw:Math.PI*3/4,pitch:Math.PI/5}
];
export function cameraYaw(camera,target){return Math.atan2(camera.x-target.x,camera.z-target.z);}
export function anglePosition(position,target,yaw,pitch){
 if(Number.isFinite(pitch)){const distance=Math.hypot(position.x-target.x,position.y-target.y,position.z-target.z),r=distance*Math.cos(pitch);return [target.x+Math.sin(yaw)*r,target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*r];}
 const radius=Math.hypot(position.x-target.x,position.z-target.z);
 return [target.x+Math.sin(yaw)*radius,position.y,target.z+Math.cos(yaw)*radius];
}
export function selectedAngle(yaw,tolerance=.045,pitch=0){
 return cameraAngles.find(a=>Math.abs(pitch-(a.pitch||0))<tolerance&&Math.abs(Math.atan2(Math.sin(yaw-a.yaw),Math.cos(yaw-a.yaw)))<tolerance)?.id||null;
}
// Keep bilateral outward drags consistent when viewing the character from behind.
// At exact profile, width has no screen projection: retain the labelled pad direction.
export function screenDragSide(side,yaw,key=''){
 const projection=/Depth|Projection/.test(key)?-Math.sin(yaw):side*Math.cos(yaw);
 return Math.abs(projection)<.15?side:Math.sign(projection);
}

// Move the framing anchor while preserving the user's orbit, zoom and pan offset.
export function moveCameraTarget(position,target,deltaY){position.y+=deltaY;target.y+=deltaY;}
