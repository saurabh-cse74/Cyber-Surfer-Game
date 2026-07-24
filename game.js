// Subway Cyber-Runner - 3D Endless Runner Game Engine
// Built using Three.js

// --- GAME CONFIGURATION ---
const LANE_WIDTH = 4;
const LANES = [-LANE_WIDTH, 0, LANE_WIDTH]; // Left, Middle, Right
let START_SPEED = 25; // Dynamic based on difficulty
const MAX_SPEED = 70;
const ACCELERATION = 0.15; // Speed increase per second
const JUMP_FORCE = 15;
const GRAVITY = 35;
const SLIDE_DURATION = 800; // ms
const TRACK_SEGMENT_LENGTH = 100;
const MAX_TRACK_SEGMENTS = 5;

// Save state & upgrades & missions & settings
let gameState = {
    coins: 0,
    highScore: 0,
    hoverboards: 2,
    selectedCharacter: 'jake',
    unlockedCharacters: ['jake'],
    upgrades: {
        jetpack: 1, // 1-5 levels
        magnet: 1,
        multiplier: 1,
        sneakers: 1, // 1-5 levels
        shield: 1,
        reflexes: 1,
        booster: 1
    },
    missions: [],
    settings: {
        music: 80,
        sfx: 80,
        graphics: 'high',
        difficulty: 'normal'
    }
};

// Powerup durations in milliseconds (Level 1: 5s, Level 5: 15s)
const getPowerupDuration = (level) => (3 + level * 2) * 1000;

function getPlayerLevel() {
    const score = gameState.highScore || 0;
    if (score < 1000) return 1;
    if (score < 3000) return 2;
    if (score < 6000) return 3;
    if (score < 10000) return 4;
    if (score < 15000) return 5;
    if (score < 22000) return 6;
    if (score < 30000) return 7;
    if (score < 40000) return 8;
    if (score < 50000) return 9;
    return 10;
}

function getCharacterPerkValue(charKey, level) {
    const db = CHARACTER_DB[charKey];
    if (!db) return 0;
    const levelFactor = level || 1;
    // Scales linearly: base value + 15% increase per level above Level 1
    return db.basePerkVal + (levelFactor - 1) * (db.basePerkVal * 0.15);
}

// Character database
const CHARACTER_DB = {
    jake: { name: 'NEON JAKE', price: 0, color: 0x00f3ff, description: 'Classic street surfer equipped with cyber implants.', icon: '⚡', perk: 'MAGNET DUR. +', basePerkVal: 10, perkSuffix: '%', reqLevel: 1 },
    tricky: { name: 'TRICKY 2.0', price: 200, color: 0xff007f, description: 'Aggressive roller hacker with a hyper-pink hairstyle.', icon: '🔥', perk: 'SCORE MULT. +', basePerkVal: 10, perkSuffix: '%', reqLevel: 2 },
    yutani: { name: 'YUTANI MECH', price: 500, color: 0x39ff14, description: 'Experimental bio-mechanical suit from outer space.', icon: '👽', perk: 'JETPACK FUEL +', basePerkVal: 15, perkSuffix: '%', reqLevel: 3 },
    spike: { name: 'CYBER SPIKE', price: 800, color: 0xffaa00, description: 'Punk cyber-ninja with dual energy plasma blades.', icon: '🥷', perk: 'SHIELD TIME +', basePerkVal: 2.0, perkSuffix: 's', reqLevel: 4 },
    eve: { name: 'A.I. EVE', price: 1200, color: 0xd400ff, description: 'Holographic synthetic intelligence avatar. Glitch-weaver.', icon: '🤖', perk: 'SLOW-MO DUR. +', basePerkVal: 15, perkSuffix: '%', reqLevel: 5 },
    gold: { name: 'GOLD RUNNER', price: 2000, color: 0xffd700, description: 'Solid gold cybernetic shell. Golden transmutations.', icon: '👑', perk: 'CHANCE x2 COIN: ', basePerkVal: 15, perkSuffix: '%', reqLevel: 6 }
};

// Shop upgrade database
const UPGRADE_DB = {
    jetpack: { name: 'JETPACK FLIGHT', basePrice: 100, icon: 'rocket', color: '#00f3ff', desc: 'Fly above the cyber rails collecting coins.' },
    magnet: { name: 'COIN MAGNET', basePrice: 100, icon: 'magnet', color: '#ff007f', desc: 'Pull coins from adjacent lanes automatically.' },
    multiplier: { name: '2X SCORE MULTI', basePrice: 150, icon: 'bolt', color: '#ff5500', desc: 'Double your score multiplier temporarily.' },
    sneakers: { name: 'SUPER SNEAKERS', basePrice: 120, icon: 'shoe-prints', color: '#39ff14', desc: 'Jump twice as high to bypass trains easily.' },
    shield: { name: 'ENERGY SHIELD', basePrice: 130, icon: 'shield-halved', color: '#0055ff', desc: 'Shield yourself from a single crash.' },
    reflexes: { name: 'CYBER REFLEXES', basePrice: 140, icon: 'clock', color: '#a000ff', desc: 'Slow down time to navigate obstacles easily.' },
    booster: { name: 'SCORE ENGINE', basePrice: 200, icon: 'microchip', color: '#ffaa00', desc: 'Permanently increases base score multiplier.' },
    hoverboard: { name: 'HOVERBOARD DECK', basePrice: 50, icon: 'skateboard', color: '#ffd700', desc: 'Buy single-use boards to shield from crashes.' }
};

// Missions Pool (Pick 3 random active missions)
const MISSIONS_POOL = [
    { id: 'surf_dist', desc: 'Surf 800m in one run', target: 800, reward: 80, type: 'distance' },
    { id: 'collect_coins', desc: 'Collect 50 coins in one run', target: 50, reward: 60, type: 'coins' },
    { id: 'use_board', desc: 'Use a hoverboard in a run', target: 1, reward: 100, type: 'hoverboard' },
    { id: 'reach_score', desc: 'Reach 8,000 points', target: 8000, reward: 120, type: 'score' },
    { id: 'jump_count', desc: 'Jump 12 times', target: 12, reward: 50, type: 'jumps' }
];

// --- CORE GAME STATE VARIABLES ---
let scene, camera, renderer, dirLight;
let playerGroup, playerBody, characterMeshes = {};
let playerLight;
let tracksGroup, obstaclesGroup, coinsGroup, powerupsGroup, particlesGroup;

let isGameActive = false;
let isGamePaused = false;
let isGameLoading = true;
let score = 0;
let coinsCollectedThisRun = 0;
let boxesCollectedThisRun = 0;
let runSpeed = START_SPEED;
let scoreMultiplier = 1;

let currentLane = 1; // 0=Left, 1=Middle, 2=Right
let playerX = 0;
let playerY = 0;
let playerZ = 0;

// Movement physics
let verticalVelocity = 0;
let isJumping = false;
let isRolling = false;
let rollTimer = 0;

// Powerup states
let activePowerups = {
    jetpack: { active: false, timer: 0, max: 0 },
    magnet: { active: false, timer: 0, max: 0 },
    multiplier: { active: false, timer: 0, max: 0 },
    sneakers: { active: false, timer: 0, max: 0 },
    shield: { active: false, timer: 0, max: 0 },
    reflexes: { active: false, timer: 0, max: 0 },
    hoverboard: { active: false }
};

// Active run progression
let currentRunStats = {
    distance: 0,
    coins: 0,
    hoverboardsUsed: 0,
    score: 0,
    jumps: 0
};

let lastObstacleZ = -50;
const obstacleSpawnInterval = 60; // Spawn every 60 meters
const trainSkins = [0xff0055, 0x00aaee, 0x7700ff];

// Animation mixers/variables
let clock = new THREE.Clock();
let particles = [];

// --- INITIALIZATION ---

window.addEventListener('load', () => {
    loadGameData();
    initThreeJS();
    initUI();
    animate();
    
    // Hide loading screen, show main menu after scene settles
    setTimeout(() => {
        isGameLoading = false;
        document.getElementById('loading-screen').classList.remove('active');
        document.getElementById('main-menu').classList.add('active');
    }, 1500);
});

function loadGameData() {
    const saved = localStorage.getItem('subway_cyber_runner_save');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            gameState = { ...gameState, ...parsed };
            // Deep merge safety
            if (parsed.upgrades) gameState.upgrades = { ...gameState.upgrades, ...parsed.upgrades };
            if (parsed.missions) gameState.missions = parsed.missions;
            if (parsed.settings) gameState.settings = { ...gameState.settings, ...parsed.settings };
        } catch (e) {
            console.error('Failed to parse save game.', e);
        }
    }

    // Ensure settings are fully set
    if (!gameState.settings) {
        gameState.settings = {
            music: 80,
            sfx: 80,
            graphics: 'high',
            difficulty: 'normal'
        };
    } else {
        gameState.settings = {
            music: 80,
            sfx: 80,
            graphics: 'high',
            difficulty: 'normal',
            ...gameState.settings
        };
    }

    // Verify missions are set
    if (!gameState.missions || gameState.missions.length === 0) {
        rollNewMissions();
    }

    // Apply audio configurations
    if (window.gameAudio) {
        window.gameAudio.setMusicVolume(gameState.settings.music);
        window.gameAudio.setSfxVolume(gameState.settings.sfx);
    }
    
    updateUIStats();
}

function saveGameData() {
    localStorage.setItem('subway_cyber_runner_save', JSON.stringify(gameState));
    updateUIStats();
}

function rollNewMissions() {
    const pool = [...MISSIONS_POOL];
    const shuffled = pool.sort(() => 0.5 - Math.random());
    gameState.missions = shuffled.slice(0, 3).map(m => ({
        ...m,
        progress: 0,
        completed: false
    }));
}

function initThreeJS() {
    const canvas = document.getElementById('game-canvas');
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060b);
    scene.fog = new THREE.FogExp2(0x05060b, 0.015);

    // Camera
    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 5, 8);
    camera.lookAt(new THREE.Vector3(0, 1.5, -20));

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    dirLight = new THREE.DirectionalLight(0x00f3ff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    scene.add(dirLight);

    playerLight = new THREE.PointLight(0x00f3ff, 1.5, 15);
    playerLight.position.set(0, 1.5, 0);
    scene.add(playerLight);

    // Groups
    tracksGroup = new THREE.Group();
    obstaclesGroup = new THREE.Group();
    coinsGroup = new THREE.Group();
    powerupsGroup = new THREE.Group();
    particlesGroup = new THREE.Group();
    
    scene.add(tracksGroup);
    scene.add(obstaclesGroup);
    scene.add(coinsGroup);
    scene.add(powerupsGroup);
    scene.add(particlesGroup);

    buildPlayer();
    buildInitialTracks();

    // Apply saved graphics configurations
    applyGraphicsQuality(gameState.settings.graphics);

    window.addEventListener('resize', onWindowResize);
}

// --- WORLD GENERATORS ---

function buildPlayer() {
    playerGroup = new THREE.Group();
    playerGroup.position.set(0, 0, 0);
    scene.add(playerGroup);

    const charColor = CHARACTER_DB[gameState.selectedCharacter].color;
    const isGoldSkin = gameState.selectedCharacter === 'gold';
    
    playerBody = new THREE.Group();
    playerBody.position.y = 0.9;
    playerGroup.add(playerBody);

    // 1. Torso (Organic shape using Cylinder/Box hierarchy)
    const torsoGeo = new THREE.CylinderGeometry(0.3, 0.22, 0.75, 8);
    const torsoMat = new THREE.MeshStandardMaterial({ 
        color: charColor, 
        roughness: isGoldSkin ? 0.1 : 0.4,
        metalness: isGoldSkin ? 0.9 : 0.2 
    });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.castShadow = true;
    playerBody.add(torso);

    // Cyber Jacket Accents
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.15, 8), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 }));
    collar.position.y = 0.42;
    playerBody.add(collar);

    // 2. Head & Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.15, 8), new THREE.MeshPhongMaterial({ color: 0xffddcc }));
    neck.position.y = 0.48;
    playerBody.add(neck);

    const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const skinMat = new THREE.MeshPhongMaterial({ color: isGoldSkin ? 0xffd700 : 0xffddcc });
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 0.66;
    head.castShadow = true;
    playerBody.add(head);

    // visor/helmet style glasses
    const visorGeo = new THREE.BoxGeometry(0.32, 0.08, 0.15);
    const visorMat = new THREE.MeshBasicMaterial({ color: isGoldSkin ? 0xffffff : 0x00f3ff });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.68, -0.18);
    playerBody.add(visor);

    // 3. Legs (Jointed Thigh + Shin + Foot hierarchy)
    const limbMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
    
    // Left Leg HIP Joint
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.16, -0.36, 0);

    const leftThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.4, 8), limbMat);
    leftThigh.position.y = -0.2;
    leftThigh.castShadow = true;
    leftLegGroup.add(leftThigh);

    // Left Knee Joint / Shin
    const leftShinGroup = new THREE.Group();
    leftShinGroup.position.set(0, -0.4, 0);

    const leftShin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.4, 8), limbMat);
    leftShin.position.y = -0.2;
    leftShin.castShadow = true;
    leftShinGroup.add(leftShin);

    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.28), torsoMat);
    leftShoe.position.set(0, -0.4, -0.05);
    leftShoe.castShadow = true;
    leftShinGroup.add(leftShoe);

    // SNEAKER SHELL (Invisible by default, turns green on active powerup)
    const leftSneaker = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.3), new THREE.MeshBasicMaterial({ color: 0x39ff14 }));
    leftSneaker.position.set(0, -0.4, -0.05);
    leftSneaker.name = "sneaker_l";
    leftSneaker.visible = false;
    leftShinGroup.add(leftSneaker);

    leftLegGroup.add(leftShinGroup);
    playerBody.add(leftLegGroup);

    // Right Leg HIP Joint
    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.16, -0.36, 0);

    const rightThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.4, 8), limbMat);
    rightThigh.position.y = -0.2;
    rightThigh.castShadow = true;
    rightLegGroup.add(rightThigh);

    // Right Knee Joint / Shin
    const rightShinGroup = new THREE.Group();
    rightShinGroup.position.set(0, -0.4, 0);

    const rightShin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.4, 8), limbMat);
    rightShin.position.y = -0.2;
    rightShin.castShadow = true;
    rightShinGroup.add(rightShin);

    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.28), torsoMat);
    rightShoe.position.set(0, -0.4, -0.05);
    rightShoe.castShadow = true;
    rightShinGroup.add(rightShoe);

    const rightSneaker = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.3), new THREE.MeshBasicMaterial({ color: 0x39ff14 }));
    rightSneaker.position.set(0, -0.4, -0.05);
    rightSneaker.name = "sneaker_r";
    rightSneaker.visible = false;
    rightShinGroup.add(rightSneaker);

    rightLegGroup.add(rightShinGroup);
    playerBody.add(rightLegGroup);

    // 4. Arms (Jointed Shoulder + Forearm + Hand)
    const sleeveMat = torsoMat; // matching jacket color

    // Left Arm SHOULDER Joint
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.35, 0.3, 0);

    const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.35, 8), sleeveMat);
    leftUpperArm.position.y = -0.175;
    leftUpperArm.castShadow = true;
    leftArmGroup.add(leftUpperArm);

    // Left Elbow Joint / Forearm
    const leftForearmGroup = new THREE.Group();
    leftForearmGroup.position.set(0, -0.35, 0);

    const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.35, 8), limbMat);
    leftForearm.position.y = -0.175;
    leftForearm.castShadow = true;
    leftForearmGroup.add(leftForearm);

    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), skinMat);
    leftHand.position.y = -0.36;
    leftForearmGroup.add(leftHand);

    leftArmGroup.add(leftForearmGroup);
    playerBody.add(leftArmGroup);

    // Right Arm SHOULDER Joint
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.35, 0.3, 0);

    const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.35, 8), sleeveMat);
    rightUpperArm.position.y = -0.175;
    rightUpperArm.castShadow = true;
    rightArmGroup.add(rightUpperArm);

    // Right Elbow Joint / Forearm
    const rightForearmGroup = new THREE.Group();
    rightForearmGroup.position.set(0, -0.35, 0);

    const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.35, 8), limbMat);
    rightForearm.position.y = -0.175;
    rightForearm.castShadow = true;
    rightForearmGroup.add(rightForearm);

    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), skinMat);
    rightHand.position.y = -0.36;
    rightForearmGroup.add(rightHand);

    rightArmGroup.add(rightForearmGroup);
    playerBody.add(rightArmGroup);

    // 5. Unique Skin Details / Poly Hair styles
    const hatMat = new THREE.MeshPhongMaterial({ color: 0x111111 });

    if (gameState.selectedCharacter === 'jake') {
        // Backwards cap
        const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12, 0, Math.PI*2, 0, Math.PI/2), hatMat);
        capDome.position.y = 0.67;
        playerBody.add(capDome);

        const capVisor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.28), hatMat);
        capVisor.position.set(0, 0.76, 0.28);
        capVisor.rotation.x = -0.15;
        playerBody.add(capVisor);

        // Cyber neck headphone collar
        const hp = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.05, 8, 16), new THREE.MeshBasicMaterial({ color: 0x00f3ff }));
        hp.position.set(0, 0.42, 0.02);
        hp.rotation.x = Math.PI / 2 + 0.1;
        playerBody.add(hp);
    } 
    else if (gameState.selectedCharacter === 'tricky') {
        // Pink Hacker Spiky Hair
        const hairMat = new THREE.MeshPhongMaterial({ color: 0xff007f, shininess: 40 });
        for (let sx = -0.15; sx <= 0.15; sx += 0.15) {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.38, 4), hairMat);
            spike.position.set(sx, 0.88, -0.05);
            spike.rotation.set(0.3, 0, sx * -1.5);
            playerBody.add(spike);
        }
    } 
    else if (gameState.selectedCharacter === 'yutani') {
        // Alien bio antennas
        const antMat = new THREE.MeshPhongMaterial({ color: 0x39ff14 });
        const stemGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.25, 8);
        const tipGeo = new THREE.SphereGeometry(0.06, 8, 8);
        
        const leftAnt = new THREE.Group();
        leftAnt.position.set(-0.15, 0.85, -0.02);
        leftAnt.rotation.z = -0.4;
        leftAnt.add(new THREE.Mesh(stemGeo, antMat));
        const tipL = new THREE.Mesh(tipGeo, new THREE.MeshBasicMaterial({ color: 0x39ff14 }));
        tipL.position.y = 0.125;
        leftAnt.add(tipL);
        playerBody.add(leftAnt);

        const rightAnt = new THREE.Group();
        rightAnt.position.set(0.15, 0.85, -0.02);
        rightAnt.rotation.z = 0.4;
        rightAnt.add(new THREE.Mesh(stemGeo, antMat));
        const tipR = new THREE.Mesh(tipGeo, new THREE.MeshBasicMaterial({ color: 0x39ff14 }));
        tipR.position.y = 0.125;
        rightAnt.add(tipR);
        playerBody.add(rightAnt);
    } 
    else if (gameState.selectedCharacter === 'spike') {
        // Ninja visor band
        const visorMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.45), visorMat);
        visor.position.set(0, 0.65, 0.1);
        playerBody.add(visor);
        
        // Back energy blades
        const bladeMat = new THREE.MeshPhongMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 0.5 });
        const bladeL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.12), bladeMat);
        bladeL.position.set(-0.25, 0.2, 0.28);
        bladeL.rotation.set(0.2, -0.1, -0.4);
        playerBody.add(bladeL);
        
        const bladeR = bladeL.clone();
        bladeR.position.x = 0.25;
        bladeR.rotation.set(0.2, 0.1, 0.4);
        playerBody.add(bladeR);
    }
    else if (gameState.selectedCharacter === 'eve') {
        // Holographic floating ring above head
        const haloMat = new THREE.MeshBasicMaterial({ color: 0xd400ff });
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 24), haloMat);
        halo.position.set(0, 0.95, 0);
        halo.rotation.x = Math.PI / 2;
        playerBody.add(halo);
        
        // Cyber bunny ears
        const earMat = new THREE.MeshPhongMaterial({ color: 0xd400ff });
        const earL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 4), earMat);
        earL.position.set(-0.15, 0.92, -0.05);
        earL.rotation.set(-0.2, 0, 0.25);
        playerBody.add(earL);
        
        const earR = earL.clone();
        earR.position.x = 0.15;
        earR.rotation.set(-0.2, 0, -0.25);
        playerBody.add(earR);
    }
    else if (gameState.selectedCharacter === 'gold') {
        // Imperial golden crown
        const crownMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 });
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.18, 5, 1, true), crownMat);
        crown.position.set(0, 0.9, 0);
        playerBody.add(crown);

        // Golden wings on ankles
        const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.25), crownMat);
        wingL.position.set(-0.3, -0.85, 0.05);
        playerGroup.add(wingL);
        
        const wingR = wingL.clone();
        wingR.position.x = 0.3;
        playerGroup.add(wingR);
    }

    // Jetpack Mesh
    const jetpackGroup = new THREE.Group();
    jetpackGroup.position.set(0, 0.1, 0.28);
    jetpackGroup.name = "jetpack";
    jetpackGroup.visible = false;
    
    const thrusterGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.6, 8);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.2 });
    
    const leftThruster = new THREE.Mesh(thrusterGeo, metalMat);
    leftThruster.position.x = -0.15;
    leftThruster.rotation.z = -0.1;
    jetpackGroup.add(leftThruster);
    
    const rightThruster = new THREE.Mesh(thrusterGeo, metalMat);
    rightThruster.position.x = 0.15;
    rightThruster.rotation.z = 0.1;
    jetpackGroup.add(rightThruster);
    
    const fuelTank = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.2), metalMat);
    jetpackGroup.add(fuelTank);
    playerBody.add(jetpackGroup);

    // Hoverboard Mesh
    const hoverboardGroup = new THREE.Group();
    hoverboardGroup.position.set(0, -0.85, 0);
    hoverboardGroup.name = "hoverboard";
    hoverboardGroup.visible = false;

    const boardMat = new THREE.MeshStandardMaterial({ color: charColor, emissive: charColor, emissiveIntensity: 0.5, roughness: 0.1 });
    const boardDeck = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 1.8), boardMat);
    boardDeck.castShadow = true;
    hoverboardGroup.add(boardDeck);

    const hoverThrusterGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 8);
    const hoverThrusterMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const thruster1 = new THREE.Mesh(hoverThrusterGeo, hoverThrusterMat);
    thruster1.position.set(0, -0.06, 0.4);
    hoverboardGroup.add(thruster1);

    const thruster2 = new THREE.Mesh(hoverThrusterGeo, hoverThrusterMat);
    thruster2.position.set(0, -0.06, -0.4);
    hoverboardGroup.add(thruster2);

    playerGroup.add(hoverboardGroup);

    // Energy Shield Bubble Mesh (collectible shield)
    const shieldBubbleMat = new THREE.MeshBasicMaterial({
        color: 0x0055ff,
        transparent: true,
        opacity: 0.28,
        wireframe: true
    });
    const shieldBubble = new THREE.Mesh(new THREE.SphereGeometry(1.25, 16, 16), shieldBubbleMat);
    shieldBubble.name = "shieldBubble";
    shieldBubble.visible = false;
    playerGroup.add(shieldBubble);

    characterMeshes = {
        leftLeg: leftLegGroup,
        rightLeg: rightLegGroup,
        leftShin: leftShinGroup,
        rightShin: rightShinGroup,
        leftArm: leftArmGroup,
        rightArm: rightArmGroup,
        leftForearm: leftForearmGroup,
        rightForearm: rightForearmGroup,
        leftSneaker: leftSneaker,
        rightSneaker: rightSneaker,
        jetpack: jetpackGroup,
        hoverboard: hoverboardGroup,
        shieldBubble: shieldBubble,
        head: head
    };
}

function updateCharacterModel() {
    if (playerGroup) {
        playerGroup.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
        scene.remove(playerGroup);
    }
    buildPlayer();
    playerGroup.position.set(LANES[currentLane], playerY, playerZ);
}

function buildInitialTracks() {
    for (let i = 0; i < MAX_TRACK_SEGMENTS; i++) {
        createTrackSegment(-i * TRACK_SEGMENT_LENGTH);
    }
}

function createTrackSegment(zPos) {
    const trackSegment = new THREE.Group();
    trackSegment.position.z = zPos;
    trackSegment.name = "track";

    const segmentIndex = Math.floor(Math.abs(zPos) / 100); // 100 is TRACK_SEGMENT_LENGTH
    const isMetroStation = (segmentIndex % 6 === 5); // Every 6th segment is a Delhi Metro Station

    const floorGeo = new THREE.PlaneGeometry(24, TRACK_SEGMENT_LENGTH);
    const floorMat = isMetroStation 
        ? new THREE.MeshStandardMaterial({ color: 0x4a4c54, roughness: 0.3 }) // Granite tile floors
        : new THREE.MeshStandardMaterial({ color: 0x101116, roughness: 0.9 }); // Dark concrete
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    trackSegment.add(floor);

    const railMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9, roughness: 0.1 });
    const railGeo = new THREE.BoxGeometry(0.12, 0.1, TRACK_SEGMENT_LENGTH);
    
    LANES.forEach(lx => {
        const r1 = new THREE.Mesh(railGeo, railMat);
        r1.position.set(lx - 0.7, 0.05, 0);
        r1.receiveShadow = true;
        trackSegment.add(r1);

        const r2 = new THREE.Mesh(railGeo, railMat);
        r2.position.set(lx + 0.7, 0.05, 0);
        r2.receiveShadow = true;
        trackSegment.add(r2);

        const tieGeo = new THREE.BoxGeometry(1.6, 0.04, 0.3);
        const tieMat = new THREE.MeshStandardMaterial({ color: 0x1d1e24, roughness: 0.8 });
        
        for (let tz = -TRACK_SEGMENT_LENGTH/2; tz < TRACK_SEGMENT_LENGTH/2; tz += 3) {
            const tie = new THREE.Mesh(tieGeo, tieMat);
            tie.position.set(lx, 0.02, tz);
            tie.receiveShadow = true;
            trackSegment.add(tie);
        }
    });

    if (isMetroStation) {
        // --- DELHI METRO STATION PLATFORM THEME ---
        // 1. Yellow tactile safety paths
        const tactileGeo = new THREE.BoxGeometry(0.18, 0.03, TRACK_SEGMENT_LENGTH);
        const tactileMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 }); // Delhi yellow safety path
        
        const leftTactile = new THREE.Mesh(tactileGeo, tactileMat);
        leftTactile.position.set(-8.0, 0.02, 0);
        trackSegment.add(leftTactile);

        const rightTactile = leftTactile.clone();
        rightTactile.position.x = 8.0;
        trackSegment.add(rightTactile);

        // 2. Left and Right Elevated Station Platforms
        const platGeo = new THREE.BoxGeometry(4.5, 0.8, TRACK_SEGMENT_LENGTH);
        const platMat = new THREE.MeshStandardMaterial({ color: 0xc4c7cc, roughness: 0.6 });
        
        const leftPlat = new THREE.Mesh(platGeo, platMat);
        leftPlat.position.set(-10.25, 0.4, 0);
        leftPlat.receiveShadow = true;
        trackSegment.add(leftPlat);

        const rightPlat = leftPlat.clone();
        rightPlat.position.x = 10.25;
        trackSegment.add(rightPlat);

        // 3. Iconic blue/yellow DMRC Signboard
        const boardGeo = new THREE.BoxGeometry(0.15, 1.4, 5.0);
        const boardMat = new THREE.MeshPhongMaterial({ color: 0x003ba8 }); // Delhi Metro iconic blue
        
        const leftBoard = new THREE.Mesh(boardGeo, boardMat);
        leftBoard.position.set(-12.4, 2.5, 0);
        trackSegment.add(leftBoard);
        
        const rightBoard = leftBoard.clone();
        rightBoard.position.x = 12.4;
        trackSegment.add(rightBoard);

        const bannerBackGeo = new THREE.BoxGeometry(0.18, 0.9, 4.6);
        const bannerBackMat = new THREE.MeshBasicMaterial({ color: 0xffd700 }); // DMRC Yellow accent band
        
        const leftBanner = new THREE.Mesh(bannerBackGeo, bannerBackMat);
        leftBanner.position.set(-12.38, 2.5, 0);
        trackSegment.add(leftBanner);

        const rightBanner = leftBanner.clone();
        rightBanner.position.x = 12.38;
        trackSegment.add(rightBanner);

        // 4. Arched ceiling steel truss frames
        for (let az = -TRACK_SEGMENT_LENGTH/2; az < TRACK_SEGMENT_LENGTH/2; az += 25) {
            const trussGroup = new THREE.Group();
            trussGroup.position.set(0, 0, az);

            // Large steel vault roof arch
            const archGeo = new THREE.TorusGeometry(12.5, 0.22, 8, 24, Math.PI);
            const trussMat = new THREE.MeshStandardMaterial({ color: 0x8a99a6, metalness: 0.8 });
            const arch = new THREE.Mesh(archGeo, trussMat);
            arch.position.set(0, 0.8, 0);
            trussGroup.add(arch);

            // Supporting platform columns
            const colGeo = new THREE.CylinderGeometry(0.28, 0.28, 8.5, 8);
            const col1 = new THREE.Mesh(colGeo, trussMat);
            col1.position.set(-12.2, 4.25, 0);
            col1.castShadow = true;
            trussGroup.add(col1);

            const col2 = col1.clone();
            col2.position.x = 12.2;
            trussGroup.add(col2);

            // Station fluorescent white lighting bars
            const stationLightGeo = new THREE.BoxGeometry(5, 0.1, 0.4);
            const stationLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const sLight = new THREE.Mesh(stationLightGeo, stationLightMat);
            sLight.position.set(0, 8.2, 0);
            trussGroup.add(sLight);

            trackSegment.add(trussGroup);
        }

    } else {
        // --- SUBWAY TUNNEL INNER THEME ---
        const wallGeo = new THREE.BoxGeometry(1, 10, TRACK_SEGMENT_LENGTH);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x0c0d12, roughness: 0.7 });
        
        const leftWall = new THREE.Mesh(wallGeo, wallMat);
        leftWall.position.set(-10, 5, 0);
        leftWall.receiveShadow = true;
        trackSegment.add(leftWall);

        const rightWall = new THREE.Mesh(wallGeo, wallMat);
        rightWall.position.set(10, 5, 0);
        rightWall.receiveShadow = true;
        trackSegment.add(rightWall);

        const lineGeo = new THREE.BoxGeometry(0.1, 0.1, TRACK_SEGMENT_LENGTH);

        for (let height = 2; height <= 8; height += 3) {
            const lLine = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({ color: 0x00f3ff }));
            lLine.position.set(-9.4, height, 0);
            lLine.name = "neon_line_left";
            trackSegment.add(lLine);

            const rLine = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({ color: 0xff007f }));
            rLine.position.set(9.4, height, 0);
            rLine.name = "neon_line_right";
            trackSegment.add(rLine);
        }

        for (let az = -TRACK_SEGMENT_LENGTH/2; az < TRACK_SEGMENT_LENGTH/2; az += 25) {
            const archGroup = new THREE.Group();
            archGroup.position.set(0, 0, az);

            const pillarGeo = new THREE.CylinderGeometry(0.2, 0.2, 8, 8);
            const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1a1a24, metalness: 0.5 });
            
            const p1 = new THREE.Mesh(pillarGeo, pillarMat);
            p1.position.set(-9.5, 4, 0);
            archGroup.add(p1);

            const p2 = p1.clone();
            p2.position.x = 9.5;
            archGroup.add(p2);

            const beamGeo = new THREE.BoxGeometry(20, 0.4, 0.4);
            const beam = new THREE.Mesh(beamGeo, pillarMat);
            beam.position.set(0, 8, 0);
            archGroup.add(beam);

            const lightBox = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 0.8), new THREE.MeshBasicMaterial({ color: 0x00f3ff }));
            lightBox.name = "arch_neon_light";
            lightBox.position.set(0, 7.8, 0);
            archGroup.add(lightBox);

            trackSegment.add(archGroup);
        }
    }

    tracksGroup.add(trackSegment);
}

// --- SPANNER SYSTEM (OBSTACLES & PICKUPS) ---

function spawnObstaclesAndCoins(segmentZ) {
    if (segmentZ > lastObstacleZ - obstacleSpawnInterval) return;

    lastObstacleZ = segmentZ;
    
    const pattern = Math.floor(Math.random() * 9);

    switch(pattern) {
        case 0:
            spawnTrain(0, segmentZ);
            spawnLowBarrier(1, segmentZ + 15);
            spawnCoins(2, segmentZ, 5);
            break;
        case 1:
            spawnRampTrain(1, segmentZ);
            spawnCoinsOnTrain(1, segmentZ, 8);
            spawnHighBarrier(0, segmentZ + 10);
            spawnLowBarrier(2, segmentZ + 20);
            break;
        case 2:
            spawnTrain(0, segmentZ);
            spawnMovingTrain(2, segmentZ - 10);
            spawnCoins(1, segmentZ, 8);
            break;
        case 3:
            spawnLowBarrier(0, segmentZ);
            spawnHighBarrier(1, segmentZ + 10);
            spawnLowBarrier(2, segmentZ + 20);
            spawnPowerup(1, segmentZ + 15);
            break;
        case 4:
            spawnCoins(0, segmentZ, 3);
            spawnCoins(1, segmentZ - 15, 3);
            spawnCoins(2, segmentZ - 30, 3);
            spawnLowBarrier(1, segmentZ);
            spawnLowBarrier(0, segmentZ - 15);
            spawnLowBarrier(2, segmentZ - 30);
            break;
        case 5:
            spawnMovingTrain(0, segmentZ);
            spawnMovingTrain(1, segmentZ - 20);
            spawnCoins(2, segmentZ, 6);
            spawnPowerup(2, segmentZ - 10);
            break;
        case 6:
            spawnTrain(0, segmentZ);
            spawnTrain(2, segmentZ);
            spawnCoins(1, segmentZ, 4);
            spawnMysteryBox(1, segmentZ - 12);
            break;
        case 7:
            spawnTrain(1, segmentZ);
            spawnHighBarrier(0, segmentZ);
            spawnHighBarrier(2, segmentZ);
            spawnPowerup(1, segmentZ + 20);
            break;
        default:
            spawnCoins(0, segmentZ, 4);
            spawnCoins(1, segmentZ - 10, 4);
            spawnCoins(2, segmentZ - 20, 4);
            break;
    }
}

function spawnTrain(laneIndex, zPos) {
    const trainGroup = new THREE.Group();
    trainGroup.position.set(LANES[laneIndex], 0, zPos);
    trainGroup.name = "obstacle_train";
    trainGroup.userData = { isLeathal: true, bounds: new THREE.Box3() };

    // Delhi Metro silver-grey body
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xdcdde1, metalness: 0.9, roughness: 0.15 });
    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.2, 14), bodyMat);
    bodyMesh.position.y = 1.6;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    trainGroup.add(bodyMesh);

    // DMRC Line Colored Stripe
    const lineColors = [0xffdd00, 0x0055ff, 0xff003c, 0x8f00ff, 0x00aa00, 0xd40066]; // Yellow, Blue, Red, Violet, Green, Magenta
    const lColor = lineColors[Math.floor(Math.random() * lineColors.length)];
    const stripMat = new THREE.MeshBasicMaterial({ color: lColor });
    
    const leftStripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 13.8), stripMat);
    leftStripe.position.set(-1.11, 1.8, 0);
    trainGroup.add(leftStripe);

    const rightStripe = leftStripe.clone();
    rightStripe.position.x = 1.11;
    trainGroup.add(rightStripe);

    // Front DMRC Red/Blue Logo
    const dmrcRed = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.05), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    dmrcRed.position.set(-0.25, 1.5, -7.02);
    trainGroup.add(dmrcRed);
    const dmrcBlue = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.05), new THREE.MeshBasicMaterial({ color: 0x0000ff }));
    dmrcBlue.position.set(0.25, 1.5, -7.02);
    trainGroup.add(dmrcBlue);

    const glassMat = new THREE.MeshBasicMaterial({ color: 0x0a101d });
    const windShield = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 0.2), glassMat);
    windShield.position.set(0, 2.4, -7.01);
    trainGroup.add(windShield);

    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lightGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const hl1 = new THREE.Mesh(lightGeo, lightMat);
    hl1.position.set(-0.8, 0.8, -7.01);
    trainGroup.add(hl1);

    const hl2 = hl1.clone();
    hl2.position.x = 0.8;
    trainGroup.add(hl2);

    obstaclesGroup.add(trainGroup);
}

function spawnMovingTrain(laneIndex, zPos) {
    const trainGroup = new THREE.Group();
    trainGroup.position.set(LANES[laneIndex], 0, zPos - 40);
    trainGroup.name = "obstacle_train_moving";
    trainGroup.userData = { isLeathal: true, isMoving: true, speed: 18, bounds: new THREE.Box3() };

    // Delhi Metro silver-grey body
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xdcdde1, metalness: 0.9, roughness: 0.15 });
    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.2, 14), bodyMat);
    bodyMesh.position.y = 1.6;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    trainGroup.add(bodyMesh);

    // DMRC Line Colored Stripe
    const lineColors = [0xffdd00, 0x0055ff, 0xff003c, 0x8f00ff, 0x00aa00, 0xd40066]; // Yellow, Blue, Red, Violet, Green, Magenta
    const lColor = lineColors[Math.floor(Math.random() * lineColors.length)];
    const stripMat = new THREE.MeshBasicMaterial({ color: lColor });
    
    const leftStripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 13.8), stripMat);
    leftStripe.position.set(-1.11, 1.8, 0);
    trainGroup.add(leftStripe);

    const rightStripe = leftStripe.clone();
    rightStripe.position.x = 1.11;
    trainGroup.add(rightStripe);

    // Front DMRC Red/Blue Logo
    const dmrcRed = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.05), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    dmrcRed.position.set(-0.25, 1.5, -7.02);
    trainGroup.add(dmrcRed);
    const dmrcBlue = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.05), new THREE.MeshBasicMaterial({ color: 0x0000ff }));
    dmrcBlue.position.set(0.25, 1.5, -7.02);
    trainGroup.add(dmrcBlue);

    const glassMat = new THREE.MeshBasicMaterial({ color: 0x0a101d });
    const windShield = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 0.2), glassMat);
    windShield.position.set(0, 2.4, -7.01);
    trainGroup.add(windShield);

    obstaclesGroup.add(trainGroup);
}

function spawnRampTrain(laneIndex, zPos) {
    const trainGroup = new THREE.Group();
    trainGroup.position.set(LANES[laneIndex], 0, zPos);
    trainGroup.name = "train_ramp";
    trainGroup.userData = { isLeathal: true, hasRamp: true, bounds: new THREE.Box3() };

    // Delhi Metro silver-grey body
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xdcdde1, metalness: 0.9, roughness: 0.15 });
    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.2, 10), bodyMat);
    bodyMesh.position.set(0, 1.6, -2);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    trainGroup.add(bodyMesh);

    // DMRC Line Colored Stripe
    const lineColors = [0xffdd00, 0x0055ff, 0xff003c, 0x8f00ff, 0x00aa00, 0xd40066]; // Yellow, Blue, Red, Violet, Green, Magenta
    const lColor = lineColors[Math.floor(Math.random() * lineColors.length)];
    const stripMat = new THREE.MeshBasicMaterial({ color: lColor });
    
    const leftStripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 9.8), stripMat);
    leftStripe.position.set(-1.11, 1.8, -2);
    trainGroup.add(leftStripe);

    const rightStripe = leftStripe.clone();
    rightStripe.position.x = 1.11;
    trainGroup.add(rightStripe);

    const rampMat = new THREE.MeshPhongMaterial({ color: 0x222530, roughness: 0.6 });
    const rampMesh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 5.8), rampMat);
    rampMesh.position.set(0, 1.6, -6.1);
    rampMesh.rotation.x = 0.52;
    rampMesh.castShadow = true;
    rampMesh.receiveShadow = true;
    trainGroup.add(rampMesh);

    obstaclesGroup.add(trainGroup);
}

function spawnLowBarrier(laneIndex, zPos) {
    const barrier = new THREE.Group();
    barrier.position.set(LANES[laneIndex], 0, zPos);
    barrier.name = "obstacle_low";
    barrier.userData = { isLeathal: true, bounds: new THREE.Box3() };

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.4 });
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.9, 8);
    
    const p1 = new THREE.Mesh(poleGeo, pillarMat);
    p1.position.set(-0.9, 0.45, 0);
    p1.castShadow = true;
    barrier.add(p1);

    const p2 = p1.clone();
    p2.position.x = 0.9;
    barrier.add(p2);

    const barMesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.25, 0.15), new THREE.MeshPhongMaterial({ color: 0x111111 }));
    barMesh.position.y = 0.8;
    barMesh.castShadow = true;
    barrier.add(barMesh);

    const stripeGeo = new THREE.BoxGeometry(0.18, 0.27, 0.18);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    for (let sx = -0.7; sx <= 0.7; sx += 0.35) {
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(sx, 0.8, 0.01);
        barrier.add(stripe);
    }

    obstaclesGroup.add(barrier);
}

function spawnHighBarrier(laneIndex, zPos) {
    const barrier = new THREE.Group();
    barrier.position.set(LANES[laneIndex], 0, zPos);
    barrier.name = "obstacle_high";
    barrier.userData = { isLeathal: true, bounds: new THREE.Box3() };

    const pipeMat = new THREE.MeshStandardMaterial({ color: 0xcc3300, roughness: 0.3 });
    
    const pillarGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8);
    const p1 = new THREE.Mesh(pillarGeo, pipeMat);
    p1.position.set(-1.0, 1.6, 0);
    p1.castShadow = true;
    barrier.add(p1);

    const p2 = p1.clone();
    p2.position.x = 1.0;
    barrier.add(p2);

    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.3, 0.2), pipeMat);
    crossbar.position.y = 3.0;
    crossbar.castShadow = true;
    barrier.add(crossbar);

    const signMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.1), signMat);
    sign.position.y = 2.15;
    sign.castShadow = true;
    barrier.add(sign);

    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x39ff14 });
    const arrowGeo = new THREE.ConeGeometry(0.15, 0.3, 4);
    
    for (let ax = -0.4; ax <= 0.4; ax += 0.4) {
        const arrow = new THREE.Mesh(arrowGeo, arrowMat);
        arrow.position.set(ax, 2.15, -0.06);
        arrow.rotation.z = Math.PI;
        barrier.add(arrow);
    }

    obstaclesGroup.add(barrier);
}

function spawnCoins(laneIndex, zPosStart, count) {
    const coinGeo = new THREE.TorusGeometry(0.35, 0.08, 8, 24);
    const coinMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.9,
        roughness: 0.1,
        emissive: 0xffb700,
        emissiveIntensity: 0.2
    });

    for (let i = 0; i < count; i++) {
        const coin = new THREE.Mesh(coinGeo, coinMat);
        coin.position.set(LANES[laneIndex], 0.65, zPosStart - i * 4);
        coin.rotation.y = Math.random() * Math.PI;
        coin.castShadow = true;
        coin.userData = { collected: false };
        coinsGroup.add(coin);
    }
}

function spawnCoinsOnTrain(laneIndex, zPos, count) {
    const coinGeo = new THREE.TorusGeometry(0.35, 0.08, 8, 24);
    const coinMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.9,
        roughness: 0.1,
        emissive: 0xffb700,
        emissiveIntensity: 0.2
    });

    for (let i = 0; i < count; i++) {
        const coin = new THREE.Mesh(coinGeo, coinMat);
        coin.position.set(LANES[laneIndex], 3.85, zPos - i * 3.5);
        coin.rotation.y = Math.random() * Math.PI;
        coin.castShadow = true;
        coin.userData = { collected: false };
        coinsGroup.add(coin);
    }
}

function spawnPowerup(laneIndex, zPos) {
    const rand = Math.random();
    let type = 'magnet';
    let color = 0xff007f;
    let iconGeo;

    if (rand < 0.16) {
        type = 'jetpack';
        color = 0x00f3ff;
        iconGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.7, 8);
    } else if (rand < 0.32) {
        type = 'magnet';
        color = 0xff007f;
        iconGeo = new THREE.BoxGeometry(0.5, 0.5, 0.2);
    } else if (rand < 0.48) {
        type = 'multiplier';
        color = 0xff5500;
        iconGeo = new THREE.OctahedronGeometry(0.4);
    } else if (rand < 0.64) {
        type = 'sneakers';
        color = 0x39ff14;
        iconGeo = new THREE.BoxGeometry(0.5, 0.3, 0.4);
    } else if (rand < 0.8) {
        type = 'shield';
        color = 0x0055ff;
        iconGeo = new THREE.IcosahedronGeometry(0.35, 1);
    } else {
        type = 'reflexes';
        color = 0xa000ff;
        iconGeo = new THREE.TorusGeometry(0.25, 0.08, 8, 16);
    }

    const itemGroup = new THREE.Group();
    itemGroup.position.set(LANES[laneIndex], 0.8, zPos);
    itemGroup.name = "powerup_pickup";
    itemGroup.userData = { type: type, collected: false };

    const ringGeo = new THREE.TorusGeometry(0.6, 0.04, 8, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.5 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    itemGroup.add(ring);

    const iconMat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.5 });
    const icon = new THREE.Mesh(iconGeo, iconMat);
    icon.castShadow = true;
    itemGroup.add(icon);

    powerupsGroup.add(itemGroup);
}

function spawnMysteryBox(laneIndex, zPos) {
    const itemGroup = new THREE.Group();
    itemGroup.position.set(LANES[laneIndex], 0.8, zPos);
    itemGroup.name = "mystery_box";
    itemGroup.userData = { collected: false };

    const ringGeo = new THREE.TorusGeometry(0.7, 0.04, 8, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff007f, transparent: true, opacity: 0.6 });
    itemGroup.add(new THREE.Mesh(ringGeo, ringMat));

    const chestMat = new THREE.MeshStandardMaterial({ color: 0x4a0e4e, metalness: 0.4, roughness: 0.3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), chestMat);
    body.position.y = 0;
    body.castShadow = true;
    itemGroup.add(body);

    const lidMat = new THREE.MeshStandardMaterial({ color: 0xcc00ff, metalness: 0.6, roughness: 0.2 });
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.15, 0.72), lidMat);
    lid.position.y = 0.32;
    lid.castShadow = true;
    itemGroup.add(lid);

    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xffd700 }));
    lock.position.set(0, 0.1, -0.36);
    itemGroup.add(lock);

    powerupsGroup.add(itemGroup);
}

// --- PARTICLE EMITTERS ---

function createCoinCollectParticles(pos) {
    const pCount = gameState.settings.graphics === 'low' ? 3 : 8;
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    const pGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);

    for (let i = 0; i < pCount; i++) {
        const mesh = new THREE.Mesh(pGeo, pMat);
        mesh.position.copy(pos);
        particlesGroup.add(mesh);

        const angle = Math.random() * Math.PI * 2;
        const velocity = new THREE.Vector3(
            Math.cos(angle) * (2 + Math.random() * 3),
            3 + Math.random() * 4,
            Math.sin(angle) * (2 + Math.random() * 3)
        );

        particles.push({
            mesh: mesh,
            velocity: velocity,
            life: 1.0,
            decay: 2.0 + Math.random() * 1.5
        });
    }
}

function createSneakerBounceParticles(pos) {
    const pCount = gameState.settings.graphics === 'low' ? 4 : 10;
    const pMat = new THREE.MeshBasicMaterial({ color: 0x39ff14 });
    const pGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);

    for (let i = 0; i < pCount; i++) {
        const mesh = new THREE.Mesh(pGeo, pMat);
        mesh.position.copy(pos);
        particlesGroup.add(mesh);

        const angle = Math.random() * Math.PI * 2;
        const velocity = new THREE.Vector3(
            Math.cos(angle) * (1 + Math.random() * 2),
            1 + Math.random() * 2,
            Math.sin(angle) * (1 + Math.random() * 2)
        );

        particles.push({
            mesh: mesh,
            velocity: velocity,
            life: 0.8,
            decay: 2.0
        });
    }
}

function createJetpackSmokeParticles() {
    if (!playerGroup) return;
    if (gameState.settings.graphics === 'low' && Math.random() > 0.3) return;
    
    const pMat = new THREE.MeshBasicMaterial({ 
        color: 0x00f3ff,
        transparent: true,
        opacity: 0.8
    });
    const pGeo = new THREE.SphereGeometry(0.15, 6, 6);
    
    const leftNozzlePos = new THREE.Vector3(-0.25, 0.7, 0.4).applyMatrix4(playerGroup.matrixWorld);
    const rightNozzlePos = new THREE.Vector3(0.25, 0.7, 0.4).applyMatrix4(playerGroup.matrixWorld);

    [leftNozzlePos, rightNozzlePos].forEach(pos => {
        const mesh = new THREE.Mesh(pGeo, pMat);
        mesh.position.copy(pos);
        particlesGroup.add(mesh);

        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 1.5,
            -6 - Math.random() * 4,
            runSpeed * 0.4 + (Math.random() - 0.5) * 2
        );

        particles.push({
            mesh: mesh,
            velocity: velocity,
            life: 0.6,
            decay: 1.5
        });
    });
}

function updateParticles(delta) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= p.decay * delta;

        if (p.life <= 0) {
            particlesGroup.remove(p.mesh);
            p.mesh.geometry.dispose();
            if (p.mesh.material) {
                if (Array.isArray(p.mesh.material)) {
                    p.mesh.material.forEach(m => m.dispose());
                } else {
                    p.mesh.material.dispose();
                }
            }
            particles.splice(i, 1);
        } else {
            p.mesh.position.addScaledVector(p.velocity, delta);
            p.velocity.y -= GRAVITY * 0.3 * delta;
            p.mesh.scale.setScalar(p.life);
        }
    }
}

// --- CONTROLS & EVENT LISTENERS ---

let isSwiping = false;
let touchStartX = 0;
let touchStartY = 0;

function setupControls() {
    window.addEventListener('keydown', (e) => {
        if (isGameActive && (e.code === 'Escape' || e.code === 'KeyP')) {
            togglePause();
            return;
        }

        if (!isGameActive || isGamePaused) return;

        switch(e.code) {
            case 'ArrowLeft':
            case 'KeyA':
                moveLane(-1);
                break;
            case 'ArrowRight':
            case 'KeyD':
                moveLane(1);
                break;
            case 'ArrowUp':
            case 'KeyW':
                jump();
                break;
            case 'ArrowDown':
            case 'KeyS':
                roll();
                break;
            case 'Space':
                activateHoverboardShield();
                break;
        }
    });

    const container = document.getElementById('game-container');
    
    container.addEventListener('mousedown', (e) => {
        if (isGamePaused) return;
        isSwiping = true;
        touchStartX = e.clientX;
        touchStartY = e.clientY;
    });

    container.addEventListener('mouseup', (e) => {
        if (!isSwiping || isGamePaused) return;
        handleSwipe(e.clientX - touchStartX, e.clientY - touchStartY);
        isSwiping = false;
    });

    container.addEventListener('touchstart', (e) => {
        if (isGamePaused) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
        if (isGamePaused) return;
        handleSwipe(
            e.changedTouches[0].clientX - touchStartX,
            e.changedTouches[0].clientY - touchStartY
        );
    }, { passive: true });
}

function handleSwipe(diffX, diffY) {
    const threshold = 40;
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > threshold) {
            if (diffX > 0) moveLane(1);
            else moveLane(-1);
        }
    } else {
        if (Math.abs(diffY) > threshold) {
            if (diffY < 0) jump();
            else roll();
        }
    }
}

function moveLane(dir) {
    let target = currentLane + dir;
    if (target >= 0 && target <= 2) {
        currentLane = target;
        if (window.gameAudio) window.gameAudio.playJump();
    }
}

function jump() {
    if (isJumping || activePowerups.jetpack.active) return;
    isJumping = true;
    
    const finalForce = activePowerups.sneakers.active ? JUMP_FORCE * 1.45 : JUMP_FORCE;
    verticalVelocity = finalForce;
    
    currentRunStats.jumps++;
    
    if (window.gameAudio) {
        if (activePowerups.sneakers.active) {
            window.gameAudio.playSneakerJump();
            createSneakerBounceParticles(playerGroup.position);
        } else {
            window.gameAudio.playJump();
        }
    }
    
    if (isRolling) {
        isRolling = false;
        playerBody.scale.y = 1.0;
        playerBody.position.y = 0.9;
    }
}

function roll() {
    if (activePowerups.jetpack.active) return;
    isRolling = true;
    rollTimer = SLIDE_DURATION;
    
    if (window.gameAudio) window.gameAudio.playSlide();

    playerBody.scale.y = 0.45;
    playerBody.position.y = 0.45;

    if (isJumping) {
        verticalVelocity = -JUMP_FORCE * 1.5;
    }
}

function activateHoverboardShield() {
    if (activePowerups.hoverboard.active || gameState.hoverboards <= 0) return;
    
    gameState.hoverboards--;
    currentRunStats.hoverboardsUsed++;
    saveGameData();

    activePowerups.hoverboard.active = true;
    characterMeshes.hoverboard.visible = true;

    if (window.gameAudio) window.gameAudio.playHoverboard();
    
    document.getElementById('board-count').innerText = gameState.hoverboards;
}

// --- GAME STATE TRANSITIONS ---

function startGame() {
    isGameActive = true;
    isGamePaused = false;
    score = 0;
    coinsCollectedThisRun = 0;
    boxesCollectedThisRun = 0;
    
    const baseMultiplier = 1 + (gameState.upgrades.booster - 1);
    if (gameState.settings.difficulty === 'hardcore') {
        START_SPEED = 38;
        scoreMultiplier = baseMultiplier * 2;
    } else {
        START_SPEED = 25;
        scoreMultiplier = baseMultiplier;
    }
    
    runSpeed = START_SPEED;
    currentLane = 1;
    playerX = 0;
    playerY = 0;
    playerZ = 0;
    verticalVelocity = 0;
    isJumping = false;
    isRolling = false;
    lastObstacleZ = -50;

    // Reset statistics
    currentRunStats = {
        distance: 0,
        coins: 0,
        hoverboardsUsed: 0,
        score: 0,
        jumps: 0
    };

    // Reset powerups
    Object.keys(activePowerups).forEach(key => {
        activePowerups[key].active = false;
        const bar = document.getElementById(`bar-${key}`);
        if (bar) bar.style.display = 'none';
    });
    characterMeshes.jetpack.visible = false;
    characterMeshes.hoverboard.visible = false;
    characterMeshes.leftSneaker.visible = false;
    characterMeshes.rightSneaker.visible = false;
    if (characterMeshes.shieldBubble) characterMeshes.shieldBubble.visible = false;

    // Clear old elements
    while(tracksGroup.children.length > 0) tracksGroup.remove(tracksGroup.children[0]);
    while(obstaclesGroup.children.length > 0) obstaclesGroup.remove(obstaclesGroup.children[0]);
    while(coinsGroup.children.length > 0) coinsGroup.remove(coinsGroup.children[0]);
    while(powerupsGroup.children.length > 0) powerupsGroup.remove(powerupsGroup.children[0]);
    while(particlesGroup.children.length > 0) particlesGroup.remove(particlesGroup.children[0]);
    particles = [];

    buildInitialTracks();
    updateCharacterModel();

    // Toggle HUD overlays
    document.getElementById('main-menu').classList.remove('active');
    document.getElementById('game-over-screen').classList.remove('active');
    document.getElementById('pause-screen').classList.remove('active');
    document.getElementById('hud').style.display = 'flex';
    document.getElementById('board-count').innerText = gameState.hoverboards;
    document.getElementById('hud-boxes').innerText = '0';

    document.getElementById('chest-reveal-container').style.display = 'none';
    document.getElementById('chest-prize-display').style.display = 'none';

    if (window.gameAudio) {
        window.gameAudio.startBGM();
    }
}

function stopGame() {
    isGameActive = false;
    isGamePaused = false;
    
    if (window.gameAudio) {
        window.gameAudio.stopBGM();
        window.gameAudio.playCrash();
    }

    gameState.coins += coinsCollectedThisRun;
    let newHighScore = false;
    if (Math.floor(score) > gameState.highScore) {
        gameState.highScore = Math.floor(score);
        newHighScore = true;
    }
    saveGameData();

    document.getElementById('go-score').innerText = Math.floor(score);
    document.getElementById('go-coins').innerHTML = `<i class="fas fa-coins gold"></i> ${coinsCollectedThisRun}`;
    document.getElementById('go-boxes').innerHTML = `<i class="fas fa-box pink"></i> ${boxesCollectedThisRun}`;
    document.getElementById('go-new-highscore').style.display = newHighScore ? 'block' : 'none';

    const chestContainer = document.getElementById('chest-reveal-container');
    if (boxesCollectedThisRun > 0) {
        chestContainer.style.display = 'block';
        document.getElementById('chest-count-btn').innerText = boxesCollectedThisRun;
        document.getElementById('chest-prize-display').style.display = 'none';
    } else {
        chestContainer.style.display = 'none';
    }

    document.getElementById('hud').style.display = 'none';
    document.getElementById('game-over-screen').classList.add('active');
    document.getElementById('pause-screen').classList.remove('active');
}

function togglePause() {
    if (!isGameActive) return;

    if (isGamePaused) {
        isGamePaused = false;
        document.getElementById('pause-screen').classList.remove('active');
        if (window.gameAudio) {
            window.gameAudio.startBGM();
            window.gameAudio.playJump();
        }
    } else {
        isGamePaused = true;
        document.getElementById('pause-screen').classList.add('active');
        if (window.gameAudio) {
            window.gameAudio.stopBGM();
        }
    }
}

// Exit to main menu from pause menu
function exitRunToMenu() {
    isGamePaused = false;
    isGameActive = false;
    
    if (window.gameAudio) {
        window.gameAudio.stopBGM();
        window.gameAudio.playJump();
    }

    gameState.coins += coinsCollectedThisRun;
    if (Math.floor(score) > gameState.highScore) {
        gameState.highScore = Math.floor(score);
    }
    saveGameData();

    document.getElementById('pause-screen').classList.remove('active');
    document.getElementById('hud').style.display = 'none';
    document.getElementById('main-menu').classList.add('active');
    renderMissionsList();
}

// --- DYNAMIC THEME COLOR SHIFTER ---

function updateEnvironmentTheme(distance) {
    let currentThemeColor = new THREE.Color(0x00f3ff);
    let currentFogColor = new THREE.Color(0x05060b);

    if (distance < 800) {
        currentThemeColor.setHex(0x00f3ff);
        currentFogColor.setHex(0x05060b);
    } else if (distance < 1800) {
        let alpha = (distance - 800) / 1000;
        currentThemeColor.lerpColors(new THREE.Color(0x00f3ff), new THREE.Color(0xff007f), alpha);
        currentFogColor.lerpColors(new THREE.Color(0x05060b), new THREE.Color(0x0e050c), alpha);
    } else if (distance < 3000) {
        let alpha = (distance - 1800) / 1200;
        currentThemeColor.lerpColors(new THREE.Color(0xff007f), new THREE.Color(0x39ff14), alpha);
        currentFogColor.lerpColors(new THREE.Color(0x0e050c), new THREE.Color(0x050e06), alpha);
    } else {
        let alpha = Math.min(1.0, (distance - 3000) / 1200);
        currentThemeColor.lerpColors(new THREE.Color(0x39ff14), new THREE.Color(0x7700ff), alpha);
        currentFogColor.lerpColors(new THREE.Color(0x050e06), new THREE.Color(0x0d0510), alpha);
    }

    scene.background.copy(currentFogColor);
    scene.fog.color.copy(currentFogColor);
    dirLight.color.copy(currentThemeColor);
    playerLight.color.copy(currentThemeColor);

    tracksGroup.children.forEach(track => {
        track.traverse(child => {
            if (child.name === "neon_line_left" || child.name === "neon_line_right" || child.name === "arch_neon_light") {
                if (child.material) {
                    child.material.color.copy(currentThemeColor);
                }
            }
        });
    });
}

// --- MISSION MANAGER ---

function updateMissionsProgress() {
    let missionStateChanged = false;

    gameState.missions.forEach(mission => {
        if (mission.completed) return;

        let prevProgress = mission.progress;

        if (mission.type === 'distance') {
            mission.progress = Math.min(mission.target, Math.floor(currentRunStats.distance));
        } else if (mission.type === 'coins') {
            mission.progress = Math.min(mission.target, currentRunStats.coins);
        } else if (mission.type === 'hoverboard') {
            mission.progress = Math.min(mission.target, currentRunStats.hoverboardsUsed);
        } else if (mission.type === 'score') {
            mission.progress = Math.min(mission.target, Math.floor(score));
        } else if (mission.type === 'jumps') {
            mission.progress = Math.min(mission.target, currentRunStats.jumps);
        }

        if (mission.progress !== prevProgress) {
            missionStateChanged = true;
        }

        if (mission.progress >= mission.target) {
            mission.completed = true;
            gameState.coins += mission.reward;
            triggerMissionToast(mission.desc);
            
            if (window.gameAudio) window.gameAudio.playPowerup();
        }
    });

    if (missionStateChanged) {
        saveGameData();
    }
}

function triggerMissionToast(description) {
    const toast = document.getElementById('mission-toast');
    document.getElementById('toast-desc').innerText = description;
    toast.classList.add('active');
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3200);
}

// --- SYSTEM SETTINGS CONFIGURATIONS ---

function applyGraphicsQuality(quality) {
    if (!renderer) return;

    if (quality === 'high') {
        renderer.shadowMap.enabled = true;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        dirLight.castShadow = true;
    } else if (quality === 'medium') {
        renderer.shadowMap.enabled = false;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        dirLight.castShadow = false;
    } else if (quality === 'low') {
        renderer.shadowMap.enabled = false;
        renderer.setPixelRatio(1.0);
        dirLight.castShadow = false;
        
        while (particlesGroup.children.length > 0) particlesGroup.remove(particlesGroup.children[0]);
        particles = [];
    }
}

function renderSettingsUI() {
    const settings = gameState.settings;
    
    document.getElementById('slider-music').value = settings.music;
    document.getElementById('label-music').innerText = `${settings.music}%`;
    
    document.getElementById('slider-sfx').value = settings.sfx;
    document.getElementById('label-sfx').innerText = `${settings.sfx}%`;
    
    document.getElementById('select-graphics').value = settings.graphics;
    document.getElementById('label-graphics').innerText = settings.graphics.toUpperCase();
    
    document.getElementById('select-difficulty').value = settings.difficulty;
    document.getElementById('label-difficulty').innerText = settings.difficulty.toUpperCase();
}

// --- ANIMATION LOOP ---

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    
    if (isGameActive && !isGamePaused) {
        updateGameplay(delta);
    } else {
        if (playerGroup && !isGameActive) {
            playerGroup.position.set(0, 0, 0);
            playerGroup.rotation.set(0, 0, 0);
            animateRunning(delta * 0.5);
        }
    }

    renderer.render(scene, camera);
}

function updateGameplay(delta) {
    // Apply Time Dilation (cyber reflexes) physics scaling to environment/tracks
    const gameDelta = activePowerups.reflexes.active ? delta * 0.45 : delta;

    if (!activePowerups.jetpack.active) {
        runSpeed = Math.min(MAX_SPEED, runSpeed + ACCELERATION * gameDelta);
    }
    
    let baseMult = activePowerups.multiplier.active ? scoreMultiplier * 2 : scoreMultiplier;
    if (gameState.selectedCharacter === 'tricky') {
        const bonusPct = getCharacterPerkValue('tricky', getPlayerLevel());
        baseMult = Math.ceil(baseMult * (1 + bonusPct / 100)); // Dynamic scaling score perk!
    }
    score += runSpeed * gameDelta * baseMult;
    
    document.getElementById('hud-score').innerText = String(Math.floor(score)).padStart(6, '0');
    document.getElementById('hud-multiplier').innerText = `x${baseMult}`;
    document.getElementById('hud-coins').innerText = coinsCollectedThisRun;
    document.getElementById('hud-boxes').innerText = boxesCollectedThisRun;

    // Delhi Metro station indicator update
    const currentSegmentIndex = Math.floor(Math.abs(playerZ) / 100);
    const inStation = (currentSegmentIndex % 6 === 5);
    const stationIndicator = document.getElementById('hud-station-indicator');
    if (stationIndicator) {
        if (inStation) {
            const stationNames = ["RAJIV CHOWK", "KASHMERE GATE", "HAUZ KHAS", "NOIDA SEC-18", "VISHWAVIDYALAYA", "PUNJABI BAGH"];
            const curName = stationNames[Math.floor(currentSegmentIndex / 6) % stationNames.length];
            stationIndicator.innerHTML = `<i class="fas fa-subway"></i> STATION: ${curName}`;
            stationIndicator.style.display = 'flex';
        } else {
            stationIndicator.style.display = 'none';
        }
    }

    currentRunStats.score = score;

    updatePowerupTimers(delta); // timers decay at real-world seconds

    const runZDist = runSpeed * gameDelta;
    playerZ -= runZDist;
    currentRunStats.distance += runZDist;

    updateMissionsProgress();

    updateEnvironmentTheme(currentRunStats.distance);

    const targetX = LANES[currentLane];
    playerX += (targetX - playerX) * 15 * delta; // player reaction side-stepping remains fast

    if (activePowerups.jetpack.active) {
        playerY += (8.0 - playerY) * 6 * delta;
        createJetpackSmokeParticles();
    } else {
        if (isJumping) {
            verticalVelocity -= GRAVITY * delta;
            playerY += verticalVelocity * delta;

            if (playerY <= 0) {
                playerY = 0;
                isJumping = false;
                verticalVelocity = 0;
            }
        } else {
            if (isRolling) {
                rollTimer -= delta * 1000;
                if (rollTimer <= 0) {
                    isRolling = false;
                    playerBody.scale.y = 1.0;
                    playerBody.position.y = 0.9;
                }
            }
            playerY += (0 - playerY) * 20 * delta;
        }
    }

    playerGroup.position.set(playerX, playerY, playerZ);
    playerLight.position.set(playerX, playerY + 1.5, playerZ);

    // DYNAMIC HUMAN LEANING: Tilt player model into horizontal turns
    const leanZ = (targetX - playerX) * -0.06;
    const leanY = (targetX - playerX) * 0.1;
    playerGroup.rotation.z = leanZ;
    playerGroup.rotation.y = leanY;

    let targetCamY = 5 + playerY * 0.3;
    let targetCamZ = playerZ + 8;
    if (activePowerups.jetpack.active) {
        targetCamY = 11;
        targetCamZ = playerZ + 11;
    }
    camera.position.x += (playerX - camera.position.x) * 10 * delta;
    camera.position.y += (targetCamY - camera.position.y) * 5 * delta;
    camera.position.z += (targetCamZ - camera.position.z) * 8 * gameDelta;
    camera.lookAt(new THREE.Vector3(playerX, playerY + 1.2, playerZ - 20));

    if (!isJumping && !isRolling && !activePowerups.jetpack.active) {
        animateRunning(gameDelta); // running animation slows down matching track speed
    } else if (activePowerups.jetpack.active) {
        animateFlying(gameDelta);
    } else {
        animateStaticPose();
    }

    characterMeshes.leftSneaker.visible = activePowerups.sneakers.active;
    characterMeshes.rightSneaker.visible = activePowerups.sneakers.active;
    if (characterMeshes.shieldBubble) {
        characterMeshes.shieldBubble.visible = activePowerups.shield.active;
        characterMeshes.shieldBubble.rotation.y += 2.0 * delta; // rotate the shield wireframe
        characterMeshes.shieldBubble.rotation.z += 1.0 * delta;
    }

    tracksGroup.children.forEach(track => {
        if (track.position.z > playerZ + 100) {
            let frontZ = playerZ;
            tracksGroup.children.forEach(t => {
                if (t.position.z < frontZ) frontZ = t.position.z;
            });
            track.position.z = frontZ - TRACK_SEGMENT_LENGTH;
            spawnObstaclesAndCoins(track.position.z);
        }
    });

    obstaclesGroup.children.forEach(obs => {
        if (obs.userData.isMoving) {
            obs.position.z += obs.userData.speed * gameDelta;
        }
        obs.userData.bounds.setFromObject(obs);
    });

    coinsGroup.children.forEach(coin => {
        coin.rotation.y += 3.0 * gameDelta;
        if (activePowerups.magnet.active && !coin.userData.collected) {
            const dist = coin.position.distanceTo(playerGroup.position);
            if (dist < 15) {
                coin.position.lerp(playerGroup.position, 12 * gameDelta);
            }
        }
    });

    checkCollisions();

    updateParticles(gameDelta);

    cleanupPassedObjects();
}

function updatePowerupTimers(delta) {
    Object.keys(activePowerups).forEach(key => {
        const powerup = activePowerups[key];
        if (powerup.active && key !== 'hoverboard') {
            powerup.timer -= delta * 1000;
            const percentage = Math.max(0, powerup.timer / powerup.max) * 100;
            
            const bar = document.getElementById(`bar-${key}`);
            const fill = document.getElementById(`fill-${key}`);
            const text = document.getElementById(`text-${key}`);

            if (bar && fill && text) {
                bar.style.display = 'flex';
                fill.style.width = percentage + '%';
                text.innerText = Math.ceil(powerup.timer / 1000) + 's';
            }

            if (powerup.timer <= 0) {
                powerup.active = false;
                if (bar) bar.style.display = 'none';
                
                if (key === 'jetpack') {
                    characterMeshes.jetpack.visible = false;
                }
            }
        }
    });
}

function checkCollisions() {
    const playerBox = new THREE.Box3().setFromObject(playerGroup);

    // 1. Coins collision
    for (let i = coinsGroup.children.length - 1; i >= 0; i--) {
        const coin = coinsGroup.children[i];
        if (coin.userData.collected) continue;

        const dist = coin.position.distanceTo(playerGroup.position);
        if (dist < 1.4) {
            coin.userData.collected = true;
            
            let coinWorth = 1;
            if (gameState.selectedCharacter === 'gold') {
                const goldChance = getCharacterPerkValue('gold', getPlayerLevel()) / 100;
                if (Math.random() < goldChance) {
                    coinWorth = 2; // Golden transmutation double coin perk!
                }
            }
            
            coinsCollectedThisRun += coinWorth;
            currentRunStats.coins += coinWorth;
            createCoinCollectParticles(coin.position);
            
            if (window.gameAudio) window.gameAudio.playCoin();

            coinsGroup.remove(coin);
            coin.geometry.dispose();
            if (coin.material) {
                if (Array.isArray(coin.material)) {
                    coin.material.forEach(m => m.dispose());
                } else {
                    coin.material.dispose();
                }
            }
        }
    }

    // 2. Powerups & Mystery Boxes collision
    for (let i = powerupsGroup.children.length - 1; i >= 0; i--) {
        const item = powerupsGroup.children[i];
        if (item.userData.collected) continue;

        const dist = item.position.distanceTo(playerGroup.position);
        if (dist < 1.5) {
            item.userData.collected = true;

            if (item.name === "mystery_box") {
                boxesCollectedThisRun++;
                if (window.gameAudio) window.gameAudio.playCoin();
                powerupsGroup.remove(item);
                item.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
                continue;
            }

            const type = item.userData.type;
            const level = gameState.upgrades[type] || 1;
            let duration = getPowerupDuration(level);

            // Apply character passive perks (scaling with Player Level)
            const playerLvl = getPlayerLevel();
            if (type === 'magnet' && gameState.selectedCharacter === 'jake') {
                const bonusPct = getCharacterPerkValue('jake', playerLvl);
                duration *= (1 + bonusPct / 100);
            } else if (type === 'jetpack' && gameState.selectedCharacter === 'yutani') {
                const bonusPct = getCharacterPerkValue('yutani', playerLvl);
                duration *= (1 + bonusPct / 100);
            } else if (type === 'shield' && gameState.selectedCharacter === 'spike') {
                const extraSec = getCharacterPerkValue('spike', playerLvl);
                duration += extraSec * 1000;
            } else if (type === 'reflexes' && gameState.selectedCharacter === 'eve') {
                const bonusPct = getCharacterPerkValue('eve', playerLvl);
                duration *= (1 + bonusPct / 100);
            }

            activePowerups[type].active = true;
            activePowerups[type].timer = duration;
            activePowerups[type].max = duration;

            if (type === 'jetpack') {
                characterMeshes.jetpack.visible = true;
                verticalVelocity = 0;
            }

            if (window.gameAudio) window.gameAudio.playPowerup();

            powerupsGroup.remove(item);
            item.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
    }

    // 3. Obstacles lethal collision
    for (let i = 0; i < obstaclesGroup.children.length; i++) {
        const obs = obstaclesGroup.children[i];
        const obsBox = obs.userData.bounds;

        if (obsBox && playerBox.intersectsBox(obsBox)) {
            if (obs.name === "train_ramp") {
                const relativeZ = playerGroup.position.z - obs.position.z;
                if (relativeZ < 5 && playerGroup.position.y >= 0.5) {
                    playerY = Math.max(playerY, 3.25);
                    isJumping = false;
                    verticalVelocity = 0;
                    continue;
                }
            }

            if (obs.name === "obstacle_high" && isRolling) {
                continue;
            }

            if (playerGroup.position.y >= 3.0 && obs.name === "obstacle_train") {
                playerY = 3.25;
                isJumping = false;
                verticalVelocity = 0;
                continue;
            }

            handleCrash(obs);
            break;
        }
    }
}

function handleCrash(obs) {
    if (activePowerups.shield.active) {
        activePowerups.shield.active = false;
        if (characterMeshes.shieldBubble) characterMeshes.shieldBubble.visible = false;
        obstaclesGroup.remove(obs);
        
        if (window.gameAudio) window.gameAudio.playHoverboard();
        
        let count = 0;
        const flashInterval = setInterval(() => {
            playerBody.visible = !playerBody.visible;
            count++;
            if (count > 6) {
                clearInterval(flashInterval);
                playerBody.visible = true;
            }
        }, 100);
    } else if (activePowerups.hoverboard.active) {
        activePowerups.hoverboard.active = false;
        characterMeshes.hoverboard.visible = false;
        obstaclesGroup.remove(obs);
        
        if (window.gameAudio) window.gameAudio.playHoverboard();
        
        let count = 0;
        const flashInterval = setInterval(() => {
            playerBody.visible = !playerBody.visible;
            count++;
            if (count > 6) {
                clearInterval(flashInterval);
                playerBody.visible = true;
            }
        }, 100);
    } else {
        stopGame();
    }
}

function cleanupPassedObjects() {
    const thresholdZ = playerZ + 40;

    for (let i = obstaclesGroup.children.length - 1; i >= 0; i--) {
        const obs = obstaclesGroup.children[i];
        if (obs.position.z > thresholdZ) {
            obstaclesGroup.remove(obs);
            obs.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
    }

    for (let i = coinsGroup.children.length - 1; i >= 0; i--) {
        const coin = coinsGroup.children[i];
        if (coin.position.z > thresholdZ) {
            coinsGroup.remove(coin);
            coin.geometry.dispose();
            if (coin.material) {
                if (Array.isArray(coin.material)) {
                    coin.material.forEach(m => m.dispose());
                } else {
                    coin.material.dispose();
                }
            }
        }
    }

    for (let i = powerupsGroup.children.length - 1; i >= 0; i--) {
        const item = powerupsGroup.children[i];
        if (item.position.z > thresholdZ) {
            powerupsGroup.remove(item);
            item.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
    }
}

// --- ORGANIC JOINTS HUMAN RUNNER ANIMATIONS ---

function animateRunning(delta) {
    const time = clock.getElapsedTime();
    const cycle = time * runSpeed * 0.65;

    // Hip swing (Thighs)
    characterMeshes.leftLeg.rotation.x = Math.sin(cycle) * 0.55;
    characterMeshes.rightLeg.rotation.x = -Math.sin(cycle) * 0.55;
    
    // Knee bend (Shins bend backward during backward swing, straight forward)
    characterMeshes.leftShin.rotation.x = Math.max(0, -Math.sin(cycle + 0.3) * 0.75);
    characterMeshes.rightShin.rotation.x = Math.max(0, Math.sin(cycle + 0.3) * 0.75);

    // Shoulder swing (Upper Arms)
    characterMeshes.leftArm.rotation.x = -Math.sin(cycle) * 0.45;
    characterMeshes.leftArm.rotation.z = -0.15;
    
    characterMeshes.rightArm.rotation.x = Math.sin(cycle) * 0.45;
    characterMeshes.rightArm.rotation.z = 0.15;

    // Elbow bend (Forearms bend dynamically on forward swing)
    characterMeshes.leftForearm.rotation.x = Math.abs(Math.sin(cycle)) * 0.3 + 0.15;
    characterMeshes.rightForearm.rotation.x = Math.abs(Math.sin(cycle)) * 0.3 + 0.15;

    // Torso body bobbing & head rotation
    playerBody.position.y = 0.9 + Math.abs(Math.sin(cycle * 2)) * 0.06;
    characterMeshes.head.rotation.y = Math.sin(cycle) * 0.04;
}

function animateFlying(delta) {
    // Hanging/floating joints stance
    characterMeshes.leftLeg.rotation.x = 0.25;
    characterMeshes.leftShin.rotation.x = 0.15;
    characterMeshes.rightLeg.rotation.x = 0.15;
    characterMeshes.rightShin.rotation.x = 0.15;
    
    characterMeshes.leftArm.rotation.x = -0.3;
    characterMeshes.leftForearm.rotation.x = 0.1;
    characterMeshes.rightArm.rotation.x = -0.3;
    characterMeshes.rightForearm.rotation.x = 0.1;
    
    playerBody.position.y = 0.9;
    characterMeshes.head.rotation.set(0, 0, 0);
}

function animateStaticPose() {
    if (isJumping) {
        // Human tuck: knees bent up, elbows pulled back
        characterMeshes.leftLeg.rotation.x = -0.45;
        characterMeshes.leftShin.rotation.x = 0.85;
        characterMeshes.rightLeg.rotation.x = -0.45;
        characterMeshes.rightShin.rotation.x = 0.85;
        
        characterMeshes.leftArm.rotation.x = 0.65;
        characterMeshes.leftForearm.rotation.x = 0.3;
        characterMeshes.rightArm.rotation.x = 0.65;
        characterMeshes.rightForearm.rotation.x = 0.3;
    } else if (isRolling) {
        // Roll curl: tight joints
        characterMeshes.leftLeg.rotation.x = -1.1;
        characterMeshes.leftShin.rotation.x = 1.3;
        characterMeshes.rightLeg.rotation.x = -1.1;
        characterMeshes.rightShin.rotation.x = 1.3;
        
        characterMeshes.leftArm.rotation.x = 0.9;
        characterMeshes.leftForearm.rotation.x = 0.7;
        characterMeshes.rightArm.rotation.x = 0.9;
        characterMeshes.rightForearm.rotation.x = 0.7;
        
        playerBody.rotation.x = -0.4; // lean slightly back
    }
}

// --- UI SYSTEMS (MAIN MENU, MISSIONS, SHOP, SETTINGS) ---

function initUI() {
    setupControls();
    updateUIStats();
    renderMissionsList();
    renderSettingsUI(); // Ensure sliders match saved volume on startup

    // Start Actions
    document.getElementById('btn-play').addEventListener('click', () => {
        startGame();
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
        startGame();
    });

    document.getElementById('btn-go-menu').addEventListener('click', () => {
        document.getElementById('game-over-screen').classList.remove('active');
        document.getElementById('main-menu').classList.add('active');
        renderMissionsList();
    });

    // Pause UI Actions
    document.getElementById('btn-pause-toggle').addEventListener('click', () => {
        togglePause();
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
        togglePause();
    });

    document.getElementById('btn-pause-restart').addEventListener('click', () => {
        startGame();
    });

    document.getElementById('btn-exit').addEventListener('click', () => {
        exitRunToMenu();
    });

    // Menus Toggle
    document.getElementById('btn-characters').addEventListener('click', () => {
        renderCharacterSelect();
        document.getElementById('character-select-menu').classList.add('active');
    });
    
    document.getElementById('btn-back-chars').addEventListener('click', () => {
        document.getElementById('character-select-menu').classList.remove('active');
    });

    document.getElementById('btn-shop').addEventListener('click', () => {
        renderShop();
        document.getElementById('shop-menu').classList.add('active');
    });

    document.getElementById('btn-back-shop').addEventListener('click', () => {
        document.getElementById('shop-menu').classList.remove('active');
    });

    // Settings Toggle
    document.getElementById('btn-settings').addEventListener('click', () => {
        renderSettingsUI();
        document.getElementById('settings-menu').classList.add('active');
    });

    document.getElementById('btn-back-settings').addEventListener('click', () => {
        document.getElementById('settings-menu').classList.remove('active');
    });

    // Volume Sliders
    const musicSlider = document.getElementById('slider-music');
    const sfxSlider = document.getElementById('slider-sfx');

    musicSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        document.getElementById('label-music').innerText = `${val}%`;
        gameState.settings.music = val;
        saveGameData();
        if (window.gameAudio) {
            window.gameAudio.setMusicVolume(val);
        }
    });

    sfxSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        document.getElementById('label-sfx').innerText = `${val}%`;
        gameState.settings.sfx = val;
        saveGameData();
        if (window.gameAudio) {
            window.gameAudio.setSfxVolume(val);
        }
    });

    // Graphics Dropdown
    const graphicsSelect = document.getElementById('select-graphics');
    graphicsSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        document.getElementById('label-graphics').innerText = val.toUpperCase();
        gameState.settings.graphics = val;
        saveGameData();
        applyGraphicsQuality(val);
    });

    // Difficulty Mode Dropdown
    const difficultySelect = document.getElementById('select-difficulty');
    difficultySelect.addEventListener('change', (e) => {
        const val = e.target.value;
        document.getElementById('label-difficulty').innerText = val.toUpperCase();
        gameState.settings.difficulty = val;
        saveGameData();
    });

    // Reset Saved Data
    document.getElementById('btn-reset-data').addEventListener('click', () => {
        const doubleCheck = confirm("DANGER: ARE YOU SURE YOU WANT TO RESET ALL YOUR RUNNERS, HIGH SCORES, COINS, AND UPGRADES? THIS CANNOT BE UNDONE!");
        if (doubleCheck) {
            localStorage.removeItem('subway_cyber_runner_save');
            location.reload();
        }
    });

    // Open Mystery Box
    document.getElementById('btn-open-chest').addEventListener('click', () => {
        if (boxesCollectedThisRun <= 0) return;

        boxesCollectedThisRun--;
        document.getElementById('chest-count-btn').innerText = boxesCollectedThisRun;

        if (window.gameAudio) window.gameAudio.playPrizeReveal();

        const rewards = [
            { desc: '100 COINS', action: () => { gameState.coins += 100; } },
            { desc: '250 COINS', action: () => { gameState.coins += 250; } },
            { desc: '2 HOVERBOARDS', action: () => { gameState.hoverboards += 2; } },
            { desc: '1 HOVERBOARD', action: () => { gameState.hoverboards += 1; } },
            { desc: '500 COINS', action: () => { gameState.coins += 500; } }
        ];
        const prize = rewards[Math.floor(Math.random() * rewards.length)];
        prize.action();
        saveGameData();

        const prizeDisplay = document.getElementById('chest-prize-display');
        document.getElementById('chest-prize-value').innerText = prize.desc;
        prizeDisplay.style.display = 'flex';

        const btn = document.getElementById('btn-open-chest');
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => { btn.style.transform = 'scale(1)'; }, 100);

        if (boxesCollectedThisRun === 0) {
            setTimeout(() => {
                document.getElementById('chest-reveal-container').style.display = 'none';
            }, 2500);
        }
    });

    // Custom BGM file loader listeners
    const inputCustomBgm = document.getElementById('input-custom-bgm');
    const btnClearCustomBgm = document.getElementById('btn-clear-custom-bgm');
    const labelCustomBgm = document.getElementById('label-custom-bgm');
    const customBgmPlayer = document.getElementById('custom-bgm-player');
    let currentBgmObjectUrl = null;

    if (inputCustomBgm && btnClearCustomBgm && labelCustomBgm && customBgmPlayer) {
        inputCustomBgm.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (currentBgmObjectUrl) {
                    URL.revokeObjectURL(currentBgmObjectUrl);
                }
                currentBgmObjectUrl = URL.createObjectURL(file);
                customBgmPlayer.src = currentBgmObjectUrl;
                
                if (window.gameAudio) {
                    window.gameAudio.useCustomBGM = true;
                    // Stop synth sequencer BGM immediately
                    window.gameAudio.stopBGM();
                    // If game is active and not paused, play custom track
                    if (isGameActive && !isGamePaused) {
                        window.gameAudio.startBGM();
                    }
                }
                
                labelCustomBgm.innerText = file.name.substring(0, 18).toUpperCase() + (file.name.length > 18 ? '...' : '');
                btnClearCustomBgm.style.display = 'block';
            }
        });

        btnClearCustomBgm.addEventListener('click', () => {
            customBgmPlayer.src = '';
            inputCustomBgm.value = '';
            
            if (currentBgmObjectUrl) {
                URL.revokeObjectURL(currentBgmObjectUrl);
                currentBgmObjectUrl = null;
            }
            
            if (window.gameAudio) {
                window.gameAudio.useCustomBGM = false;
                window.gameAudio.stopBGM();
                if (isGameActive && !isGamePaused) {
                    window.gameAudio.startBGM();
                }
            }
            
            labelCustomBgm.innerText = 'BUILT-IN SYNTH';
            btnClearCustomBgm.style.display = 'none';
        });
    }
}

function updateUIStats() {
    const level = getPlayerLevel();
    document.getElementById('menu-high-score').innerText = gameState.highScore;
    document.getElementById('menu-coins').innerText = gameState.coins;
    
    document.getElementById('char-coins-display').innerText = gameState.coins;
    document.getElementById('shop-coins-display').innerText = gameState.coins;

    const menuLvl = document.getElementById('menu-player-level');
    if (menuLvl) menuLvl.innerText = level;
    
    const charLvl = document.getElementById('char-level-display');
    if (charLvl) charLvl.innerText = level;
}

function renderMissionsList() {
    const list = document.getElementById('missions-list');
    list.innerHTML = '';

    const allCompleted = gameState.missions.every(m => m.completed);
    if (allCompleted) {
        rollNewMissions();
        saveGameData();
    }

    gameState.missions.forEach(mission => {
        const item = document.createElement('div');
        item.className = `mission-item ${mission.completed ? 'completed' : ''}`;
        
        item.innerHTML = `
            <div>
                <span class="mission-desc">${mission.desc}</span>
                <span class="hud-label"> (${mission.progress}/${mission.target})</span>
            </div>
            <span class="mission-prize">${mission.completed ? '✓' : `+${mission.reward}C`}</span>
        `;
        list.appendChild(item);
    });
}

function renderCharacterSelect() {
    const grid = document.getElementById('character-grid');
    grid.innerHTML = '';

    const playerLvl = getPlayerLevel();

    Object.keys(CHARACTER_DB).forEach(key => {
        const runner = CHARACTER_DB[key];
        const isUnlocked = gameState.unlockedCharacters.includes(key);
        const isSelected = gameState.selectedCharacter === key;
        const isLvlLocked = playerLvl < runner.reqLevel;

        const card = document.createElement('div');
        card.className = `character-card ${isSelected ? 'selected' : ''} ${isLvlLocked ? 'lvl-locked' : ''}`;
        
        if (isSelected) {
            card.style.borderColor = '#' + runner.color.toString(16).padStart(6, '0');
        }

        let purchaseButtonHTML = '';
        if (isLvlLocked) {
            purchaseButtonHTML = `
                <button class="btn-purchase locked" style="background: rgba(255,255,255,0.03); color: var(--text-secondary); cursor: not-allowed;" disabled>
                    <i class="fas fa-lock"></i> REQ. LEVEL ${runner.reqLevel}
                </button>`;
        } else if (isUnlocked) {
            purchaseButtonHTML = `<button class="btn-purchase select-runner" data-runner="${key}">SELECT RUNNER</button>`;
        } else {
            purchaseButtonHTML = `
                <button class="btn-purchase locked purchase-runner" data-runner="${key}" data-price="${runner.price}">
                    <i class="fas fa-lock"></i> BUY FOR ${runner.price}
                </button>`;
        }

        const perkVal = getCharacterPerkValue(key, playerLvl);
        const displayVal = runner.perkSuffix === 's' ? perkVal.toFixed(1) : Math.round(perkVal);

        card.innerHTML = `
            <div class="character-avatar" style="color: #${runner.color.toString(16).padStart(6, '0')}; background-color: rgba(255,255,255,0.03)">
                ${runner.icon}
            </div>
            <h3>${runner.name}</h3>
            <div class="character-perk-badge" style="color: #${runner.color.toString(16).padStart(6, '0')}; border-color: #${runner.color.toString(16).padStart(6, '0')}40">
                <i class="fas fa-crown"></i> ${runner.perk}${displayVal}${runner.perkSuffix}
            </div>
            <p>${runner.description}</p>
            ${purchaseButtonHTML}
        `;

        grid.appendChild(card);
    });

    document.querySelectorAll('.select-runner').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const charKey = e.target.getAttribute('data-runner');
            gameState.selectedCharacter = charKey;
            saveGameData();
            updateCharacterModel();
            renderCharacterSelect();
        });
    });

    document.querySelectorAll('.purchase-runner').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const btnEl = e.target.closest('.purchase-runner');
            const charKey = btnEl.getAttribute('data-runner');
            const price = parseInt(btnEl.getAttribute('data-price'));

            if (gameState.coins >= price) {
                gameState.coins -= price;
                gameState.unlockedCharacters.push(charKey);
                gameState.selectedCharacter = charKey;
                saveGameData();
                updateCharacterModel();
                renderCharacterSelect();
                if (window.gameAudio) window.gameAudio.playHoverboard();
            } else {
                alert("NOT ENOUGH CYBER COINS!");
            }
        });
    });
}

function renderShop() {
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '';

    Object.keys(UPGRADE_DB).forEach(key => {
        const item = UPGRADE_DB[key];
        let price = 0;
        let isMaxed = false;
        let upgradeLevel = 0;

        if (key === 'hoverboard') {
            price = item.basePrice;
        } else {
            upgradeLevel = gameState.upgrades[key];
            price = item.basePrice * Math.pow(2, upgradeLevel - 1);
            isMaxed = upgradeLevel >= 5;
        }

        const shopItem = document.createElement('div');
        shopItem.className = 'shop-item';

        let dotsHTML = '';
        if (key !== 'hoverboard') {
            dotsHTML = '<div class="upgrade-level">';
            for (let d = 1; d <= 5; d++) {
                dotsHTML += `<div class="level-dot ${d <= upgradeLevel ? 'active' : ''}"></div>`;
            }
            dotsHTML += '</div>';
        } else {
            dotsHTML = `<div class="upgrade-level"><span class="hud-label">OWNED: ${gameState.hoverboards}</span></div>`;
        }

        let actionButtonHTML = '';
        if (isMaxed) {
            actionButtonHTML = `<button class="btn-buy-upgrade maxed">MAX LEVEL</button>`;
        } else {
            actionButtonHTML = `
                <button class="btn-buy-upgrade buy-tech" data-item="${key}" data-price="${price}">
                    <i class="fas fa-coins gold"></i> ${price}
                </button>`;
        }

        shopItem.innerHTML = `
            <div class="shop-item-details">
                <div class="shop-item-icon" style="color: ${item.color}; background-color: ${item.color}15">
                    <i class="fas fa-${item.icon}"></i>
                </div>
                <div class="shop-item-text">
                    <h3>${item.name}</h3>
                    <p>${item.desc}</p>
                    ${dotsHTML}
                </div>
            </div>
            ${actionButtonHTML}
        `;

        grid.appendChild(shopItem);
    });

    document.querySelectorAll('.buy-tech').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const btnEl = e.target.closest('.buy-tech');
            const itemKey = btnEl.getAttribute('data-item');
            const price = parseInt(btnEl.getAttribute('data-price'));

            if (gameState.coins >= price) {
                gameState.coins -= price;
                
                if (itemKey === 'hoverboard') {
                    gameState.hoverboards++;
                } else {
                    gameState.upgrades[itemKey]++;
                }
                
                saveGameData();
                renderShop();
                if (window.gameAudio) window.gameAudio.playPowerup();
            } else {
                alert("INSUFFICIENT FUNDS!");
            }
        });
    });
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
}
