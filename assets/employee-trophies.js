import * as THREE from './three.module.js';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const views=[];

// Tuning knobs
const ENV_STRENGTH = 1.0;   // overall reflection strength (raise to brighten, lower to darken)
const EXPOSURE     = 0.95;  // final brightness
const SPARKLE_SIZE = 1.0;   // multiplier for all sparkle sizes
const SPARKLE_SPEED = 1.0;  // twinkle speed multiplier

 function buildTrophy(color){
 const g=new THREE.Group();
 const metal = new THREE.MeshPhysicalMaterial({
  color,
  metalness: 1.0,
  roughness: 0.1,
  clearcoat: 0.3,
  clearcoatRoughness: 0.05,
  envMapIntensity: 1.0
});

 // Inside of the cup: slightly softer so it shows a gold gradient instead of a flat mirror
 const innerMetal = new THREE.MeshPhysicalMaterial({
  color,
  metalness: 1.0,
  roughness: 0.18,
  clearcoat: 0.2,
  clearcoatRoughness: 0.15,
  envMapIntensity: 1.0
});

const trim = metal;
  
 function lathe(points,mat=metal){const mesh=new THREE.Mesh(new THREE.LatheGeometry(points.map(([r,y])=>new THREE.Vector2(r,y)),96),mat);g.add(mesh);return mesh}
 function ring(r,y,t=.025){const m=new THREE.Mesh(new THREE.TorusGeometry(r,t,12,96),trim);m.rotation.x=Math.PI/2;m.position.y=y;g.add(m)}
 // Solid stepped plinth and turned stem, with a hollow, double-walled cup.
 lathe([[0,0],[.84,0],[.89,.06],[.88,.12],[.8,.15],[.74,.48],[.74,.53],[0,.53]],metal);
 ring(.86,.09,.035);ring(.76,.5,.03);
 lathe([[0,.53],[.73,.53],[.73,.6],[.67,.65],[.6,.66],[.58,.75],[.55,.78],[.55,.92],[.48,.94],[.48,1.04],[.4,1.06],[.39,1.17],[.28,1.22],[.19,1.3],[.14,1.42],[.13,1.52],[.21,1.59],[.22,1.68],[.16,1.75],[.14,1.9],[.23,2.02],[0,2.02]]);
 for(const [r,y] of [[.57,.79],[.47,.96],[.38,1.08],[.21,1.65],[.16,1.82]])ring(r,y,.018);

 // CHANGED: upper cup is wider (about 15% at the rim)
 // Cup: outer wall (bottom -> rim)
 lathe([[0,1.97],[.18,1.97],[.3,2.03],[.43,2.15],[.58,2.32],
[.72,2.58],[.83,2.91],[.9,3.25],[.93,3.5],[.92,3.56]], metal);
 // Cup: inner wall (rim -> bottom)
 lathe([[.92,3.56],
[.855,3.56],[.85,3.48],[.83,3.24],[.76,2.91],[.66,2.6],
[.52,2.36],[.38,2.19],[.22,2.11],[0,2.11]], innerMetal);

 ring(.925,3.51,.035);ring(.92,3.36,.014);
 for(const side of [-1,1]){
  // CHANGED: handles moved outward to match the wider cup
  const coords=[[.8,3.15],[1.1,3.5],[1.34,3.52],[1.5,3.29],[1.52,2.99],[1.38,2.64],[1.08,2.37],[.7,2.18],[.2,1.84]];
  const curve=new THREE.CatmullRomCurve3(coords.map(([x,y])=>new THREE.Vector3(side*x,y,0)));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve,72,.055,12,false),metal));
  const inner=new THREE.CatmullRomCurve3([[.84,3.13],[1.14,3.39],[1.34,3.39],[1.42,3.23]].map(([x,y])=>new THREE.Vector3(side*x,y,0)));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(inner,24,.025,8,false),trim));
  // Swept handle finials.
  const tip=new THREE.CatmullRomCurve3([[1.34,3.48],[1.54,3.61],[1.6,3.76]].map(([x,y])=>new THREE.Vector3(side*x,y,0)));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(tip,24,.025,8,false),trim));
 }
 // REMOVED: the dark stars on the plinth and on the cup body
 return g;
}

// NEW: white glint texture (soft glow + 4-point cross)
function makeSparkleTexture(){
 const c=document.createElement('canvas');c.width=c.height=128;
 const x=c.getContext('2d');
 const glow=x.createRadialGradient(64,64,0,64,64,64);
 glow.addColorStop(0,'rgba(255,255,255,1)');
 glow.addColorStop(.1,'rgba(255,255,255,.9)');
 glow.addColorStop(.3,'rgba(255,255,255,.2)');
 glow.addColorStop(1,'rgba(255,255,255,0)');
 x.fillStyle=glow;x.fillRect(0,0,128,128);
 const h=x.createLinearGradient(0,0,128,0);
 h.addColorStop(0,'rgba(255,255,255,0)');h.addColorStop(.5,'rgba(255,255,255,1)');h.addColorStop(1,'rgba(255,255,255,0)');
 x.fillStyle=h;x.fillRect(0,61,128,6);
 const v=x.createLinearGradient(0,0,0,128);
 v.addColorStop(0,'rgba(255,255,255,0)');v.addColorStop(.5,'rgba(255,255,255,1)');v.addColorStop(1,'rgba(255,255,255,0)');
 x.fillStyle=v;x.fillRect(61,0,6,128);
 const tex=new THREE.CanvasTexture(c);
 tex.colorSpace=THREE.SRGBColorSpace;
 return tex;
}

// NEW: sparkles placed on corners/edges of the trophy. They rotate with the model.
function addSparkles(model){
 const tex=makeSparkleTexture();
 const p=(r,y,a)=>[Math.sin(a)*r,y,Math.cos(a)*r];
 const spots=[
  // cup rim
  [...p(.94,3.58,.3),.45],[...p(.94,3.58,2.4),.4],[...p(.94,3.58,4.3),.4],
  // cup shoulder
  [...p(.92,3.25,3.3),.3],
  // handle tops and tips
  [1.34,3.54,0,.4],[-1.34,3.54,0,.4],[1.6,3.78,0,.5],[-1.6,3.78,0,.5],
  // plinth corners
  [...p(.9,.1,.8),.4],[...p(.9,.1,3.4),.4],[...p(.9,.06,5.4),.35],[...p(.75,.54,2.2),.3],
  // stem
  [...p(.6,.67,1.5),.3],[...p(.23,1.69,4),.28]
 ];
 const list=[];
 spots.forEach(([x,y,z,size],i)=>{
  const mat=new THREE.SpriteMaterial({map:tex,color:0xffffff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
  const s=new THREE.Sprite(mat);
  s.position.set(x,y,z);
  s.scale.setScalar(size*SPARKLE_SIZE);
  model.add(s);
  list.push({sprite:s,size:size*SPARKLE_SIZE,phase:i*1.7,speed:(1.2+(i%4)*.35)*SPARKLE_SPEED});
 });
 return list;
}

function createView(el,rank){
  console.log("TROPHY RENDERER: WebGL");
 let stage='WebGL context creation';
 let renderer,holder,environment;
 try{
 renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.debug.checkShaderErrors=true;
 stage='renderer configuration';
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=EXPOSURE;
 const scene=new THREE.Scene();

 // ---- Dark photo-studio: black room + a few sharp strip lights ----
 const studio=new THREE.Scene();
 studio.background=new THREE.Color(0x070808);
 function softbox(x,y,z,w,h,power){const p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(power,power*.97,power*.88),side:THREE.DoubleSide}));p.position.set(x,y,z);p.lookAt(0,1.8,0);studio.add(p)}

 // Front strips -> the long bright vertical streaks on the cup body
 softbox(-3.4,3.2,4.5,1.0,7,12);
 softbox(2.2,3.2,5.0,0.5,7,16);
 softbox(4.2,2.8,3.5,1.2,6,7);

 // Top panel -> glowing rim and cup interior
 softbox(0,7.5,3,6,4,8);

 // Side/back edge strips -> bright outlines on handles and edges
 softbox(-6.5,3,-1,1.4,6,9);
 softbox(6.5,3,-1,1.4,6,9);

 // Very dim back panel so shadow areas are deep dark-gold, not pure black
 softbox(0,3,-7,10,8,0.6);

 // Low warm bounce -> reflections on the plinth and base
 softbox(0,-2,3.5,6,2,2.5);

 stage='studio reflection environment generation';
 const pmrem=new THREE.PMREMGenerator(renderer);try{environment=pmrem.fromScene(studio,.03);scene.environment=environment.texture}finally{pmrem.dispose()}
 if('environmentIntensity' in scene)scene.environmentIntensity=ENV_STRENGTH;

 const camera=new THREE.PerspectiveCamera(33,1,.1,100);camera.position.set(0,3.6,8.5);camera.lookAt(0,1.9,0);

 // Only one small key light for a tiny specular sparkle.
 const light=new THREE.DirectionalLight(0xfff3cf,1.2);light.position.set(-3,5,4);scene.add(light);

 const model=buildTrophy(rank===1?0xe6b43c:rank===2?0xd6dade:0xc4854f);model.rotation.y=-.22;scene.add(model);
 const sparkles=addSparkles(model); // NEW
 holder=document.createElement('div');holder.className='trophy-3d';holder.setAttribute('role','img');holder.setAttribute('aria-label',`${['','Gold','Silver','Bronze'][rank]} trophy, rotating in 3D`);holder.append(renderer.domElement);el.querySelector('.employee-trophy').insertAdjacentElement('afterend',holder);
 stage='initial trophy render';
 const resize=()=>{const w=holder.clientWidth,h=holder.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.render(scene,camera)};
 const observer=new ResizeObserver(resize);observer.observe(holder);resize();el.classList.add('has-3d');
 views.push({el,holder,observer,renderer,scene,camera,model,environment,sparkles,phase:rank*.13});
 }catch(error){environment?.dispose();renderer?.dispose();holder?.remove();throw new Error(`Trophy ${rank} failed during ${stage}`,{cause:error})}
}

function createSoftwareView(el,rank){
   console.log("TROPHY RENDERER: SOFTWARE");
 const model=buildTrophy(rank===1?0xe6b43c:rank===2?0xd6dade:0xc4854f);
 model.updateMatrixWorld(true);
 const triangles=[];const v=new THREE.Vector3(),n=new THREE.Vector3();
 model.traverse(mesh=>{if(!mesh.isMesh)return;const geo=mesh.geometry,pos=geo.attributes.position,norm=geo.attributes.normal,indices=geo.index;const normalMat=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);const verts=[];for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);n.fromBufferAttribute(norm,i).applyMatrix3(normalMat).normalize();verts.push({p:v.clone(),n:n.clone()})}const base=mesh.material.color.clone().convertLinearToSRGB();for(let i=0;i<(indices?indices.count:pos.count);i+=3){const ids=[0,1,2].map(j=>indices?indices.getX(i+j):i+j);triangles.push({v:ids.map(k=>verts[k]),c:base,black:base.r<.2})}});
 const holder=document.createElement('div');holder.className='trophy-3d';holder.setAttribute('role','img');holder.setAttribute('aria-label',`${['','Gold','Silver','Bronze'][rank]} trophy, rotating in 3D`);
 const canvas=document.createElement('canvas');holder.append(canvas);el.querySelector('.employee-trophy').insertAdjacentElement('afterend',holder);const ctx=canvas.getContext('2d');
 const camera=new THREE.PerspectiveCamera(33,1,.1,100);camera.position.set(0,3.6,8.5);camera.lookAt(0,1.9,0);camera.updateMatrixWorld();
 let w=0,h=0;const rot=new THREE.Matrix4();const view=new THREE.Matrix4();const projected=new THREE.Vector3();
 const light=new THREE.Vector3(-.5,.8,1).normalize(),sideLight=new THREE.Vector3(.9,.3,.5).normalize();
 const draw=()=>{if(!w)return;ctx.clearRect(0,0,w,h);rot.makeRotationY(model.rotation.y);view.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);const faces=[];for(const t of triangles){const normal=new THREE.Vector3();const pts=t.v.map(a=>{v.copy(a.p).applyMatrix4(rot);n.copy(a.n).transformDirection(rot);normal.add(n);projected.copy(v).applyMatrix4(view);return{x:(projected.x*.5+.5)*w,y:(-.5*projected.y+.5)*h,z:projected.z}});normal.normalize();if(normal.z<-.3)continue;const diffuse=Math.max(0,normal.dot(light));const spec=Math.pow(Math.max(0,normal.dot(light)),34)*1.7+Math.pow(Math.max(0,normal.dot(sideLight)),65)*1.3;const reflection=.29+diffuse*.68+Math.max(0,normal.dot(sideLight))*.22;const rgb=[t.c.r,t.c.g,t.c.b].map(c=>Math.min(255,Math.round(255*(c*reflection+spec*(t.black?.18:.65)))));faces.push({pts,z:(pts[0].z+pts[1].z+pts[2].z)/3,color:`rgb(${rgb.join(',')})`})}faces.sort((a,b)=>b.z-a.z);for(const f of faces){ctx.beginPath();ctx.moveTo(f.pts[0].x,f.pts[0].y);ctx.lineTo(f.pts[1].x,f.pts[1].y);ctx.lineTo(f.pts[2].x,f.pts[2].y);ctx.closePath();ctx.fillStyle=f.color;ctx.fill();ctx.strokeStyle=f.color;ctx.lineWidth=.45;ctx.stroke()}};
 const resize=()=>{w=canvas.width=Math.round(holder.clientWidth*1.3);h=canvas.height=Math.round(holder.clientHeight*1.3);camera.aspect=w/h;camera.updateProjectionMatrix();draw()};const observer=new ResizeObserver(resize);observer.observe(holder);resize();el.classList.add('has-3d');views.push({el,holder,observer,model,phase:rank*.13,draw});
}
function disposeView(view){
 view.observer.disconnect();
 view.renderer?.dispose();
 (view.scene||view.model)?.traverse(object=>{
  object.geometry?.dispose();
  for(const material of Array.isArray(object.material)?object.material:[object.material]){
   material?.map?.dispose(); // NEW: sparkle texture
   material?.dispose();
  }
 });
 view.environment?.dispose();
 view.holder.remove();
 view.el.classList.remove('has-3d');
}
function initializeTrophies(){
 for(const view of views.splice(0))disposeView(view);
 for(const el of document.querySelectorAll('.employee-winner'))el.classList.remove('has-3d');
 const ranks={first:1,second:2,third:3};
 for(const el of document.querySelectorAll('.employee-winner')){
  const rank=Object.entries(ranks).find(([name])=>el.classList.contains(name))?.[1];
  if(!rank)continue;
  try{createView(el,rank)}
  catch(error){
   try{createSoftwareView(el,rank)}
   catch(fallbackError){console.error(`Unable to render employee trophy ${rank}`,new AggregateError([error,fallbackError]))}
  }
 }
}
function initializeWhenPodiumReady() {
  if (document.querySelector('.employee-winner')) {
    initializeTrophies();
  }
}

initializeWhenPodiumReady();
document.addEventListener(
  'tropica:employee-podium-updated',
  initializeWhenPodiumReady
);
document.addEventListener(
  'tropica:data-ready',
  initializeWhenPodiumReady,
  { once: true }
);

// CHANGED: tick now also twinkles the sparkles
let last=0,angle=0;
function tick(t){
 requestAnimationFrame(tick);
 if(document.hidden){last=t;return}
 if(t-last<50)return;
 const dt=Math.min((t-last)/1000,.1);last=t;
 const paused=document.body.classList.contains('motion-paused')||reduced.matches;
 if(!paused)angle+=dt*Math.PI*2/26;
 const s=t/1000;
 for(const v of views){
  if(!paused)v.model.rotation.y=angle+v.phase;
  if(v.sparkles){
   for(const sp of v.sparkles){
    if(paused){sp.sprite.material.opacity=.55;sp.sprite.scale.setScalar(sp.size*.8);continue}
    const k=Math.max(0,Math.sin(s*sp.speed+sp.phase));
    const pulse=Math.pow(k,6);               // short, sharp flash
    sp.sprite.material.opacity=pulse;
    sp.sprite.scale.setScalar(sp.size*(.4+.9*pulse));
    sp.sprite.material.rotation=s*.4+sp.phase;
   }
  }
  v.draw?v.draw():v.renderer.render(v.scene,v.camera);
 }
}
requestAnimationFrame(tick);
