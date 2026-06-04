import * as THREE from 'three';

const SKY_COLOR = 0x87CEEB;
const FOG_NEAR  = 80;
const FOG_FAR   = 200;

export class Renderer {
  constructor() {
    this.scene    = null;
    this.camera   = null;
    this.renderer = null;
    this.material = null;
    this.highlight = null;
    this.highlightBox = null;
  }

  init(canvas, atlasTexture) {
    // Scene + fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SKY_COLOR);
    this.scene.fog = new THREE.Fog(SKY_COLOR, FOG_NEAR, FOG_FAR);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.rotation.order = 'YXZ';

    // WebGL renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfffaee, 1.1);
    sun.position.set(60, 120, 50);
    this.scene.add(sun);

    // Hemisphere light for sky/ground color bounce
    const hemi = new THREE.HemisphereLight(0x87CEEB, 0x3d2b1f, 0.3);
    this.scene.add(hemi);

    // Shared chunk material (Lambert for diffuse lighting)
    this.material = new THREE.MeshLambertMaterial({
      map: atlasTexture,
      side: THREE.FrontSide,
      alphaTest: 0.5,   // discard pixels with alpha < 0.5 (leaves, glass gaps)
    });

    // Block highlight wireframe
    const hlGeo = new THREE.BoxGeometry(1.003, 1.003, 1.003);
    const hlMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      wireframe: true,
      depthTest: true,
    });
    this.highlight = new THREE.Mesh(hlGeo, hlMat);
    this.highlight.visible = false;
    this.scene.add(this.highlight);

    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setHighlight(pos) {
    if (!pos) {
      this.highlight.visible = false;
    } else {
      this.highlight.visible = true;
      this.highlight.position.set(pos.x + 0.5, pos.y + 0.5, pos.z + 0.5);
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
