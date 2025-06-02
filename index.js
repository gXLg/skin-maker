 // base
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// shader
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// x - right
// y - up
// z - back
function fill(x, y, z) {
    const front = Array(y).fill().map(_ => Array(x).fill("#000000"));
    const back = Array(y).fill().map(_ => Array(x).fill("#000000"));
    const left = Array(y).fill().map(_ => Array(z).fill("#000000"));
    const right = Array(y).fill().map(_ => Array(z).fill("#000000"));
    const top = Array(z).fill().map(_ => Array(x).fill("#000000"));
    const bottom = Array(z).fill().map(_ => Array(x).fill("#000000"));

    const front_l = Array(y).fill().map(_ => Array(x).fill(null));
    const back_l = Array(y).fill().map(_ => Array(x).fill(null));
    const left_l = Array(y).fill().map(_ => Array(z).fill(null));
    const right_l = Array(y).fill().map(_ => Array(z).fill(null));
    const top_l = Array(z).fill().map(_ => Array(x).fill(null));
    const bottom_l = Array(z).fill().map(_ => Array(x).fill(null));
    
    return {
        front, back, left, right, top, bottom,
        front_l, back_l, left_l, right_l, top_l, bottom_l
    }
}

const player = {
    "head": fill(8, 8, 8),
    "body": fill(8, 12, 4),
    "left_arm": fill(4, 12, 4),
    "right_arm": fill(4, 12, 4),
    "left_leg": fill(4, 12, 4),
    "right_leg": fill(4, 12, 4)
};

function createTexture(matrix, reversed) {
    const ysize = matrix.length;
    const xsize = matrix[0].length;
    const canvas = document.createElement("canvas");
    canvas.width = xsize;
    canvas.height = ysize;
    const ctx = canvas.getContext("2d");

    for (let row = 0; row < ysize; row++) {
        for (let col = 0; col < xsize; col++) {
            const color = matrix[reversed ? ysize - row - 1 : row][col];
            if (color) {
                ctx.fillStyle = color;
                ctx.fillRect(col, row, 1, 1);
            } else {
                ctx.clearRect(col, row, 1, 1); // Transparent (null) color
            }
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    return texture;
}

// Scene, camera, and renderer setup
const canvas = document.getElementById("canvas");
const { width, height } = canvas.getBoundingClientRect();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(width, height);

// Set up postprocessing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const outlinePass = new OutlinePass(new THREE.Vector2(width, height), scene, camera);
outlinePass.visibleEdgeColor.set('#ffffff'); // Outline color
outlinePass.hiddenEdgeColor.set('#ffffff');  // Hidden edge color
outlinePass.edgeStrength = 3; // Strength of the outline
composer.addPass(outlinePass);

// Resize renderer and camera on window resize
window.addEventListener("resize", () => {
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;
    camera.aspect = width / height;
    renderer.setSize(width, height);
    composer.setSize(width, height);
    camera.updateProjectionMatrix();
});

// Setup controller
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.5;

function createBodyPart(part, px, py, pz) {
    const x = part.front[0].length;
    const y = part.front.length;
    const z = part.top.length;

    const geometry = new THREE.BoxGeometry(x, y, z);
    const materials = [
        new THREE.MeshBasicMaterial({ map: createTexture(part.left) }),
        new THREE.MeshBasicMaterial({ map: createTexture(part.right) }),
        new THREE.MeshBasicMaterial({ map: createTexture(part.top) }),
        new THREE.MeshBasicMaterial({ map: createTexture(part.bottom) }),
        new THREE.MeshBasicMaterial({ map: createTexture(part.front) }),
        new THREE.MeshBasicMaterial({ map: createTexture(part.back) })
    ];
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.position.set(px, py, pz);
    scene.add(mesh);

    const geometry2 = new THREE.BoxGeometry(x + 1, y + 1, z + 1);
    const materials2 = [
        new THREE.MeshBasicMaterial({ map: createTexture(part.left_l), transparent: true, opacity: 1 }),
        new THREE.MeshBasicMaterial({ map: createTexture(part.right_l), transparent: true, opacity: 1 }),
        new THREE.MeshBasicMaterial({ map: createTexture(part.top_l), transparent: true, opacity: 1 }),
        new THREE.MeshBasicMaterial({ map: createTexture(part.bottom_l), transparent: true, opacity: 1 }),
        new THREE.MeshBasicMaterial({ map: createTexture(part.front_l), transparent: true, opacity: 1 }),
        new THREE.MeshBasicMaterial({ map: createTexture(part.back_l), transparent: true, opacity: 1 })
    ];
    const mesh2 = new THREE.Mesh(geometry2, materials2);
    mesh2.position.set(px, py, pz);
    scene.add(mesh2);

    return [mesh, mesh2];
}

const parts = {
    "head": createBodyPart(player.head, 0, 10, 0),
    "body": createBodyPart(player.body, 0, 0, 0),
    "left_arm": createBodyPart(player.left_arm, 6, 0, 0),
    "right_arm": createBodyPart(player.right_arm, -6, 0, 0),
    "left_leg": createBodyPart(player.left_leg, 2, -12, 0),
    "right_leg": createBodyPart(player.right_leg, -2, -12, 0)
};

const sobj = [];
for (const part in parts) {
    sobj.push(...parts[part]);
}
outlinePass.selectedObjects = sobj;

// Function to create arrows
const arrowLength = 5; // Length of the arrows
const origin = new THREE.Vector3(-9, -21, -5);
function createArrow(color, direction) {
    const arrowHelper = new THREE.ArrowHelper(direction, origin, arrowLength, color);
    scene.add(arrowHelper);
}

// Create arrows
createArrow(0xff0000, new THREE.Vector3(1, 0, 0)); // X-Axis (Red)
createArrow(0x00ff00, new THREE.Vector3(0, 1, 0)); // Y-Axis (Green)
createArrow(0x0000ff, new THREE.Vector3(0, 0, 1)); // Z-Axis (Blue)


const uv_map = { };
/*
      T B
    R F L B
*/

function construct(part, x, y, layer) {
    const suffix = layer ? "_l" : "";

    const dx = player[part].front[0].length;
    const dy = player[part].front.length;
    const dz = player[part].top.length;
    
    uv_map[part + ".top" + suffix] = [x + dz, y, dx, dz];
    uv_map[part + ".bottom" + suffix] = [x + dz + dx, y, dx, dz];
    uv_map[part + ".right" + suffix] = [x, y + dz, dz, dy];
    uv_map[part + ".front" + suffix] = [x + dz, y + dz, dx, dy];
    uv_map[part + ".left" + suffix] = [x + dz + dx, y + dz, dz, dy];
    uv_map[part + ".back" + suffix] = [x + dz + dx + dz, y + dz, dx, dy];
}
construct("head", 0, 0);
construct("head", 32, 0, true);
construct("right_leg", 0, 16);
construct("body", 16, 16);
construct("right_arm", 40, 16);
construct("right_leg", 0, 32, true);
construct("body", 16, 32, true);
construct("right_arm", 40, 32, true);
construct("left_leg", 0, 48, true);
construct("left_leg", 16, 48);
construct("left_arm", 32, 48);
construct("left_arm", 48, 48, true);

const png = document.getElementById("png");
const pctx = png.getContext("2d");
png.width = 64;
png.height = 64;
pctx.imageSmoothingEnabled = false;

function render(part, face) {
    const matrix = player[part][face];
    const ysize = matrix.length;
    const xsize = matrix[0].length;

    const [x, y] = uv_map[part + "." + face];

    for (let row = 0; row < ysize; row++) {
        for (let col = 0; col < xsize; col++) {
            const color = matrix[row][col];
            if (color) {
                pctx.fillStyle = color;
                pctx.fillRect(col + x, row + y, 1, 1);
            } else {
                pctx.clearRect(col + x, row + y, 1, 1); // Transparent (null) color
            }
        }
    }

    const [fface, i] = face.endsWith("_l") ? [face.slice(0, -2), 1] : [face, 0];
    const index = ["left", "right", "top", "bottom", "front", "back"].indexOf(fface);
    parts[part][i].material[index].map = createTexture(matrix, fface == "bottom");
    parts[part][i].needsUpdate = true;
}
const draw = document.getElementById("draw");
draw.addEventListener("contextmenu", event => event.preventDefault());

const select = document.getElementById("select");


function rgbToHex(r, g, b) {
    const cint = (((r << 8) + g) << 8) + b;
    return "#" + cint.toString(16).padStart(6, "0");
}

function clamp(value, min, max) {
    return Math.min(Math.max(min, value), max);
}

function createWorkArea() {
    let drawing_part = null;
    const drawing_face = new Set();

    draw.innerHTML = "";
    select.innerHTML = "";

    for (const part in player) {
        const ps = document.createElement("span");
        ps.classList.add("part");
        if (part != "head") ps.classList.add("hidden");

        let minx = 64;
        let miny = 64;
        let minxl = 64;
        let minyl = 64;
        for (const face in player[part]) {
            render(part, face);

            const [x, y, dx, dy] = uv_map[part + "." + face];
            
            if (!face.endsWith("_l")) {
                if (x < minx) minx = x;
                if (y < miny) miny = y;
            } else {
                if (x < minxl) minxl = x;
                if (y < minyl) minyl = y;
            }
        }

        for (const face in player[part]) {
            const current_face = [];
            const [x, y, dx, dy] = uv_map[part + "." + face];
            for (let i = 0; i < dx; i++) {
                for (let j = 0; j < dy; j++) {
                    const span = document.createElement("span");
                    span.classList.add("pixel");
                    
                    if (!face.endsWith("_l")) {
                        span.style.top = ((y + j - miny) * 17) + "px";
                        span.style.left = ((x + i - minx) * 17) + "px";
                    } else {
                        span.style.top = ((y + j - minyl) * 17) + "px";
                        span.style.left = ((x + i - minxl + 33) * 17) + "px";
                    }
                    span.style.backgroundColor = player[part][face][j][i];
                    ps.appendChild(span);
                    
                    function mouse(event) {
                        const l = face.endsWith("_l");
                        const m = event.buttons;
                        if (m == 1) {
                            if (currentColorIndex == -1) return;
                            if (colorPickMode) {
                                if (!span.style.backgroundColor) {
                                    is[currentColorIndex].value = "#000000";
                                } else {
                                    const [r, g, b] = [...span.style.backgroundColor.matchAll(/\d+/g)].map(c => parseInt(c[0]));
                                    is[currentColorIndex].value = rgbToHex(r, g, b);
                                }
                                colorPickMode = false;
                                document.getElementById("pick_color").style.color = null;
                            } else {
                                let color = is[currentColorIndex].value;
                                
                                if (randomColorMode) {
                                    const cint = parseInt(color.slice(1), 16);
                                    const r = (cint >> 16) & 255;
                                    const g = (cint >> 8) & 255;
                                    const b = cint & 255;
                                    
                                    const d = Math.floor(Math.random() * 20 - 10);
                                    const nr = clamp(r + d, 0, 255);
                                    const ng = clamp(g + d, 0, 255);
                                    const nb = clamp(b + d, 0, 255);
                                    
                                    color = rgbToHex(nr, ng, nb);
                                }
                                span.style.backgroundColor = color;
                                player[part][face][j][i] = color;
                            }
                            
                        } else if (m == 2) {
                            // delete
                            if (l) {
                                span.style.backgroundColor = null;
                                player[part][face][j][i] = null;
                            } else {
                                span.style.backgroundColor = "#000000";
                                player[part][face][j][i] = "#000000";
                            }
                        }
                        if (m == 1 || m == 2) {
                            drawing_part = part;
                            drawing_face.add(face);
                        }
                    }
                    
                    span.onmouseover = mouse;
                    
                    let last_click = 0;
                    let last_buttons = 0;
                    span.onmousedown = event => {
                        event.preventDefault();
                        
                        const now = Date.now();
                        if (now - last_click < 1000 && last_buttons == event.buttons) {
                            current_face.forEach(p => p.onmouseover(event));
                        } else mouse(event);
                        
                        last_click = now;
                        last_buttons = event.buttons;
                    };
                    
                    current_face.push(span);
                }
            }
            const border = document.createElement("span");
            border.classList.add("border");
            if (!face.endsWith("_l")) {
                border.style.top = ((y - miny) * 17 - 2) + "px";
                border.style.left = ((x - minx) * 17 - 2) + "px";
            } else {
                border.style.top = ((y - minyl) * 17 - 2) + "px";
                border.style.left = ((x - minxl + 33) * 17 - 2) + "px";
            }
            border.style.height = (dy * 17 - 2) + "px";
            border.style.width = (dx * 17 - 2) + "px";
            ps.appendChild(border);
        }
        draw.appendChild(ps);
        const b = document.createElement("button");
        b.innerText = part;
        b.onclick = () => {
            for (const p of document.querySelectorAll(".part")) p.classList.add("hidden");
            ps.classList.remove("hidden");
        };
        select.appendChild(b);
        
    }
    draw.onmouseup = () => {
        for (const face of drawing_face) render(drawing_part, face);
        drawing_face.clear();
    };
    draw.onwheel = event => {
        event.preventDefault();
        const d = event.deltaY > 0 ? 1 : -1;
        if (currentColorIndex == -1) return;
        currentColorIndex = (currentColorIndex + d + colorAmount) % colorAmount;
        selectColor();
    };
}
createWorkArea();

const initialCameraPosition = new THREE.Vector3(0, 0, 35);
camera.position.copy(initialCameraPosition);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    composer.render();
}

animate();

document.getElementById("controls-reset").onclick = () => {
    camera.position.copy(initialCameraPosition);
    camera.rotation.set(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
};

const ctrl = document.getElementById("controls");
for (const part in parts) {
    const b1 = document.createElement("button");
    b1.innerText = part;
    b1.style.color = "green";
    b1.onclick = () => {
        parts[part][0].visible = !parts[part][0].visible;
        b1.style.color = parts[part][0].visible ? "green" : "red";
    };
    const b2 = document.createElement("button");
    b2.innerText = part + "_layer";
    b2.style.color = "green";
    b2.onclick = () => {
        parts[part][1].visible = !parts[part][1].visible;
        b2.style.color = parts[part][1].visible ? "green" : "red";
    };
    const g = document.createElement("span");
    g.appendChild(b1);
    g.appendChild(b2);
    ctrl.appendChild(g);
}

let currentColorIndex = -1;
let colorAmount = 0;
const addColor = document.getElementById("add_color");
const is = [];
addColor.onclick = () => {
    const i = document.createElement("input");
    i.type = "color";
    i.value = "#000000";
    colorAmount++;
    if (currentColorIndex == -1) {
        currentColorIndex = 0;
        i.classList.add("selected");
    }
    i.oncontextmenu = event => {
        event.preventDefault();
        if (i.classList.contains("selected") && currentColorIndex != 0) currentColorIndex--;
        is.splice(is.indexOf(i), 1);
        i.remove();
        colorAmount--;
        selectColor();
    };
    is.push(i);
    addColor.insertAdjacentElement("beforebegin", i);
};
function selectColor() {
    if (currentColorIndex == -1) return;
    if (colorAmount == 0) {
        currentColorIndex = -1;
        return;
    }
    for (const j of is) j.classList.remove("selected");
    const i = is[currentColorIndex];
    i.classList.add("selected");
}

let colorPickMode = false;
document.getElementById("pick_color").onclick = () => {
    document.getElementById("pick_color").style.color = "green";
    colorPickMode = true;
};

let randomColorMode = false;
const random = document.getElementById("random_color");
random.style.color = "red";
random.onclick = () =>  {
    randomColorMode = !randomColorMode;
    random.style.color = randomColorMode ? "green" : "red";
};

document.getElementById("skin").ondrop = event => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    const reader = new FileReader();
    
    // Only process image files
    if (file && file.type.startsWith("image/")) {
        reader.onload = function (event) {
            const img = new Image();
            img.src = event.target.result;

            img.onload = function () {
                pctx.clearRect(0, 0, png.width, png.height);
                pctx.drawImage(img, 0, 0, png.width, png.height);
                derender();
            };
        };
        reader.readAsDataURL(file);
    }
};
document.getElementById("skin").ondragover = event => {
    event.preventDefault();
};

function derender() {
    const data = pctx.getImageData(0, 0, 64, 64).data;

    for (const part in player) {
        for (const face in player[part]) {
            const [x, y, dx, dy] = uv_map[part + "." + face];
            
            for (let i = 0; i < dx; i++) {
                for (let j = 0; j < dy; j++) {
                    const fx = x + i;
                    const fy = y + j;
                
                    const r = data[(fy * 64 + fx) * 4];
                    const g = data[(fy * 64 + fx) * 4 + 1];
                    const b = data[(fy * 64 + fx) * 4 + 2];
                    const a = data[(fy * 64 + fx) * 4 + 3];
                    if (a == 0) player[part][face][j][i] = face.endsWith("_l") ? null : "#000000";
                    else player[part][face][j][i] = rgbToHex(r, g, b);
                }
            }
            render(part, face);
        }
    }
    createWorkArea();
}
