import * as THREE from "three";

/**
 * Geometry and poses for the "Interlinked" hero: chain links generated in
 * code (no model files), arranged as a closed ring (the hub) or as a vertical
 * stack of face-on links (a link page).
 */

/** Half the straight part, end-curve radius and tube thickness of one link. */
export const LINK = { half: 0.4, radius: 0.42, tube: 0.13 } as const;

/** Closed "stadium" path (two straight sides + two semicircles) in the XY plane. */
class StadiumCurve extends THREE.Curve<THREE.Vector3> {
  private readonly perimeter = 4 * LINK.half + 2 * Math.PI * LINK.radius;

  constructor() {
    super();
  }

  override getPoint(t: number, target = new THREE.Vector3()) {
    const { half: a, radius: r } = LINK;
    let d = (t % 1) * this.perimeter;
    if (d < 2 * a) return target.set(-a + d, -r, 0); // bottom side, left → right
    d -= 2 * a;
    if (d < Math.PI * r) {
      const angle = -Math.PI / 2 + d / r; // right end
      return target.set(a + r * Math.cos(angle), r * Math.sin(angle), 0);
    }
    d -= Math.PI * r;
    if (d < 2 * a) return target.set(a - d, r, 0); // top side, right → left
    d -= 2 * a;
    const angle = Math.PI / 2 + d / r; // left end
    return target.set(-a + r * Math.cos(angle), r * Math.sin(angle), 0);
  }
}

export function createLinkGeometry(detail: "high" | "low") {
  const geometry = new THREE.TubeGeometry(
    new StadiumCurve(),
    detail === "high" ? 160 : 72,
    LINK.tube,
    detail === "high" ? 28 : 14,
    true,
  );
  geometry.computeVertexNormals();
  return geometry;
}

export type Pose = { position: THREE.Vector3; quaternion: THREE.Quaternion };

const basis = new THREE.Matrix4();

function orient(longAxis: THREE.Vector3, normal: THREE.Vector3) {
  const y = new THREE.Vector3().crossVectors(normal, longAxis).normalize();
  basis.makeBasis(longAxis, y, normal);
  return new THREE.Quaternion().setFromRotationMatrix(basis);
}

/**
 * A closed necklace of `count` links in the XY plane. Neighbouring links are
 * turned 90° to each other so each one passes through the next.
 */
export function ringPoses(count: number, spin: number): Pose[] {
  // Centre-to-centre distance at which two interlocked links just touch.
  const step = 2 * LINK.half + 2 * LINK.radius - 2.4 * LINK.tube;
  const ringRadius = (count * step) / (2 * Math.PI);
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + spin;
    const radial = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
    const tangent = new THREE.Vector3(-Math.sin(angle), Math.cos(angle), 0);
    const normal = i % 2 === 0 ? new THREE.Vector3(0, 0, 1) : radial;
    return { position: radial.clone().multiplyScalar(ringRadius), quaternion: orient(tangent, normal) };
  });
}

/** The same links face-on, one under another: the outline of a link page. */
export function stackPoses(count: number, gap: number): Pose[] {
  const height = 2 * (LINK.radius + LINK.tube);
  const pitch = height + gap;
  const face = new THREE.Quaternion(); // long axis X, facing the camera (+Z)
  return Array.from({ length: count }, (_, i) => ({
    position: new THREE.Vector3(0, ((count - 1) / 2 - i) * pitch, 0),
    quaternion: face.clone(),
  }));
}

function roundedRect(width: number, height: number, radius: number) {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

/** A phone body: a rounded rectangle extruded with a soft bevel, centred on the origin. */
export function createPhoneGeometry(width: number, height: number, depth: number, radius: number) {
  const bevel = Math.min(0.08, depth / 3);
  const geometry = new THREE.ExtrudeGeometry(roundedRect(width - 2 * bevel, height - 2 * bevel, radius), {
    depth: depth - 2 * bevel,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 18,
  });
  geometry.center();
  return geometry;
}

/** The flat screen that sits on the phone's front face. */
export function createScreenGeometry(width: number, height: number, radius: number) {
  return new THREE.ShapeGeometry(roundedRect(width, height, radius), 18);
}
