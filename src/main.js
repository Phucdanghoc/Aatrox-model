import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as dat from 'dat.gui';

document.addEventListener('DOMContentLoaded', () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
  camera.position.set(0, 5, 0);
  const canvas = document.getElementById('three-canvas');
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0xffffff);
  renderer.shadowMap.enabled = true; 
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; 

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(0, 10, 5);
  directionalLight.castShadow = true; 
  
  directionalLight.shadow.camera.top = 10;
  directionalLight.shadow.camera.bottom = -10;
  directionalLight.shadow.camera.left = -10;
  directionalLight.shadow.camera.right = 10;
  directionalLight.shadow.camera.near = 0.1;
  directionalLight.shadow.camera.far = 50;
  directionalLight.shadow.mapSize.set(1024, 1024); 
  scene.add(directionalLight);

  const laneGeometry = new THREE.PlaneGeometry(10, 20);
  const laneMaterial = new THREE.ShadowMaterial({ opacity: 0.5 }); 
  const lane = new THREE.Mesh(laneGeometry, laneMaterial);
  lane.rotation.x = -Math.PI / 2;
  lane.position.y = -1;
  lane.receiveShadow = true; 
  scene.add(lane);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const loader = new GLTFLoader();
  let mesh;
  let mixer;
  let gltfRef;

  loader.load('/aatrox.glb', (gltf) => {
    gltfRef = gltf;
    const model = gltf.scene;
    scene.add(model);

    
    model.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true; 
        if (object.morphTargetDictionary) {
          mesh = object;
          console.log('Morph Targets:', object.morphTargetDictionary);
        }
      }
    });

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    mixer = new THREE.AnimationMixer(model);
    const action = mixer.clipAction(gltf.animations[0]);
    action.play();

    model.position.y = -box.min.y;

    camera.position.set(center.x + size.x * 1.5, center.y + size.y * 1.5, center.z + size.z * 1.5);
    camera.lookAt(center);

    controls.target.set(center.x, center.y, center.z);
    controls.update();

    console.log('Animations:', gltf.animations);
    gltf.animations.forEach((clip, index) => {
      console.log(`Animation ${index}: ${clip.name || `Unnamed_${index}`}`);
    });

    setupAnimationGUI();
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const gui = new dat.GUI();
  const control = {
    speed: 1,
    play: () => {
      if (mixer && gltfRef) {
        const action = mixer.clipAction(gltfRef.animations[control.animation]);
        action.paused = false;
        action.play();
      }
    },
    pause: () => {
      if (mixer && gltfRef) {
        const action = mixer.clipAction(gltfRef.animations[control.animation]);
        action.paused = true;
      }
    },
    animation: 0,
  };

  function setupAnimationGUI() {
    if (!gltfRef || !gltfRef.animations || gltfRef.animations.length === 0) {
      console.warn('No animations found in the model.');
      return;
    }

    const animationNames = {};
    gltfRef.animations.forEach((clip, index) => {
      animationNames[clip.name || `Animation_${index}`] = index;
    });

    gui.add(control, 'play').name('Play');
    gui.add(control, 'pause').name('Pause');
    gui.add(control, 'speed', 0.1, 2).name('Speed').onChange((value) => {
      if (mixer && gltfRef) {
        const action = mixer.clipAction(gltfRef.animations[control.animation]);
        action.timeScale = value;
      }
    });
    gui.add(control, 'animation', animationNames).name('Animation').onChange((value) => {
      if (mixer && gltfRef) {
        mixer.stopAllAction();
        const newAction = mixer.clipAction(gltfRef.animations[value]);
        newAction.reset().play();
        newAction.timeScale = control.speed;
      }
    });
  }

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    if (mesh && mesh.morphTargetInfluences) {
      mesh.morphTargetInfluences[0] = Math.sin(Date.now() * 0.001) * 0.5 + 0.5;
    }

    controls.update();
    renderer.render(scene, camera);
  }
  animate();
});
