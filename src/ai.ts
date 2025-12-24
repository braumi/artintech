export type PlanRoom = {
  name: string;
  polygon: number[][]; // meters
  floorMaterial?: string;
  // Store wall segments with door/window information for this room
  walls?: Array<{
    start: number[];
    end: number[];
    // Support multiple openings per wall
    doors?: Array<{
      position: number; // 0-1 along the wall
      width: number;
    }>;
    windows?: Array<{
      position: number; // 0-1 along the wall
      width: number;
    }>;
    // Legacy single opening support (for backwards compatibility)
    hasDoor?: boolean;
    doorPosition?: number;
    doorWidth?: number;
    hasWindow?: boolean;
    windowPosition?: number;
    windowWidth?: number;
  }>;
};

export type Plan = {
  units: 'meters';
  ceilingHeightMeters: number;
  defaultWallThicknessMeters: number;
  rooms: PlanRoom[];
};

export type RoboflowDetection = {
  x: number;
  y: number;
  width: number;
  height: number;
  class: string;
  confidence: number;
};

export type RoboflowResponse = {
  predictions?: RoboflowDetection[];
  detections?: RoboflowDetection[];
};

export async function getCleanedBlueprintImage(file: File): Promise<string> {
  const base64 = await fileToDataUrl(file);
  const endpoint = getNetlifyFunctionUrl('blueprint-clean');
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ imageBase64: base64 })
  });

  if (!res.ok) {
    const text = await res.text();
    // eslint-disable-next-line no-console
    console.warn('Blueprint clean failed, using original image:', res.status, text);
    return base64;
  }
  const json = await res.json();
  return (json.cleanedImageBase64 as string) || base64;
}

export async function sendBlueprintForPlan(file: File): Promise<Plan> {
  const base64 = await fileToDataUrl(file);
  const endpoint = getNetlifyFunctionUrl('blueprint-to-plan');
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ imageBase64: base64 })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Blueprint processing failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  return json.plan as Plan;
}

function getNetlifyFunctionUrl(name: string): string {
  // In production or when using Netlify dev as the web server, this relative path works.
  const relative = `/.netlify/functions/${name}`;
  if (typeof window === 'undefined') return relative;
  const port = window.location.port;
  const host = window.location.hostname;
  const netlifyDevPort = (import.meta as any).env?.VITE_NETLIFY_DEV_PORT || '8888';
  const onLocalhost = host === 'localhost' || host === '127.0.0.1';
  const alreadyOnNetlifyDev = onLocalhost && port === String(netlifyDevPort);
  // If running Vite dev (e.g., :3000), point directly at Netlify dev port if available
  if (onLocalhost && !alreadyOnNetlifyDev) {
    return `http://localhost:${netlifyDevPort}/.netlify/functions/${name}`;
  }
  return relative;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Loads an image file and converts it to base64 data URL
 */
export function loadImageBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Calls Roboflow API to detect walls, doors, and windows in a blueprint image
 * @param file - The blueprint image file
 * @param confidence - Confidence threshold (0-100). Default: 50. Lower values return more detections but may include false positives.
 */
export async function getRoboflowDetections(file: File, confidence: number = 40): Promise<RoboflowResponse> {
  const imageBase64 = await loadImageBase64(file);
  
  // Use axios for the API call
  const axios = (await import('axios')).default;
  
  const response = await axios({
    method: "POST",
    url: "https://serverless.roboflow.com/cubicasanewdata40-khagw/2",
    params: {
      api_key: "L0xe3qoHGZFeUWhcPvsA",
      confidence: confidence // Confidence threshold (0-100)
    },
    data: imageBase64, // Send the full base64 data URL string
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });

  // Log the full JSON response from Roboflow
  // eslint-disable-next-line no-console
  console.log('[Roboflow] Full JSON Response:', JSON.stringify(response.data, null, 2));

  return response.data as RoboflowResponse;
}

/**
 * Represents a wall segment as a line from start to end
 */
type WallSegment = {
  start: number[]; // [x, y] in meters
  end: number[];   // [x, y] in meters
  center: number[]; // [x, y] center point
  length: number;
  angle: number; // angle in radians
  confidence: number;
};

/**
 * Represents a door or window detection
 */
type OpeningDetection = {
  center: number[]; // [x, y] in meters
  width: number;
  height: number;
  confidence: number;
};

/**
 * Calculate distance from a point to a line segment
 */
function distanceToSegment(point: number[], segmentStart: number[], segmentEnd: number[]): number {
  const [px, py] = point;
  const [sx, sy] = segmentStart;
  const [ex, ey] = segmentEnd;
  
  const dx = ex - sx;
  const dy = ey - sy;
  const length2 = dx * dx + dy * dy;
  
  if (length2 === 0) {
    // Segment is a point
    const dx2 = px - sx;
    const dy2 = py - sy;
    return Math.sqrt(dx2 * dx2 + dy2 * dy2);
  }
  
  // Calculate projection parameter t
  const t = Math.max(0, Math.min(1, ((px - sx) * dx + (py - sy) * dy) / length2));
  
  // Calculate closest point on segment
  const projX = sx + t * dx;
  const projY = sy + t * dy;
  
  // Return distance to projection point
  const dx2 = px - projX;
  const dy2 = py - projY;
  return Math.sqrt(dx2 * dx2 + dy2 * dy2);
}

/**
 * Find position along a wall segment (0-1) where an opening should be placed
 */
function positionAlongSegment(openingCenter: number[], segmentStart: number[], segmentEnd: number[]): number {
  const [ox, oy] = openingCenter;
  const [sx, sy] = segmentStart;
  const [ex, ey] = segmentEnd;
  
  const dx = ex - sx;
  const dy = ey - sy;
  const length2 = dx * dx + dy * dy;
  
  if (length2 === 0) return 0.5;
  
  // Project opening center onto segment
  const t = ((ox - sx) * dx + (oy - sy) * dy) / length2;
  return Math.max(0, Math.min(1, t));
}

/**
 * Convert Roboflow wall detection (bounding box) to wall segment (line)
 */
function detectionToWallSegment(
  detection: RoboflowDetection,
  imageWidth: number,
  imageHeight: number,
  scaleToMeters: number
): WallSegment {
  // Convert center coordinates from image space to world space
  const centerX = (detection.x - imageWidth / 2) * scaleToMeters;
  const centerY = (detection.y - imageHeight / 2) * scaleToMeters;
  const width = detection.width * scaleToMeters;
  const height = detection.height * scaleToMeters;
  
  // Determine if wall is horizontal or vertical based on aspect ratio
  const isHorizontal = width > height;
  
  let start: number[], end: number[], angle: number;
  
  if (isHorizontal) {
    // Horizontal wall segment
    const halfLength = width / 2;
    start = [centerX - halfLength, centerY];
    end = [centerX + halfLength, centerY];
    angle = 0;
  } else {
    // Vertical wall segment
    const halfLength = height / 2;
    start = [centerX, centerY - halfLength];
    end = [centerX, centerY + halfLength];
    angle = Math.PI / 2;
  }
  
  const length = Math.sqrt((end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2);
  
  return {
    start,
    end,
    center: [centerX, centerY],
    length,
    angle,
    confidence: detection.confidence
  };
}

/**
 * Reconstruct room polygon from wall segments by finding the outer boundary
 * This is a simplified approach - finds the convex hull of all wall endpoints
 */
function reconstructRoomPolygon(wallSegments: WallSegment[]): number[][] {
  if (wallSegments.length === 0) {
    return [[-5, -5], [5, -5], [5, 5], [-5, 5]];
  }
  
  // Collect all unique endpoints from wall segments
  const points = new Map<string, number[]>();
  
  wallSegments.forEach(wall => {
    const startKey = `${wall.start[0].toFixed(3)},${wall.start[1].toFixed(3)}`;
    const endKey = `${wall.end[0].toFixed(3)},${wall.end[1].toFixed(3)}`;
    points.set(startKey, wall.start);
    points.set(endKey, wall.end);
  });
  
  const uniquePoints = Array.from(points.values());
  
  if (uniquePoints.length < 3) {
    // Not enough points, create bounding box
    const xs = uniquePoints.flatMap(p => p[0]);
    const ys = uniquePoints.flatMap(p => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]];
  }
  
  // Simple approach: create a bounding box and use it as the room
  // A more sophisticated implementation would use convex hull or polygon reconstruction
  const xs = uniquePoints.map(p => p[0]);
  const ys = uniquePoints.map(p => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  // Add some padding
  const padding = 0.5;
  return [
    [minX - padding, minY - padding],
    [maxX + padding, minY - padding],
    [maxX + padding, maxY + padding],
    [minX - padding, maxY + padding]
  ];
}

/**
 * Map doors and windows to wall segments based on proximity
 */
function mapOpeningsToWalls(
  wallSegments: WallSegment[],
  doors: OpeningDetection[],
  windows: OpeningDetection[]
): Array<{
  start: number[];
  end: number[];
  doors?: Array<{ position: number; width: number }>;
  windows?: Array<{ position: number; width: number }>;
  // Legacy support
  hasDoor?: boolean;
  doorPosition?: number;
  doorWidth?: number;
  hasWindow?: boolean;
  windowPosition?: number;
  windowWidth?: number;
}> {
  return wallSegments.map(wall => {
    const result: {
      start: number[];
      end: number[];
      doors?: Array<{ position: number; width: number }>;
      windows?: Array<{ position: number; width: number }>;
      hasDoor?: boolean;
      doorPosition?: number;
      doorWidth?: number;
      hasWindow?: boolean;
      windowPosition?: number;
      windowWidth?: number;
    } = {
      start: wall.start,
      end: wall.end
    };
    
    // Find ALL doors on this wall (not just the closest)
    const doorsOnWall: Array<{ position: number; width: number }> = [];
    for (const door of doors) {
      const distance = distanceToSegment(door.center, wall.start, wall.end);
      // Consider door if it's within 0.5 meters of the wall
      if (distance < 0.5) {
        const position = positionAlongSegment(door.center, wall.start, wall.end);
        // Use standard door width for all doors
        doorsOnWall.push({ position, width: 0.9 }); // Standard door width: 0.9 meters (90cm)
      }
    }
    
    // Find ALL windows on this wall (not just the closest)
    const windowsOnWall: Array<{ position: number; width: number }> = [];
    for (const win of windows) {
      const distance = distanceToSegment(win.center, wall.start, wall.end);
      // Consider window if it's within 0.5 meters of the wall
      if (distance < 0.5) {
        const position = positionAlongSegment(win.center, wall.start, wall.end);
        windowsOnWall.push({ position, width: win.width });
      }
    }
    
    // Sort by position along wall (0 to 1)
    doorsOnWall.sort((a, b) => a.position - b.position);
    windowsOnWall.sort((a, b) => a.position - b.position);
    
    if (doorsOnWall.length > 0) {
      result.doors = doorsOnWall;
      // For backwards compatibility, set first door
      result.hasDoor = true;
      result.doorPosition = doorsOnWall[0].position;
      result.doorWidth = doorsOnWall[0].width;
    }
    
    if (windowsOnWall.length > 0) {
      result.windows = windowsOnWall;
      // For backwards compatibility, set first window (only if no doors)
      if (!result.doors) {
        result.hasWindow = true;
        result.windowPosition = windowsOnWall[0].position;
        result.windowWidth = windowsOnWall[0].width;
      }
    }
    
    return result;
  });
}

/**
 * Converts Roboflow detections to a Plan format
 * This function reconstructs room polygons from wall detections
 * and maps doors/windows to wall segments based on coordinates
 */
export function convertRoboflowToPlan(
  detections: RoboflowResponse,
  imageWidth: number = 1000,
  imageHeight: number = 1000,
  scaleToMeters: number = 0.01 // pixels to meters conversion factor (adjust based on blueprint scale)
): Plan {
  const predictions = detections.predictions || detections.detections || [];
  
  // Separate detections by class (case-insensitive)
  const walls = predictions.filter(d => {
    const className = d.class.toLowerCase();
    return className.includes('wall') && !className.includes('door') && !className.includes('window');
  });
  const doors = predictions.filter(d => {
    const className = d.class.toLowerCase();
    return className.includes('door');
  });
  const windows = predictions.filter(d => {
    const className = d.class.toLowerCase();
    return className.includes('window');
  });

  if (walls.length === 0) {
    // Fallback: create a default room if no walls detected
    return {
      units: 'meters',
      ceilingHeightMeters: 2.8,
      defaultWallThicknessMeters: 0.18,
      rooms: [{
        name: 'Main Room',
        polygon: [[-5, -5], [5, -5], [5, 5], [-5, 5]]
      }]
    };
  }

  // Convert wall detections to wall segments
  const wallSegments = walls.map(wall => 
    detectionToWallSegment(wall, imageWidth, imageHeight, scaleToMeters)
  );

  // Standard door width in meters (90cm is typical for interior doors)
  const STANDARD_DOOR_WIDTH = 0.9;
  
  // Convert door and window detections to world coordinates
  // Use standard door width for all doors instead of detected width
  const worldDoors: OpeningDetection[] = doors.map(door => ({
    center: [
      (door.x - imageWidth / 2) * scaleToMeters,
      (door.y - imageHeight / 2) * scaleToMeters
    ],
    width: STANDARD_DOOR_WIDTH, // Always use standard door width
    height: door.height * scaleToMeters,
    confidence: door.confidence
  }));

  const worldWindows: OpeningDetection[] = windows.map(window => ({
    center: [
      (window.x - imageWidth / 2) * scaleToMeters,
      (window.y - imageHeight / 2) * scaleToMeters
    ],
    width: window.width * scaleToMeters,
    height: window.height * scaleToMeters,
    confidence: window.confidence
  }));

  // Reconstruct room polygon from wall segments
  const roomPolygon = reconstructRoomPolygon(wallSegments);
  
  // Map doors and windows to actual wall segments based on proximity
  // This creates wall entries with door/window openings at the correct positions
  const wallsWithOpenings = mapOpeningsToWalls(wallSegments, worldDoors, worldWindows);
  
  // Also add any doors/windows that weren't mapped to walls (with a larger threshold)
  // Find unmapped doors and windows
  const mappedDoorIndices = new Set<number>();
  const mappedWindowIndices = new Set<number>();
  
  wallsWithOpenings.forEach(wall => {
    if (wall.hasDoor && wall.doorPosition !== undefined) {
      // Find which door was mapped by checking proximity
      worldDoors.forEach((door, idx) => {
        const doorX = wall.start[0] + (wall.end[0] - wall.start[0]) * wall.doorPosition!;
        const doorY = wall.start[1] + (wall.end[1] - wall.start[1]) * wall.doorPosition!;
        const dist = Math.sqrt((door.center[0] - doorX) ** 2 + (door.center[1] - doorY) ** 2);
        if (dist < 1.0) mappedDoorIndices.add(idx);
      });
    }
    if (wall.hasWindow && wall.windowPosition !== undefined) {
      // Find which window was mapped by checking proximity
      worldWindows.forEach((window, idx) => {
        const windowX = wall.start[0] + (wall.end[0] - wall.start[0]) * wall.windowPosition!;
        const windowY = wall.start[1] + (wall.end[1] - wall.start[1]) * wall.windowPosition!;
        const dist = Math.sqrt((window.center[0] - windowX) ** 2 + (window.center[1] - windowY) ** 2);
        if (dist < 1.0) mappedWindowIndices.add(idx);
      });
    }
  });
  
  // Add unmapped doors/windows as standalone wall segments (with increased threshold for mapping)
  const unmappedDoors = worldDoors.filter((_, idx) => !mappedDoorIndices.has(idx));
  const unmappedWindows = worldWindows.filter((_, idx) => !mappedWindowIndices.has(idx));
  
  unmappedDoors.forEach((door) => {
    // Determine orientation: if width > height, it's horizontal; otherwise vertical
    const isHorizontal = door.width > door.height;
    const length = isHorizontal ? door.width : door.height;
    const wallLength = Math.max(length, 0.5); // Minimum wall length
    
    let doorWallStart: number[];
    let doorWallEnd: number[];
    
    if (isHorizontal) {
      doorWallStart = [door.center[0] - wallLength / 2, door.center[1]];
      doorWallEnd = [door.center[0] + wallLength / 2, door.center[1]];
    } else {
      doorWallStart = [door.center[0], door.center[1] - wallLength / 2];
      doorWallEnd = [door.center[0], door.center[1] + wallLength / 2];
    }
    
    wallsWithOpenings.push({
      start: doorWallStart,
      end: doorWallEnd,
      hasDoor: true,
      doorPosition: 0.5,
      doorWidth: 0.9 // Standard door width: 0.9 meters (90cm)
    });
  });
  
  unmappedWindows.forEach((window) => {
    // Determine orientation: if width > height, it's horizontal; otherwise vertical
    const isHorizontal = window.width > window.height;
    const length = isHorizontal ? window.width : window.height;
    const wallLength = Math.max(length, 0.5); // Minimum wall length
    
    let windowWallStart: number[];
    let windowWallEnd: number[];
    
    if (isHorizontal) {
      windowWallStart = [window.center[0] - wallLength / 2, window.center[1]];
      windowWallEnd = [window.center[0] + wallLength / 2, window.center[1]];
    } else {
      windowWallStart = [window.center[0], window.center[1] - wallLength / 2];
      windowWallEnd = [window.center[0], window.center[1] + wallLength / 2];
    }
    
    wallsWithOpenings.push({
      start: windowWallStart,
      end: windowWallEnd,
      hasWindow: true,
      windowPosition: 0.5,
      windowWidth: window.width
    });
  });

  // Create Plan
  const plan: Plan = {
    units: 'meters',
    ceilingHeightMeters: 2.8,
    defaultWallThicknessMeters: 0.18,
    rooms: [{
      name: 'Main Room',
      polygon: roomPolygon,
      walls: wallsWithOpenings
    }]
  };

  return plan;
}

/**
 * Main function to get Plan from Roboflow API
 * @param file - The blueprint image file
 * @param confidence - Confidence threshold (0-100). Default: 50. Lower values return more detections but may include false positives.
 * @param scaleToMeters - Optional scale factor (meters per pixel). If provided, uses this instead of estimating.
 */
export async function sendBlueprintToRoboflow(file: File, confidence: number = 40, scaleToMeters?: number): Promise<Plan> {
  // Get image dimensions for coordinate conversion
  const imageBase64 = await loadImageBase64(file);
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imageBase64;
  });
  
  const imageWidth = img.width || 1000;
  const imageHeight = img.height || 1000;

  // eslint-disable-next-line no-console
  console.log('[Roboflow] Image dimensions:', imageWidth, 'x', imageHeight);

  // Get detections from Roboflow
  const detections = await getRoboflowDetections(file, confidence);
  
  // eslint-disable-next-line no-console
  console.log('[Roboflow] Detections received:', detections);

  const predictions = detections.predictions || detections.detections || [];
  const walls = predictions.filter(d => {
    const className = d.class.toLowerCase();
    return className.includes('wall') && !className.includes('door') && !className.includes('window');
  });
  const doors = predictions.filter(d => {
    const className = d.class.toLowerCase();
    return className.includes('door');
  });
  const windows = predictions.filter(d => {
    const className = d.class.toLowerCase();
    return className.includes('window');
  });

  // eslint-disable-next-line no-console
  console.log(`[Roboflow] Found ${walls.length} walls, ${doors.length} doors, ${windows.length} windows`);

  // Use provided scale or estimate scale based on image size and typical blueprint dimensions
  let finalScaleToMeters: number;
  if (scaleToMeters !== undefined) {
    finalScaleToMeters = scaleToMeters;
    // eslint-disable-next-line no-console
    console.log('[Roboflow] Using provided scale factor:', finalScaleToMeters, 'meters per pixel');
  } else {
    // Typical blueprint might be 10-20 meters, assume image represents ~15 meters
    // This is a heuristic - you may need to adjust based on your blueprint scale
    const estimatedPlanSizeMeters = 15;
    const imageDiagonal = Math.sqrt(imageWidth ** 2 + imageHeight ** 2);
    finalScaleToMeters = (estimatedPlanSizeMeters / imageDiagonal) * 1.414; // Adjust factor based on typical aspect ratio
    // eslint-disable-next-line no-console
    console.log('[Roboflow] Using estimated scale factor:', finalScaleToMeters, 'meters per pixel');
  }
  
  // Convert to Plan format
  return convertRoboflowToPlan(detections, imageWidth, imageHeight, finalScaleToMeters);
}


