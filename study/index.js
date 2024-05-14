import * as THREE from '../build/three.module.js';
import { OrbitControls } from "../examples/jsm/controls/OrbitControls.js"
import { GLTFLoader } from "../examples/jsm/loaders/GLTFLoader.js"
import Stats from "../examples/jsm/libs/stats.module.js";

import { Octree } from "../examples/jsm/math/Octree.js"
import { Capsule } from "../examples/jsm/math/Capsule.js"

class App {
    constructor() {
        const divContainer = document.querySelector("#webgl-container");
        this._divContainer = divContainer;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        divContainer.appendChild(renderer.domElement);

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.VSMShadowMap;

        this._renderer = renderer;

        const scene = new THREE.Scene();
        this._scene = scene;

        //this._setupOctree();
        this._setupCamera();
        this._setupLight();
        this._setupModel();
        this._setupControls();

        window.onresize = this.resize.bind(this);
        this.resize();

        requestAnimationFrame(this.render.bind(this));
    }

    _setupOctree(model) {
        this._worldOctree = new Octree();
        this._worldOctree.fromGraphNode(model);
    }

    _setupControls() {
        this._controls = new OrbitControls(this._camera, this._divContainer);
        this._controls.target.set(0, 100, 0);
        this._controls.enablePan = false;
        this._controls.enableDamping = true;

        const stats = new Stats();
        this._divContainer.appendChild(stats.dom);
        this._fps = stats; 
        
        this._pressedKeys = {};

        document.addEventListener("keydown", (event) => {
            this._pressedKeys[event.key.toLowerCase()] = true;
            this._processAnimation();
        });

        document.addEventListener("keyup", (event) => {
            this._pressedKeys[event.key.toLowerCase()] = false;
            this._processAnimation();
        });
    }
    
    _processAnimation() {
        const previousAnimationAction = this._currentAnimationAction;

        if(this._pressedKeys["w"] || this._pressedKeys["a"] || this._pressedKeys["s"] || this._pressedKeys["d"]) {
            if(this._pressedKeys["shift"]) {
                this._currentAnimationAction = this._animationMap["Run"];
                // this._speed = 350;
                this._maxSpeed = 350;
                this._acceleration = 3;                
            } else {
                this._currentAnimationAction = this._animationMap["Walk"];                
                //this._speed = 80;
                this._maxSpeed = 80;
                this._acceleration = 3;
            }
        } else {
            this._currentAnimationAction = this._animationMap["Idle"];
            this._speed = 0;
            this._maxSpeed = 0;
            this._acceleration = 0;
        }

        if(previousAnimationAction !== this._currentAnimationAction) {
            previousAnimationAction.fadeOut(0.5);
            this._currentAnimationAction.reset().fadeIn(0.5).play();
        }
    }

    _setupModel() {
        // const planeGeometry = new THREE.PlaneGeometry(1000, 1000);
        // const planeMaterial = new THREE.MeshPhongMaterial({ color: 0x878787 });
        // const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        // plane.rotation.x = -Math.PI/2;
        // this._scene.add(plane);
        // plane.receiveShadow = true;

        // this._worldOctree.fromGraphNode(plane);

        const loader = new GLTFLoader();

        loader.load("./data/character.glb", (gltf) => {
            const model = gltf.scene;
            this._scene.add(model);

            model.traverse(child => {
                if(child instanceof THREE.Mesh) {
                    child.castShadow = true;            
                }
            });

            const animationClips = gltf.animations; // THREE.AnimationClip[]
            const mixer = new THREE.AnimationMixer(model);
            const animationsMap = {};
            animationClips.forEach(clip => {
                const name = clip.name;
                console.log(name);
                animationsMap[name] = mixer.clipAction(clip); // THREE.AnimationAction
            });

            this._mixer = mixer;
            this._animationMap = animationsMap;
            this._currentAnimationAction = this._animationMap["Idle"];
            this._currentAnimationAction.play();

            const box = (new THREE.Box3).setFromObject(model);
            model.position.y = (box.max.y - box.min.y) / 2;

            const height = box.max.y - box.min.y;
            const diameter =  (box.max.z - box.min.z);
            console.log(diameter)

            model._capsule = new Capsule(
                new THREE.Vector3(0, diameter/2, 0), 
                new THREE.Vector3(0, height - diameter/2, 0), 
                diameter/2
            );            

            const axisHelper = new THREE.AxesHelper(1000);
            this._scene.add(axisHelper);

            const boxHelper = new THREE.BoxHelper(model);
            this._scene.add(boxHelper);          
            this._boxHelper = boxHelper;
            this._model = model;  

            // const boxG = new THREE.BoxGeometry(100, diameter-5, 100);
            // const boxM = new THREE.Mesh(boxG, planeMaterial);
            // boxM.receiveShadow = true;
            // boxM.castShadow = true;
            // boxM.position.set(150, 0, 0);
            // this._scene.add(boxM);    
            
            // this._worldOctree.fromGraphNode(boxM);
        });

        loader.load("./data/daejoen_step06_wall_test05.glb", (gltf) => {
            const model = gltf.scene;

            this._scene.add(model);

            model.traverse(child => {
                if(child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            this._setupOctree(model);
        });

    }

    _setupCamera() {
        const camera = new THREE.PerspectiveCamera(
            60, 
            window.innerWidth / window.innerHeight, 
            1, 
            10000
        );

        camera.position.set(0, 100, 500);
        this._camera = camera;
    }

    _addPointLight(x, y, z, helperColor) {
        const color = 0xffffff;
        const intensity = 1.5;
    
        const pointLight = new THREE.PointLight(color, intensity, 2000);
        pointLight.position.set(x, y, z);
    
        this._scene.add(pointLight);
    
        const pointLightHelper = new THREE.PointLightHelper(pointLight, 10, helperColor);
        this._scene.add(pointLightHelper);
    }

    _setupLight() {
        const ambientLight = new THREE.AmbientLight(0xffffff, .5);
        this._scene.add(ambientLight);

        //this._addPointLight(500, 150, 500, 0xff0000);
        //this._addPointLight(-500, 150, 500, 0xffff00);
        //this._addPointLight(-500, 150, -500, 0x00ff00);
        //this._addPointLight(500, 150, -500, 0x0000ff);

        const shadowLight = new THREE.DirectionalLight(0xffffff, 1.5);
        shadowLight.position.set(-300, 1500, 800);
        shadowLight.target.position.set(100, 0, 200);
        const directionalLightHelper = new THREE.DirectionalLightHelper(shadowLight, 10);
        this._scene.add(directionalLightHelper);
        
        this._scene.add(shadowLight);
        this._scene.add(shadowLight.target);

        shadowLight.castShadow = true;
        shadowLight.shadow.mapSize.width = 4096;
        shadowLight.shadow.mapSize.height = 4096;
        shadowLight.shadow.camera.top = shadowLight.shadow.camera.right = 3000;
        shadowLight.shadow.camera.bottom = shadowLight.shadow.camera.left = -3000;
        shadowLight.shadow.camera.near = 100;
        shadowLight.shadow.camera.far = 3000;
        shadowLight.shadow.radius = 5;
        const shadowCameraHelper = new THREE.CameraHelper(shadowLight.shadow.camera);
        this._scene.add(shadowCameraHelper);
    }    

    _previousDirectionOffset = 0;

    _directionOffset() {
        const pressedKeys = this._pressedKeys;
        let directionOffset = 0 // w

        if (pressedKeys['w']) {
            if (pressedKeys['a']) {
                directionOffset = Math.PI / 4 // w+a (45도)
            } else if (pressedKeys['d']) {
                directionOffset = - Math.PI / 4 // w+d (-45도)
            }
        } else if (pressedKeys['s']) {
            if (pressedKeys['a']) {
                directionOffset = Math.PI / 4 + Math.PI / 2 // s+a (135도)
            } else if (pressedKeys['d']) {
                directionOffset = -Math.PI / 4 - Math.PI / 2 // s+d (-135도)
            } else {
                directionOffset = Math.PI // s (180도)
            }
        } else if (pressedKeys['a']) {
            directionOffset = Math.PI / 2 // a (90도)
        } else if (pressedKeys['d']) {
            directionOffset = - Math.PI / 2 // d (-90도)
        } else {
            directionOffset = this._previousDirectionOffset;
        }

        this._previousDirectionOffset = directionOffset;

        return directionOffset;        
    }

    _speed = 0;
    _maxSpeed = 0;
    _acceleration = 0;

    _bOnTheGround = false;
    _fallingAcceleration = 0;
    _fallingSpeed = 0;  

    update(time) {
        time *= 0.001; // second unit

        this._controls.update();

        if(this._boxHelper) {
            this._boxHelper.update();
        }

        this._fps.update();

        if(this._mixer) {
            const deltaTime = time - this._previousTime;
            this._mixer.update(deltaTime);

            const angleCameraDirectionAxisY = Math.atan2(
                (this._camera.position.x - this._model.position.x),
                (this._camera.position.z - this._model.position.z)
            ) + Math.PI;

            const rotateQuarternion = new THREE.Quaternion();
            rotateQuarternion.setFromAxisAngle(
                new THREE.Vector3(0,1,0), 
                angleCameraDirectionAxisY + this._directionOffset()
            );
            
            this._model.quaternion.rotateTowards(rotateQuarternion, THREE.MathUtils.degToRad(5));            

            const walkDirection = new THREE.Vector3();
            this._camera.getWorldDirection(walkDirection);

            //walkDirection.y = 0;
            walkDirection.y = this._bOnTheGround ? 0 : -1;
            walkDirection.normalize();

            walkDirection.applyAxisAngle(new THREE.Vector3(0,1,0), this._directionOffset());

            if(this._speed < this._maxSpeed) this._speed += this._acceleration;
            else this._speed -= this._acceleration*2;

            if(!this._bOnTheGround) {
                this._fallingAcceleration += 1;
                this._fallingSpeed += Math.pow(this._fallingAcceleration, 2);
            } else {
                this._fallingAcceleration = 0;
                this._fallingSpeed = 0;
            }

            const velocity = new THREE.Vector3(
                walkDirection.x * this._speed, 
                walkDirection.y * this._fallingSpeed, 
                walkDirection.z * this._speed
            );

            const deltaPosition = velocity.clone().multiplyScalar(deltaTime);

            // const moveX = walkDirection.x * (this._speed * deltaTime);
            // const moveZ = walkDirection.z * (this._speed * deltaTime);

            // this._model.position.x += moveX;
            // this._model.position.z += moveZ;    

            this._model._capsule.translate(deltaPosition);

            const result = this._worldOctree.capsuleIntersect(this._model._capsule);
            if(result) { // 충돌한 경우
                this._model._capsule.translate(result.normal.multiplyScalar(result.depth));
                this._bOnTheGround = true; 
            } else { // 충돌하지 않은 경우
                this._bOnTheGround = false;
            }

            const previousPosition = this._model.position.clone();
            const capsuleHeight =  this._model._capsule.end.y - this._model._capsule.start.y 
                + this._model._capsule.radius*2;
            this._model.position.set(
                this._model._capsule.start.x, 
                this._model._capsule.start.y - this._model._capsule.radius + capsuleHeight/2, 
                this._model._capsule.start.z
            );             

            // this._camera.position.x += moveX;
            // this._camera.position.z += moveZ;
            this._camera.position.x -= previousPosition.x - this._model.position.x;
            this._camera.position.z -= previousPosition.z - this._model.position.z;            
            
            this._controls.target.set(
                this._model.position.x,
                this._model.position.y,
                this._model.position.z,
            );
            
        }
        this._previousTime = time;
    }

    render(time) {
        this._renderer.render(this._scene, this._camera);   
        this.update(time);

        requestAnimationFrame(this.render.bind(this));
    }

    resize() {
        const width = this._divContainer.clientWidth;
        const height = this._divContainer.clientHeight;

        this._camera.aspect = width / height;
        this._camera.updateProjectionMatrix();
        
        this._renderer.setSize(width, height);
    }
}

window.onload = function () {
    new App();
}