import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import type { Plan } from './ai';

export type DemoFurnitureId =
  | 'sofa'
  | 'dining'
  | 'bed'
  | 'plant'
  | 'chair'
  | 'coffee-table';

const FURNITURE_LABELS: Record<DemoFurnitureId, string> = {
  sofa: 'Modular Sofa',
  dining: 'Dining Table',
  bed: 'Queen Bed',
  plant: 'Fiddle Leaf Plant',
  chair: 'Accent Chair',
  'coffee-table': 'Coffee Table',
};

const FURNITURE_MODEL_FILES: Record<DemoFurnitureId, string> = {
  sofa: 'couch',
  dining: 'table2',
  bed: 'bed',
  plant: 'plant',
  chair: 'chair',
  'coffee-table': 'coffee-table',
};

const FURNITURE_MODEL_SCALE: Partial<Record<DemoFurnitureId, number>> = {
  sofa: 1,
  dining: 1,
  bed: 1,
  plant: 1,
  chair: 1,
  'coffee-table': 1,
};

const furnitureModelCache = new Map<DemoFurnitureId, THREE.Object3D>();

const FURNITURE_ASSET_PATH = 'components/';
const HOUSE_MODEL_ASSET_PATH = 'components/house models/';

async function loadObjMtl(baseName: string): Promise<THREE.Object3D> {
  const mtlLoader = new MTLLoader().setPath(FURNITURE_ASSET_PATH);
  const materials = await new Promise<any>((resolve, reject) => {
    mtlLoader.load(
      `${baseName}.mtl`,
      (mtl) => resolve(mtl),
      undefined,
      (err) => reject(err)
    );
  });

  materials.preload();

  const objLoader = new OBJLoader().setMaterials(materials).setPath(FURNITURE_ASSET_PATH);

  const object = await new Promise<THREE.Object3D>((resolve, reject) => {
    objLoader.load(
      `${baseName}.obj`,
      (obj) => resolve(obj),
      undefined,
      (err) => reject(err)
    );
  });

  return object;
}

async function loadHouseObjMtl(baseName: string): Promise<THREE.Object3D> {
  const mtlLoader = new MTLLoader().setPath(HOUSE_MODEL_ASSET_PATH);
  const materials = await new Promise<any>((resolve, reject) => {
    mtlLoader.load(
      `${baseName}.mtl`,
      (mtl) => resolve(mtl),
      undefined,
      (err) => reject(err)
    );
  });

  materials.preload();

  const objLoader = new OBJLoader().setMaterials(materials).setPath(HOUSE_MODEL_ASSET_PATH);

  const object = await new Promise<THREE.Object3D>((resolve, reject) => {
    objLoader.load(
      `${baseName}.obj`,
      (obj) => resolve(obj),
      undefined,
      (err) => reject(err)
    );
  });

  return object;
}

async function loadFurnitureModel(id: DemoFurnitureId): Promise<THREE.Object3D> {
  if (furnitureModelCache.has(id)) {
    return furnitureModelCache.get(id)!.clone(true);
  }

  const baseName = FURNITURE_MODEL_FILES[id];
  const raw = await loadObjMtl(baseName);

  const box = new THREE.Box3().setFromObject(raw);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  // center model and put it on the ground
  raw.position.sub(center);
  raw.position.y -= box.min.y;

  const scale = FURNITURE_MODEL_SCALE[id] ?? 1;
  raw.scale.setScalar(scale);

  raw.traverse(child => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });

  furnitureModelCache.set(id, raw);
  return raw.clone(true);
}

export type FurnitureInteractionState = 'idle' | 'placing' | 'moving';

export type FurnitureSnapshot = {
  id: string;
  type: DemoFurnitureId;
  name: string;
  label: string;
  position: { x: number; y: number; z: number };
  rotation: number;
};

type FurnitureItem = {
  id: string;
  type: DemoFurnitureId;
  name: string;
  object: THREE.Object3D;
};

type FurnitureCallbackPayload = {
  items: FurnitureSnapshot[];
  selectedId: string | null;
  interaction: FurnitureInteractionState;
};

type FurnitureCallbacks = {
  onUpdate?: (payload: FurnitureCallbackPayload) => void;
};

async function createFurnitureObject(id: DemoFurnitureId): Promise<THREE.Object3D> {
  try {
    return await loadFurnitureModel(id);
  } catch (error) {
    console.error(`Failed to load 3D model for furniture "${id}"`, error);
    return new THREE.Group();
  }
}

type FloorMaterialKey = 'default' | 'wood' | 'tile' | 'concrete';

export class ThreeApartmentViewer {
  private container: HTMLElement | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: OrbitControls | null = null;
  private rootGroup: THREE.Group | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private floors: THREE.Mesh[] = [];
  private walls: THREE.Object3D[] = [];
  private wallBounds: THREE.Box3[] = [];
  private furnitureGroup: THREE.Group | null = null;
  private raycaster: THREE.Raycaster | null = null;
  private pointer: THREE.Vector2 | null = null;
  private activeFurnitureId: DemoFurnitureId | null = null;
  private canvasClickHandler: ((event: MouseEvent) => void) | null = null;
  private furnitureItems: Map<string, FurnitureItem> = new Map();
  private selectedFurnitureId: string | null = null;
  private selectionHelper: THREE.BoxHelper | null = null;
  private interactionState: FurnitureInteractionState = 'idle';
  private furnitureCallbacks: FurnitureCallbacks = {};
  private controlsStateSnapshot: { enabled: boolean; enableRotate: boolean; enablePan: boolean } | null = null;
  private draggingPointerId: number | null = null;
  private isDraggingFurniture = false;
  private dragOffset: THREE.Vector3 | null = null;
  private suppressClick = false;
  private previewObject: THREE.Object3D | null = null;
  private previewType: DemoFurnitureId | null = null;
  private lastPointer: THREE.Vector2 | null = null;
  private floorMaterialCache: Map<FloorMaterialKey, THREE.MeshStandardMaterial> = new Map();
  private floorTextureCache: Map<FloorMaterialKey, THREE.Texture> = new Map();
  private houseModelRoot: THREE.Object3D | null = null;
  private originalFloorMaterials: Map<THREE.Mesh, THREE.MeshStandardMaterial> = new Map();
  private wallMaterials: Set<THREE.MeshStandardMaterial> = new Set();

  mount(container: HTMLElement): void {
    this.dispose();
    this.container = container;

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf8f9fa);

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    this.camera.position.set(6, 6, 6);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.domElement.className = 'three-canvas';
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    hemi.position.set(0, 1, 0);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(5, 10, 7);
    this.scene.add(dir);

    // Grid & ground
    const grid = new THREE.GridHelper(50, 50, 0xcccccc, 0xeeeeee);
    (grid.material as THREE.Material).opacity = 0.5;
    (grid.material as THREE.Material as any).transparent = true;
    this.scene.add(grid);

    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);
    this.furnitureGroup = new THREE.Group();
    this.furnitureGroup.name = 'furniture';
    this.rootGroup.add(this.furnitureGroup);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.canvasClickHandler = (event: MouseEvent) => {
      void this.handleCanvasClick(event);
    };
    this.renderer.domElement.addEventListener('click', this.canvasClickHandler);
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.addEventListener('pointerleave', this.handlePointerUp);
    this.renderer.domElement.addEventListener('pointercancel', this.handlePointerUp);

    // Responsive sizing
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);

    this.animate();

    this.emitFurnitureUpdate();
  }

  addPolylineFromSvgPath(path: string, options?: { y?: number; color?: number; scale?: number; centered?: boolean; radius?: number }): void {
    if (!this.scene || !this.rootGroup) return;
    const y = options?.y ?? 0.02;
    const color = options?.color ?? 0x0077ff;
    const scale = options?.scale ?? 0.01; // 1200 -> 12m
    const centered = options?.centered ?? true;
    const radius = options?.radius ?? 0.03;

    // Extract all numbers from the SVG path and interpret as [x,y] pairs
    const nums = (path.match(/-?\\d+(?:\\.\\d+)?/g) || []).map(parseFloat);
    const points2D: Array<[number, number]> = [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      points2D.push([nums[i] * scale, nums[i + 1] * scale]);
    }

    // Optionally center by subtracting midpoint
    let cx = 0, cz = 0;
    if (centered && points2D.length) {
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const [px, pzRaw] of points2D) {
        const pz = pzRaw; // already scaled
        if (px < minX) minX = px; if (px > maxX) maxX = px;
        if (pz < minZ) minZ = pz; if (pz > maxZ) maxZ = pz;
      }
      cx = (minX + maxX) / 2;
      cz = (minZ + maxZ) / 2;
    }

    const threePoints = points2D.map(([px, pz]) => new THREE.Vector3(px - cx, y, pz - cz));
    // Create a tube so the path is clearly visible across browsers
    const curve = new THREE.CatmullRomCurve3(threePoints);
    const tubularSegments = Math.max(threePoints.length * 8, 100);
    const geom = new THREE.TubeGeometry(curve, tubularSegments, radius, 8, false);
    const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.0, roughness: 0.6, emissive: new THREE.Color(color).multiplyScalar(0.15) });
    const mesh = new THREE.Mesh(geom, mat);
    this.rootGroup.add(mesh);
  }

  async loadPlan(plan: Plan): Promise<void> {
    if (!this.scene || !this.rootGroup) return;

    // Clear previous meshes
    this.floors.forEach(m => this.rootGroup!.remove(m));
    this.walls.forEach(m => this.rootGroup!.remove(m));
    if (this.houseModelRoot && this.rootGroup) {
      this.rootGroup.remove(this.houseModelRoot);
    }
    this.floors = [];
    this.walls = [];
    this.wallBounds = [];
    this.wallMaterials.clear();
    this.originalFloorMaterials.clear();
    this.houseModelRoot = null;
    this.clearFurniture();
    this.setActiveFurniture(null);

    const wallHeight = plan.ceilingHeightMeters;
    const wallThickness = plan.defaultWallThicknessMeters;

    // Compute bounds to center camera
    const allPoints: THREE.Vector3[] = [];
    for (const room of plan.rooms) {
      for (const [x, y] of room.polygon) {
        allPoints.push(new THREE.Vector3(x, 0, y));
      }
    }
    const bbox = new THREE.Box3().setFromPoints(allPoints);
    const center = bbox.getCenter(new THREE.Vector3());

    const planSize = bbox.getSize(new THREE.Vector3());
    const halfDepth = planSize.z / 2;

    // Create floors and walls per room
    for (const room of plan.rooms) {
      const shape = new THREE.Shape();
      room.polygon.forEach(([x, y], i) => {
        const vx = x - center.x;
        const vy = y - center.z;
        if (i === 0) shape.moveTo(vx, vy); else shape.lineTo(vx, vy);
      });
      // Close is implicit

      // Floor
      const floorGeom = new THREE.ShapeGeometry(shape, 1);
      const floorMat = this.getFloorMaterial(room.floorMaterial as FloorMaterialKey | undefined);
      const floorMesh = new THREE.Mesh(floorGeom, floorMat);
      floorMesh.rotation.x = -Math.PI / 2; // XY shape -> XZ plane
      this.rootGroup.add(floorMesh);
      this.floors.push(floorMesh);
      // Store original material for reset
      if (floorMat instanceof THREE.MeshStandardMaterial) {
        this.originalFloorMaterials.set(floorMesh, floorMat.clone());
      }

      // Walls along edges
      for (let i = 0; i < room.polygon.length; i++) {
        const [x1, y1] = room.polygon[i];
        const [x2, y2] = room.polygon[(i + 1) % room.polygon.length];
        const v1 = new THREE.Vector3(x1 - center.x, 0, y1 - center.z);
        const v2 = new THREE.Vector3(x2 - center.x, 0, y2 - center.z);

        const seg = new THREE.Vector3().subVectors(v2, v1);
        const length = seg.length();

        // Position wall: center between v1 and v2
        const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
        const angle = Math.atan2(seg.z, seg.x);

        const isExterior =
          Math.abs(Math.abs(mid.z) - halfDepth) < halfDepth * 0.15 ||
          Math.abs(Math.abs(mid.x) - planSize.x / 2) < planSize.x * 0.15;

        let wantsDoor = false;
        const isFrontExterior =
          isExterior &&
          Math.abs(mid.z + halfDepth) < Math.max(0.5, halfDepth * 0.1);
        if (isFrontExterior && length > 1.6) {
          // Primary entry door on a front-facing exterior wall
          wantsDoor = true;
        } else if (!isExterior && length > 1.4) {
          // Interior walls long enough become door segments to keep rooms accessible
          wantsDoor = true;
        }

        const wantsWindow = isExterior && !wantsDoor && length > 2.0;

        const wallContainer = new THREE.Group();
        wallContainer.position.set(mid.x, wallHeight / 2, mid.z);
        wallContainer.rotation.y = -angle;

        const wallMat = new THREE.MeshStandardMaterial({ color: 0xb5b5b5, metalness: 0.0, roughness: 0.9 });
        this.wallMaterials.add(wallMat); // Track wall materials
        const halfLen = length / 2;

        // Helper to create a wall slice in local wall coordinates
        const addWallSlice = (sliceLength: number, sliceHeight: number, centerX: number, centerY: number) => {
          if (sliceLength <= 0.05 || sliceHeight <= 0.05) return;
          const geom = new THREE.BoxGeometry(sliceLength, sliceHeight, wallThickness);
          const mesh = new THREE.Mesh(geom, wallMat);
          mesh.position.set(centerX, centerY, 0);
          wallContainer.add(mesh);
        };

        if (!wantsDoor && !wantsWindow) {
          // Solid wall segment
          addWallSlice(length, wallHeight, 0, 0);
        } else if (wantsDoor) {
          // Wall with a door cut-out
          const doorWidth = 0.9;
          const doorHeight = 2.1;
          if (length <= doorWidth + 0.4) {
            addWallSlice(length, wallHeight, 0, 0);
          } else {
            const sideLength = (length - doorWidth) / 2;
            const sideCenterOffset = doorWidth / 2 + sideLength / 2;
            // Left & right full-height wall pieces
            addWallSlice(sideLength, wallHeight, -sideCenterOffset, 0);
            addWallSlice(sideLength, wallHeight, sideCenterOffset, 0);
            // Top piece above the door
            const topHeight = Math.max(wallHeight - doorHeight, 0.3);
            const topCenterY = doorHeight / 2;
            addWallSlice(doorWidth, topHeight, 0, topCenterY);

            // Door mesh in the opening
            const doorGeom = new THREE.BoxGeometry(doorWidth * 0.98, doorHeight, wallThickness * 0.6);
            const doorMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, metalness: 0.25, roughness: 0.55 });
            const doorMesh = new THREE.Mesh(doorGeom, doorMat);
            // Position so the door rests on the floor (y = 0 in world space)
            doorMesh.position.set(0, doorHeight / 2 - wallHeight / 2, wallThickness * 0.35);
            wallContainer.add(doorMesh);
          }
        } else if (wantsWindow) {
          // Wall with a window cut-out
          const windowWidth = Math.min(1.8, length * 0.45);
          const windowHeight = wallHeight * 0.45;
          const sillHeight = wallHeight * 0.9 - windowHeight; // keep head height near top

          if (length <= windowWidth + 0.4 || windowHeight <= 0.3) {
            addWallSlice(length, wallHeight, 0, 0);
          } else {
            const sideLength = (length - windowWidth) / 2;
            const sideCenterOffset = windowWidth / 2 + sideLength / 2;

            // Left & right piers
            addWallSlice(sideLength, wallHeight, -sideCenterOffset, 0);
            addWallSlice(sideLength, wallHeight, sideCenterOffset, 0);

            // Wall below window
            const bottomHeight = sillHeight;
            const bottomCenterY = -wallHeight / 2 + bottomHeight / 2;
            addWallSlice(windowWidth, bottomHeight, 0, bottomCenterY);

            // Wall above window
            const topHeight = wallHeight - (sillHeight + windowHeight);
            const topCenterY = -wallHeight / 2 + sillHeight + windowHeight + topHeight / 2;
            addWallSlice(windowWidth, topHeight, 0, topCenterY);

            // Window glass in the opening
            const windowGeom = new THREE.BoxGeometry(windowWidth * 0.98, windowHeight * 0.98, wallThickness * 0.3);
            const windowMat = new THREE.MeshPhysicalMaterial({
              color: 0x9ecffb,
              metalness: 0.0,
              roughness: 0.05,
              transmission: 0.85,
              transparent: true,
              opacity: 0.95,
            });
            const windowMesh = new THREE.Mesh(windowGeom, windowMat);
            const windowCenterY = -wallHeight / 2 + sillHeight + windowHeight / 2;
            windowMesh.position.set(0, windowCenterY, wallThickness * 0.35);
            wallContainer.add(windowMesh);
          }
        }

        this.rootGroup.add(wallContainer);
        this.walls.push(wallContainer);
        this.wallBounds.push(new THREE.Box3().setFromObject(wallContainer));
      }
    }

    // Focus controls on center and frame scene
    if (this.controls && this.camera) {
      this.controls.target.set(0, 0, 0);
      this.controls.update();

      // Set camera distance based on size
      const size = bbox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.z, wallHeight);
      const dist = maxDim * 2.2;
      this.camera.position.set(dist, dist, dist);
    }
  }

  async loadStaticHouseModel(baseName: string): Promise<void> {
    if (!this.scene || !this.rootGroup) return;

    // Clear previous geometry but keep viewer wiring the same
    this.floors.forEach(m => this.rootGroup!.remove(m));
    this.walls.forEach(m => this.rootGroup!.remove(m));
    if (this.houseModelRoot && this.rootGroup) {
      this.rootGroup.remove(this.houseModelRoot);
    }
    this.floors = [];
    this.walls = [];
    this.wallBounds = [];
    this.houseModelRoot = null;
    this.clearFurniture();
    this.setActiveFurniture(null);

    const raw = await loadHouseObjMtl(baseName);

    const box = new THREE.Box3().setFromObject(raw);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Ensure key architectural materials (doors, glass) render correctly
    raw.traverse(child => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach(mat => {
        const m = mat as THREE.Material & {
          name?: string;
          side?: number;
          transparent?: boolean;
          opacity?: number;
          map?: THREE.Texture | null;
        };
        const name = (m.name ?? '').toLowerCase();
        if (name.includes('door')) {
          m.side = THREE.DoubleSide;
        }
        if (name.includes('glass') || name.includes('szklo')) {
          // Make glass look transparent from both sides
          m.side = THREE.DoubleSide;
          m.transparent = true;
          if (m.opacity === undefined || m.opacity === 1) {
            m.opacity = 0.35;
          }
          (m as any).depthWrite = false;
          const anyMat = m as any;
          if (anyMat.color && (anyMat.color as any).isColor) {
            anyMat.color.setHex(0x9ecffb);
          }
        }

        // For the second house model, tighten the wood floor planks by increasing texture tiling.
        if (
          baseName === 'house2' &&
          m.map &&
          (name.includes('pod') || name.includes('prah'))
        ) {
          // Stronger tiling so wood planks appear much smaller in house2
          m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping;
          m.map.repeat.set(8, 8);
          m.map.needsUpdate = true;
        }
      });
    });

    // Center model and lift it a bit more above the grid
    const houseYOffset = 1.19;
    raw.position.sub(center);
    raw.position.y -= box.min.y;
    raw.position.y += houseYOffset;

    this.rootGroup.add(raw);
    this.houseModelRoot = raw;

    // Update world matrices so we can compute floor height from the model
    raw.updateMatrixWorld(true);

    // Try to detect floor height from materials that look like floor surfaces
    let floorY = Infinity;
    raw.traverse(child => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const hasFloorMaterial = materials.some(mat => {
        const m = mat as THREE.Material & { name?: string };
        const name = (m.name ?? '').toLowerCase();
        return (
          name.includes('floor') ||
          name.includes('laminate') ||
          name.includes('podloga') ||
          name.includes('terakota') ||
          name.includes('wood')
        );
      });
      if (!hasFloorMaterial) return;
      const boxWorld = new THREE.Box3().setFromObject(mesh);
      if (boxWorld.min.y < floorY) {
        floorY = boxWorld.min.y;
      }
    });

    if (!Number.isFinite(floorY)) {
      // Fallback to model bottom if we couldn't detect a floor surface
      const worldBox = new THREE.Box3().setFromObject(raw);
      floorY = worldBox.min.y;
    }

    // Build collision bounds for static house geometry so furniture cannot overlap outer shell walls.
    // Keep this conservative so that interior placement stays possible.
    this.wallBounds = [];
    const tmpBox = new THREE.Box3();
    const tmpSize = new THREE.Vector3();
    const halfX = size.x / 2;
    const halfZ = size.z / 2;
    raw.traverse(child => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const matNames = materials.map(mat => ((mat as THREE.Material & { name?: string }).name ?? '').toLowerCase());
      const isFloorMat = matNames.some(name =>
        name.includes('floor') ||
        name.includes('laminate') ||
        name.includes('podloga') ||
        name.includes('terakota') ||
        name.includes('wood')
      );
      if (isFloorMat) return;
      tmpBox.setFromObject(mesh);
      tmpBox.getSize(tmpSize);
      // Ignore very low or tiny objects
      if (tmpSize.y < 0.5 || (tmpSize.x < 0.1 && tmpSize.z < 0.1)) return;
      const center = tmpBox.getCenter(new THREE.Vector3());
      // Only treat geometry very close to the outer extents as blocking walls
      const nearOuterEdge =
        Math.abs(center.x) > halfX * 0.8 ||
        Math.abs(center.z) > halfZ * 0.8;
      if (!nearOuterEdge) return;
      this.wallBounds.push(tmpBox.clone());
    });

    // Invisible floor helper for raycasting / furniture placement at detected height
    const floorGeom = new THREE.PlaneGeometry(size.x * 1.05, size.z * 1.05);
    const floorMat = new THREE.MeshBasicMaterial({ visible: false });
    const floorMesh = new THREE.Mesh(floorGeom, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = floorY + 0.01;
    this.rootGroup.add(floorMesh);
    this.floors = [floorMesh];

    // Frame camera around the imported model
    if (this.controls && this.camera) {
      const targetY = floorY + size.y * 0.5;
      this.controls.target.set(0, targetY, 0);
      this.controls.update();

      const maxDim = Math.max(size.x, size.z, size.y);
      const dist = maxDim * 1.8;
      this.camera.position.set(dist, dist, dist);
    }

    this.emitFurnitureUpdate();
  }

  applyMaterialToFloors(key: FloorMaterialKey): void {
    const mat = this.getFloorMaterial(key);
    this.floors.forEach(f => { f.material = mat; });
  }

  dispose(): void {
    this.stopDragging({ emitUpdate: false, updateState: false });
    if (this.renderer && this.canvasClickHandler) {
      this.renderer.domElement.removeEventListener('click', this.canvasClickHandler);
    }
    if (this.renderer) {
      this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
      this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);
      this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
      this.renderer.domElement.removeEventListener('pointerleave', this.handlePointerUp);
      this.renderer.domElement.removeEventListener('pointercancel', this.handlePointerUp);
    }
    this.canvasClickHandler = null;
    this.suppressClick = false;

    if (this.resizeObserver && this.container) {
      this.resizeObserver.unobserve(this.container);
    }
    this.resizeObserver = null;

    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }
    this.scene = null;
    this.camera = null;
    this.rootGroup = null;
    this.furnitureGroup = null;
    this.raycaster = null;
    this.pointer = null;
    this.activeFurnitureId = null;
    this.container = null;
    this.floors = [];
    this.walls = [];
    this.wallBounds = [];
    this.wallMaterials.clear();
    this.originalFloorMaterials.clear();
    this.houseModelRoot = null;
    this.furnitureItems.clear();
    this.selectFurnitureInternal(null, true);
    this.selectionHelper = null;
    this.interactionState = 'idle';
    this.furnitureCallbacks = {};
    this.controlsStateSnapshot = null;
    this.draggingPointerId = null;
    this.isDraggingFurniture = false;
    this.dragOffset = null;
    this.suppressClick = false;
    this.disposePreview();
    this.lastPointer = null;
  }

  setFurnitureCallbacks(callbacks: FurnitureCallbacks): void {
    this.furnitureCallbacks = callbacks;
    this.emitFurnitureUpdate();
  }

  setActiveFurniture(id: DemoFurnitureId | null): void {
    this.activeFurnitureId = id;
    this.interactionState = id ? 'placing' : 'idle';
    void this.preparePreview(id);
    this.updateCanvasCursor();
    this.emitFurnitureUpdate();
  }

  selectFurniture(id: string | null): void {
    this.selectFurnitureInternal(id);
  }

  beginMoveSelected(): boolean {
    if (!this.selectedFurnitureId) return false;
    this.interactionState = 'moving';
    this.disposePreview();
    this.updateCanvasCursor();
    this.emitFurnitureUpdate();
    return true;
  }

  cancelInteraction(): void {
    this.interactionState = this.activeFurnitureId ? 'placing' : 'idle';
    if (this.interactionState === 'placing') {
      void this.preparePreview(this.activeFurnitureId);
    }
    this.restoreControls();
    this.updateCanvasCursor();
    this.emitFurnitureUpdate();
  }

  rotateSelected(deltaDegrees: number): void {
    if (!this.selectedFurnitureId) return;
    const item = this.furnitureItems.get(this.selectedFurnitureId);
    if (!item) return;
    item.object.rotation.y += THREE.MathUtils.degToRad(deltaDegrees);
    this.selectionHelper?.update(item.object);
    this.emitFurnitureUpdate();
  }

  removeFurniture(id: string): void {
    const item = this.furnitureItems.get(id);
    if (!item || !this.furnitureGroup) return;
    this.stopDragging({ emitUpdate: false, updateState: false });
    this.furnitureGroup.remove(item.object);
    this.disposeObject(item.object);
    this.furnitureItems.delete(id);
    if (this.selectedFurnitureId === id) {
      this.selectFurnitureInternal(null, true);
    }
    this.interactionState = this.activeFurnitureId ? 'placing' : 'idle';
    this.restoreControls();
    this.updateCanvasCursor();
    this.emitFurnitureUpdate();
  }

  setSelectedColor(color: string | number): void {
    if (!this.selectedFurnitureId) return;
    const item = this.furnitureItems.get(this.selectedFurnitureId);
    if (!item) return;
    const targetColor = new THREE.Color(color as any);
    item.object.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(mat => {
          const m = mat as THREE.Material & {
            color?: THREE.Color;
            name?: string;
            userData?: { originalColor?: THREE.Color; [key: string]: any };
          };
          if (!m.userData) m.userData = {};
          // Capture original color once so we can restore it later.
          if (m.color && (m.color as any).isColor && !m.userData.originalColor) {
            m.userData.originalColor = m.color.clone();
          }
          // Decide which materials should change color.
          const name = (m.name ?? '').toLowerCase();
          const isAccentGeneric =
            name.includes('pillow') ||
            name.includes('leaf') ||
            name.includes('plant') ||
            name.includes('stem') ||
            name.includes('plastic');

          let shouldRecolor = false;

          if (item.type === 'dining') {
            // For the dining table, recolor the legs (Metal_Black materials) and keep the wood top as-is.
            const isLegMaterial = name.includes('metal_black');
            shouldRecolor = isLegMaterial;
          } else if (item.type === 'plant') {
            // For the plant, recolor only the cement wall/pot material and keep leaves and dirt as-is.
            const isCement = name.includes('cement');
            shouldRecolor = isCement;
          } else if (item.type === 'coffee-table') {
            // For the coffee table, treat generic accents as above but don't special-case metal (it doesn't use it).
            shouldRecolor = !isAccentGeneric;
          } else {
            // Default behavior: recolor primary body materials but keep obvious accents.
            const isMetalAccent =
              name.includes('metal') ||
              name.includes('handle') ||
              name.includes('knob');
            const isAccent = isAccentGeneric || isMetalAccent;
            shouldRecolor = !isAccent;
          }

          if (m.color && (m.color as any).isColor && shouldRecolor) {
            m.color.copy(targetColor);
          }
        });
      }
    });
    this.selectionHelper?.update(item.object);
    this.emitFurnitureUpdate();
  }

  resetSelectedColors(): void {
    if (!this.selectedFurnitureId) return;
    const item = this.furnitureItems.get(this.selectedFurnitureId);
    if (!item) return;
    item.object.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(mat => {
          const m = mat as THREE.Material & {
            color?: THREE.Color;
            userData?: { originalColor?: THREE.Color; [key: string]: any };
          };
          const original = m.userData?.originalColor;
          if (m.color && (m.color as any).isColor && original) {
            m.color.copy(original);
          }
        });
      }
    });
    this.selectionHelper?.update(item.object);
    this.emitFurnitureUpdate();
  }

  clearFurniture(): void {
    this.stopDragging({ emitUpdate: false, updateState: false });
    if (!this.furnitureGroup) return;
    for (let i = this.furnitureGroup.children.length - 1; i >= 0; i--) {
      const child = this.furnitureGroup.children[i];
      this.furnitureGroup.remove(child);
      this.disposeObject(child);
    }
    this.furnitureItems.clear();
    this.selectFurnitureInternal(null, true);
    this.interactionState = this.activeFurnitureId ? 'placing' : 'idle';
    this.restoreControls();
    this.updateCanvasCursor();
    this.emitFurnitureUpdate();
  }

  private resize(): void {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private animate = (): void => {
    if (!this.renderer || !this.scene || !this.camera) return;
    requestAnimationFrame(this.animate);
    if (this.controls) this.controls.update();
    if (this.selectionHelper && this.selectedFurnitureId) {
      const item = this.furnitureItems.get(this.selectedFurnitureId);
      if (item) {
        this.selectionHelper.update(item.object);
      }
    }
    this.renderer.render(this.scene, this.camera);
  };

  private getFloorMaterial(key?: FloorMaterialKey): THREE.MeshStandardMaterial {
    const resolvedKey: FloorMaterialKey = key ?? 'default';
    const cacheHit = this.floorMaterialCache.get(resolvedKey);
    if (cacheHit) return cacheHit;

    const loader = new THREE.TextureLoader();
    let material: THREE.MeshStandardMaterial;

    if (resolvedKey === 'wood') {
      // Use tile texture for wood-design floors so pattern scales nicely
      const tex = this.getFloorTexture('tile', loader, 'components/textures/tile_floor.png');
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(3, 3);
      material = new THREE.MeshStandardMaterial({
        map: tex,
        color: 0xffffff,
        metalness: 0.0,
        roughness: 0.8,
      });
    } else if (resolvedKey === 'tile') {
      const tex = this.getFloorTexture('tile', loader, 'components/textures/tile_floor.png');
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(3, 3);
      material = new THREE.MeshStandardMaterial({
        map: tex,
        color: 0xffffff,
        metalness: 0.15,
        roughness: 0.6,
      });
    } else if (resolvedKey === 'concrete') {
      material = new THREE.MeshStandardMaterial({ color: 0x9e9e9e, metalness: 0.2, roughness: 0.9 });
    } else {
      material = new THREE.MeshStandardMaterial({ color: 0xeaeaea, metalness: 0.0, roughness: 0.9 });
    }

    this.floorMaterialCache.set(resolvedKey, material);
    return material;
  }

  private getFloorTexture(key: FloorMaterialKey, loader: THREE.TextureLoader, url: string): THREE.Texture {
    const existing = this.floorTextureCache.get(key);
    if (existing) return existing;
    const tex = loader.load(url);
    this.floorTextureCache.set(key, tex);
    return tex;
  }

  private async handleCanvasClick(event: MouseEvent): Promise<void> {
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }
    if (!this.renderer || !this.camera || !this.raycaster || !this.pointer) return;
    this.updatePointerFromEvent(event);

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const furnitureHit = this.findFurnitureIntersection();
    if (furnitureHit) {
      this.selectFurnitureInternal(furnitureHit.id);
      this.interactionState = 'idle';
      this.updateCanvasCursor();
      this.emitFurnitureUpdate();
      return;
    }

    const point = this.intersectFloor();
    if (!point || !this.furnitureGroup) return;

    if (this.interactionState === 'moving') {
      return;
    }

    this.deselectFurniture();

    if (this.interactionState === 'placing' && this.activeFurnitureId) {
      const item = await this.createFurnitureItem(this.activeFurnitureId);
      const placed = this.positionFurniture(item, point);
      if (!placed) {
        this.disposeObject(item.object);
        return;
      }
      this.furnitureGroup.add(item.object);
      this.furnitureItems.set(item.id, item);
      this.tagFurnitureObject(item);
      this.selectFurnitureInternal(item.id, true);
      this.emitFurnitureUpdate();
      this.updatePreviewPosition(point);
      return;
    }
  }

  private updatePointerFromEvent(event: { clientX: number; clientY: number }): void {
    if (!this.renderer || !this.pointer) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    if (!this.lastPointer) {
      this.lastPointer = new THREE.Vector2();
    }
    this.lastPointer.copy(this.pointer);
  }

  private positionFurniture(item: FurnitureItem, point: THREE.Vector3, options?: { preserveY?: boolean; applyOffset?: boolean }): boolean {
    const preserveY = options?.preserveY ?? false;
    const applyOffset = options?.applyOffset ?? false;
    let x = point.x;
    let z = point.z;
    if (applyOffset && this.dragOffset) {
      x += this.dragOffset.x;
      z += this.dragOffset.z;
    }
    const y = preserveY ? item.object.position.y : point.y + 0.01;

    const prevPosition = item.object.position.clone();
    item.object.position.set(x, y, z);

    // Prevent furniture from intersecting walls; if collision detected, revert.
    if (this.collidesWithWalls(item.object)) {
      item.object.position.copy(prevPosition);
      this.selectionHelper?.update(item.object);
      return false;
    }

    this.selectionHelper?.update(item.object);
    return true;
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (!event.isPrimary || event.button !== 0) return;
    if (!this.renderer || !this.camera || !this.raycaster || !this.pointer) return;
    if (this.interactionState !== 'moving' || !this.selectedFurnitureId) return;
    const item = this.furnitureItems.get(this.selectedFurnitureId);
    if (!item) return;

    this.updatePointerFromEvent(event);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const point = this.intersectFloor();
    if (!point) return;

    this.freezeControls();
    this.dragOffset = new THREE.Vector3(
      item.object.position.x - point.x,
      0,
      item.object.position.z - point.z
    );
    this.isDraggingFurniture = true;
    this.suppressClick = true;
    this.draggingPointerId = event.pointerId;
    this.renderer.domElement.setPointerCapture(event.pointerId);
    this.updateCanvasCursor();
    event.preventDefault();
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.renderer || !this.camera || !this.raycaster || !this.pointer) return;
    this.updatePointerFromEvent(event);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    if (this.isDraggingFurniture && this.draggingPointerId === event.pointerId) {
      const item = this.selectedFurnitureId ? this.furnitureItems.get(this.selectedFurnitureId) : null;
      if (!item) {
        this.stopDragging({ emitUpdate: false, updateState: true });
        return;
      }
      const point = this.intersectFloor();
      if (!point) return;
      const moved = this.positionFurniture(item, point, { preserveY: true, applyOffset: true });
      if (moved) {
        this.emitFurnitureUpdate();
      }
      return;
    }

    if (this.interactionState === 'placing' && this.previewObject) {
      const point = this.intersectFloor();
      this.updatePreviewPosition(point);
    }
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (this.draggingPointerId !== null && event.pointerId !== this.draggingPointerId) return;
    if (!this.renderer || !this.camera || !this.raycaster || !this.pointer) {
      this.stopDragging({ emitUpdate: true, updateState: true });
      return;
    }

    if (this.isDraggingFurniture) {
      const item = this.selectedFurnitureId ? this.furnitureItems.get(this.selectedFurnitureId) : null;
      if (item) {
        this.updatePointerFromEvent(event);
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const point = this.intersectFloor();
        if (point) {
          void this.positionFurniture(item, point, { preserveY: true, applyOffset: true });
        }
      }
    }

    this.stopDragging({ emitUpdate: true, updateState: true });

    if (event.type === 'pointerleave' || event.type === 'pointercancel') {
      this.updatePreviewPosition(null);
    } else if (this.interactionState === 'placing') {
      this.updatePreviewFromPointer();
    }
  };

  private stopDragging(options?: { emitUpdate?: boolean; updateState?: boolean }): void {
    const emitUpdate = options?.emitUpdate ?? true;
    const updateState = options?.updateState ?? true;

    if (this.renderer && this.draggingPointerId !== null) {
      try {
        this.renderer.domElement.releasePointerCapture(this.draggingPointerId);
      } catch {
        // ignore
      }
    }

    this.isDraggingFurniture = false;
    this.draggingPointerId = null;
    this.dragOffset = null;

    if (updateState) {
      this.interactionState = this.activeFurnitureId ? 'placing' : 'idle';
    }
    if (this.interactionState === 'placing') {
      void this.preparePreview(this.activeFurnitureId);
    }
    this.restoreControls();
    this.updateCanvasCursor();
    if (emitUpdate) {
      this.emitFurnitureUpdate();
    }
    if (this.suppressClick) {
      setTimeout(() => {
        this.suppressClick = false;
      }, 0);
    }
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(mat => mat.dispose?.());
        } else {
          (mesh.material as THREE.Material).dispose?.();
        }
      }
    });
  }

  private async createFurnitureItem(type: DemoFurnitureId): Promise<FurnitureItem> {
    const object = await createFurnitureObject(type);
    const id = THREE.MathUtils.generateUUID();
    object.name = `furniture-${id}`;
    object.userData.furnitureId = id;
    return {
      id,
      type,
      name: FURNITURE_LABELS[type],
      object,
    };
  }

  private tagFurnitureObject(item: FurnitureItem): void {
    item.object.userData.furnitureId = item.id;
    item.object.traverse(child => {
      child.userData = child.userData || {};
      child.userData.furnitureId = item.id;
    });
  }

  private findFurnitureIntersection(): FurnitureItem | null {
    if (!this.raycaster) return null;
    const targets = Array.from(this.furnitureItems.values()).map(item => item.object);
    if (!targets.length) return null;
    const intersects = this.raycaster.intersectObjects(targets, true);
    if (!intersects.length) return null;
    const intersection = intersects[0].object;
    const furnitureId = intersection.userData?.furnitureId;
    if (!furnitureId) return null;
    return this.furnitureItems.get(furnitureId) ?? null;
  }

  private intersectFloor(): THREE.Vector3 | null {
    if (!this.raycaster) return null;
    if (this.floors.length) {
      const intersects = this.raycaster.intersectObjects(this.floors, false);
      if (intersects.length > 0) {
        return intersects[0].point.clone();
      }
    }
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const fallback = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(floorPlane, fallback)) {
      return fallback;
    }
    return null;
  }

  private collidesWithWalls(object: THREE.Object3D): boolean {
    if (!this.wallBounds.length) return false;
    const furnitureBox = new THREE.Box3().setFromObject(object);
    for (const wallBox of this.wallBounds) {
      if (furnitureBox.intersectsBox(wallBox)) {
        return true;
      }
    }
    return false;
  }

  private selectFurnitureInternal(id: string | null, skipEmit = false): void {
    if (this.selectionHelper && this.scene) {
      this.scene.remove(this.selectionHelper);
      this.selectionHelper = null;
    }
    this.selectedFurnitureId = id;
    if (id) {
      const item = this.furnitureItems.get(id);
      if (item && this.scene) {
        this.selectionHelper = new THREE.BoxHelper(item.object, 0x1e90ff);
        this.scene.add(this.selectionHelper);
        this.selectionHelper.update(item.object);
      }
    }
    if (!skipEmit) {
      this.emitFurnitureUpdate();
    }
  }

  private updateCanvasCursor(): void {
     if (!this.renderer?.domElement) return;
    const canvas = this.renderer.domElement;
    canvas.classList.toggle('placing-furniture', this.interactionState === 'placing');
    canvas.classList.toggle('moving-furniture', this.interactionState === 'moving' && !this.isDraggingFurniture);
    canvas.classList.toggle('dragging-furniture', this.isDraggingFurniture);
  }

  private emitFurnitureUpdate(): void {
    if (!this.furnitureCallbacks.onUpdate) return;
    const counts = new Map<DemoFurnitureId, number>();
    const items: FurnitureSnapshot[] = [];
    for (const item of this.furnitureItems.values()) {
      const count = (counts.get(item.type) ?? 0) + 1;
      counts.set(item.type, count);
      items.push({
        id: item.id,
        type: item.type,
        name: item.name,
        label: `${item.name} (${count})`,
        position: { x: item.object.position.x, y: item.object.position.y, z: item.object.position.z },
        rotation: item.object.rotation.y,
      });
    }

    this.furnitureCallbacks.onUpdate({
      items,
      selectedId: this.selectedFurnitureId,
      interaction: this.interactionState,
    });
  }

  private async preparePreview(type: DemoFurnitureId | null): Promise<void> {
    if (!type || !this.scene) {
      this.disposePreview();
      return;
    }

    if (this.previewObject && this.previewType === type) {
      this.previewObject.visible = false;
      this.updatePreviewFromPointer();
      return;
    }

    this.disposePreview();
    const preview = await createFurnitureObject(type);
    this.applyPreviewMaterial(preview);
    this.previewObject = preview;
    this.previewType = type;
    this.previewObject.name = 'preview-furniture';
    this.previewObject.visible = false;

    if (this.furnitureGroup) {
      this.furnitureGroup.add(this.previewObject);
    } else if (this.rootGroup) {
      this.rootGroup.add(this.previewObject);
    }

    this.updatePreviewFromPointer();
  }

  private disposePreview(): void {
    if (!this.previewObject) return;
    if (this.previewObject.parent) {
      this.previewObject.parent.remove(this.previewObject);
    }
    this.disposeObject(this.previewObject);
    this.previewObject = null;
    this.previewType = null;
  }

  private applyPreviewMaterial(object: THREE.Object3D): void {
    object.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map(mat => this.clonePreviewMaterial(mat));
        } else {
          mesh.material = this.clonePreviewMaterial(mesh.material as THREE.Material);
        }
      }
    });
  }

  private clonePreviewMaterial(material: THREE.Material): THREE.Material {
    const previewMat = material.clone() as THREE.Material & { opacity?: number; transparent?: boolean; depthWrite?: boolean };
    previewMat.transparent = true;
    previewMat.opacity = previewMat.opacity !== undefined ? Math.min(previewMat.opacity, 0.5) : 0.5;
    previewMat.depthWrite = false;
    return previewMat;
  }

  private updatePreviewFromPointer(): void {
    if (!this.previewObject || !this.camera || !this.raycaster || !this.lastPointer) {
      this.updatePreviewPosition(null);
      return;
    }
    this.raycaster.setFromCamera(this.lastPointer, this.camera);
    const point = this.intersectFloor();
    this.updatePreviewPosition(point);
  }

  private updatePreviewPosition(point: THREE.Vector3 | null): void {
    if (!this.previewObject) return;
    if (!point) {
      this.previewObject.visible = false;
      return;
    }
    this.previewObject.visible = true;
    this.previewObject.position.set(point.x, point.y + 0.01, point.z);
  }

  private freezeControls(): void {
    if (!this.controls) return;
    this.controlsStateSnapshot = {
      enabled: this.controls.enabled,
      enableRotate: this.controls.enableRotate,
      enablePan: this.controls.enablePan,
    };
    this.controls.enabled = false;
  }

  private restoreControls(): void {
    if (!this.controlsStateSnapshot || !this.controls) return;
    this.controls.enabled = this.controlsStateSnapshot.enabled;
    this.controls.enableRotate = this.controlsStateSnapshot.enableRotate;
    this.controls.enablePan = this.controlsStateSnapshot.enablePan;
    this.controlsStateSnapshot = null;
  }

  private deselectFurniture(): void {
    if (!this.selectedFurnitureId) return;
    this.selectFurnitureInternal(null);
    this.interactionState = this.activeFurnitureId ? 'placing' : 'idle';
    if (this.interactionState === 'placing') {
      void this.preparePreview(this.activeFurnitureId);
    }
    this.restoreControls();
    this.updateCanvasCursor();
  }

  clearSelectedFurniture(): void {
    this.deselectFurniture();
  }

  projectToScreen(point: { x: number; y: number; z: number } | THREE.Vector3): { x: number; y: number } | null {
    if (!this.camera || !this.renderer || !this.container) return null;
    const vector = point instanceof THREE.Vector3 ? point.clone() : new THREE.Vector3(point.x, point.y, point.z);
    vector.project(this.camera);
    if (vector.z < -1 || vector.z > 1) return null;

    const canvasRect = this.renderer.domElement.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();

    const x = (vector.x * 0.5 + 0.5) * canvasRect.width + (canvasRect.left - containerRect.left);
    const y = (-vector.y * 0.5 + 0.5) * canvasRect.height + (canvasRect.top - containerRect.top);
    return { x, y };
  }

  setWallColor(color: string | number): void {
    const targetColor = new THREE.Color(color as any);
    // Traverse all walls and update materials the same way furniture colors are changed
    this.walls.forEach(wall => {
      wall.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach(mat => {
            const m = mat as THREE.Material & {
              color?: THREE.Color;
              name?: string;
            };
            // Only change wall materials (MeshStandardMaterial), skip doors and windows
            if (m instanceof THREE.MeshStandardMaterial && m.color) {
              // Skip door material (brown) and window material (MeshPhysicalMaterial is handled above)
              const isDoor = m.color.getHex() === 0x8b5a2b;
              if (!isDoor) {
                m.color.copy(targetColor);
              }
            }
          });
        }
      });
    });
  }

  setFloorTexture(texturePath: string | null): void {
    if (texturePath === null) {
      // Reset to original materials
      this.floors.forEach(floor => {
        const original = this.originalFloorMaterials.get(floor);
        if (original) {
          floor.material = original.clone();
        }
      });
      return;
    }
    
    const loader = new THREE.TextureLoader();
    loader.load(texturePath, (texture) => {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(3, 3);
      
      this.floors.forEach(floor => {
        if (floor.material instanceof THREE.MeshStandardMaterial) {
          const newMaterial = floor.material.clone();
          newMaterial.map = texture;
          newMaterial.needsUpdate = true;
          floor.material = newMaterial;
        }
      });
    });
  }
}


