import { BallState, PlayerConfig, Slot, Team } from './types';
import { FIELD_WIDTH, FIELD_LENGTH, HALF_WIDTH, HALF_LENGTH } from './useGameState';

const GRAVITY = 15.0; // m/s^2
const GROUND_Y = 0.11;
const BALL_RADIUS = 0.11;
const PLAYER_RADIUS = 0.3; // combined collision boundary
const COLLISION_DIST = BALL_RADIUS + PLAYER_RADIUS;

export interface PhysicsResult {
  nextBall: BallState;
  collisionPlayerId: string | null;
  collisionType: 'TEAMMATE' | 'OPPONENT' | null;
  isGoal: boolean;
  scoringTeam: Team | null;
  isTackle: boolean;
  tackleTeam: Team | null;
  collisionWall: boolean;
  collisionGoalpost: boolean;
  collisionGround: boolean;
}

export const updateBallPhysics = (
  currentBall: BallState,
  homePlayers: PlayerConfig[],
  awayPlayers: PlayerConfig[],
  turn: Team,
  dt: number,
  cooldownPlayerId: string | null,
  collisionHistory?: string[]
): PhysicsResult => {
  let [x, y, z] = currentBall.position;
  let [vx, vy, vz] = currentBall.velocity;
  let collisionPlayerId: string | null = null;
  let collisionType: 'TEAMMATE' | 'OPPONENT' | null = null;
  let isGoal = false;
  let scoringTeam: Team | null = null;
  let isTackle = false;
  let tackleTeam: Team | null = null;
  let collisionWall = false;
  let collisionGoalpost = false;
  let collisionGround = false;

  // 1. Apply Gravity if in the air
  if (y > GROUND_Y) {
    vy -= GRAVITY * dt;
    x += vx * dt;
    y += vy * dt;
    z += vz * dt;

    // Land on ground
    if (y <= GROUND_Y) {
      y = GROUND_Y;
      if (Math.abs(vy) > 0.4) {
        collisionGround = true;
      }
      vy = -vy * 0.35; // bounce on grass
      if (Math.abs(vy) < 0.8) {
        vy = 0;
      }
    }
  } else {
    // Ground movement
    x += vx * dt;
    z += vz * dt;
    
    // Ground friction
    const friction = 0.98;
    vx *= Math.pow(friction, dt * 60);
    vz *= Math.pow(friction, dt * 60);

    if (Math.hypot(vx, vz) < 0.15) {
      vx = 0;
      vz = 0;
    }
  }

  // 2. Goal Detection (Only a goal if ball is below the crossbar)
  if (Math.abs(x) < 1.1 && y <= 0.7) {
    if (z < -8.1) {
      isGoal = true;
      scoringTeam = 'AWAY';
    } else if (z > 8.1) {
      isGoal = true;
      scoringTeam = 'HOME';
    }
  }

  // Read and prepare speed multiplier for wall bounces
  const currentSpeedMult = currentBall.speedMultiplier ?? 1.0;
  let nextSpeedMult = currentSpeedMult;

  // 2.5 Goalpost & Crossbar 3D Collision Physics
  const POST_RADIUS = 0.04;
  const POST_COLLISION_DIST = BALL_RADIUS + POST_RADIUS; // 0.11 + 0.04 = 0.15

  const posts = [
    { px: -1.1, pz: -8.0 },
    { px: 1.1, pz: -8.0 },
    { px: -1.1, pz: 8.0 },
    { px: 1.1, pz: 8.0 }
  ];

  const postRestitution = 0.65;

  // Check vertical posts (only when ball is low enough, y <= 0.7 + POST_COLLISION_DIST)
  if (y <= 0.7 + POST_COLLISION_DIST) {
    for (const post of posts) {
      const dx = x - post.px;
      const dz = z - post.pz;
      const distXZ = Math.hypot(dx, dz);

      if (distXZ < POST_COLLISION_DIST && y <= 0.7 + POST_RADIUS) {
        // Horizontal rebound
        const nx = distXZ > 0.001 ? dx / distXZ : 1;
        const nz = distXZ > 0.001 ? dz / distXZ : 0;
        
        // Push ball out of the post
        x = post.px + nx * (POST_COLLISION_DIST + 0.005);
        z = post.pz + nz * (POST_COLLISION_DIST + 0.005);

        // Reflect velocity
        const dot = vx * nx + vz * nz;
        if (dot < 0) {
          const prevMult = nextSpeedMult;
          nextSpeedMult = Math.min(nextSpeedMult * 1.03, 4.0);
          const ratio = nextSpeedMult / prevMult;
          vx = (vx - 2 * dot * nx) * postRestitution * ratio;
          vz = (vz - 2 * dot * nz) * postRestitution * ratio;
          collisionGoalpost = true;
          break; // Only collide with one post per frame
        }
      }
    }
  }

  // Check horizontal crossbars (at y = 0.7, z = -8.0 and z = 8.0, from x = -1.1 to 1.1)
  if (!collisionGoalpost && Math.abs(x) <= 1.1 + POST_COLLISION_DIST) {
    const crossbarsZ = [-8.0, 8.0];
    for (const cz of crossbarsZ) {
      const dy = y - 0.7;
      const dz = z - cz;
      const distYZ = Math.hypot(dy, dz);

      if (distYZ < POST_COLLISION_DIST) {
        // Vertical/Horizontal rebound in Y-Z plane
        const ny = distYZ > 0.001 ? dy / distYZ : 1;
        const nz = distYZ > 0.001 ? dz / distYZ : 0;

        // Push ball out
        y = 0.7 + ny * (POST_COLLISION_DIST + 0.005);
        z = cz + nz * (POST_COLLISION_DIST + 0.005);

        // Reflect velocity
        const dot = vy * ny + vz * nz;
        if (dot < 0) {
          const prevMult = nextSpeedMult;
          nextSpeedMult = Math.min(nextSpeedMult * 1.03, 4.0);
          const ratio = nextSpeedMult / prevMult;
          vy = (vy - 2 * dot * ny) * postRestitution * ratio;
          vz = (vz - 2 * dot * nz) * postRestitution * ratio;
          collisionGoalpost = true;
          break;
        }
      }
    }
  }

  // 3. Wall Boundaries Rebound (Table borders & Invisible Wall above Goal)

  const wallLimitX = 4.8;
  if (x < -wallLimitX) {
    x = -wallLimitX;
    nextSpeedMult = Math.min(currentSpeedMult * 1.03, 4.0);
    vx = -vx * 0.7 * (nextSpeedMult / currentSpeedMult);
    collisionWall = true;
  } else if (x > wallLimitX) {
    x = wallLimitX;
    nextSpeedMult = Math.min(currentSpeedMult * 1.03, 4.0);
    vx = -vx * 0.7 * (nextSpeedMult / currentSpeedMult);
    collisionWall = true;
  }

  const wallLimitZ = 7.8;
  // Rebound if outside goal width, OR if inside goal width but above the crossbar
  if (Math.abs(x) >= 1.1 || y > 0.7) {
    if (z < -wallLimitZ) {
      z = -wallLimitZ;
      const prevMult = nextSpeedMult;
      nextSpeedMult = Math.min(nextSpeedMult * 1.03, 4.0);
      vz = -vz * 0.7 * (nextSpeedMult / prevMult);
      collisionWall = true;
    } else if (z > wallLimitZ) {
      z = wallLimitZ;
      const prevMult = nextSpeedMult;
      nextSpeedMult = Math.min(nextSpeedMult * 1.03, 4.0);
      vz = -vz * 0.7 * (nextSpeedMult / prevMult);
      collisionWall = true;
    }
  }

  // 4. Peg/Player Collisions (Only detect when ball is low enough, y <= 0.6)
  if (y < 0.6) {
    const allPlayers = [...homePlayers, ...awayPlayers].filter(p => p.slotId !== null);
    
    for (const p of allPlayers) {
      if (p.id === cooldownPlayerId) continue;

      const px = p.position[0];
      const pz = p.position[2];
      
      const dx = x - px;
      const dz = z - pz;
      const dist = Math.hypot(dx, dz);

      if (dist < COLLISION_DIST) {
        collisionPlayerId = p.id;

        // NEW BLOCKING (Bloqueio) MECHANIC:
        // If the player has isBlocking enabled and it's the opponent's turn,
        // the ball instantly dies on contact, possession changes to their team, and turn ends!
        if (p.isBlocking && p.team !== turn) {
          isTackle = true;
          tackleTeam = p.team;
          
          vx = 0;
          vy = 0;
          vz = 0;
          
          // Push slightly out of the player to avoid sticky bugs
          const nx = dist > 0.01 ? dx / dist : 1;
          const nz = dist > 0.01 ? dz / dist : 0;
          x = px + nx * (COLLISION_DIST + 0.01);
          z = pz + nz * (COLLISION_DIST + 0.01);
          
          break;
        }

        collisionType = p.team === turn ? 'TEAMMATE' : 'OPPONENT';

        // ── GOALKEEPER SPECIAL REFLECTION ──────────────────────────────────────
        // Goalkeepers (number 1) always deflect the ball toward the opposite half
        // using 5 possible forward angles chosen at random, never backwards.
        // This prevents infinite loop traps between the GK and nearby defenders.
        const isGK = p.id.endsWith('-p1');
        if (isGK) {
          // Home GK is at z ≈ -7.2 → must send ball toward +Z (AWAY half)
          // Away GK is at z ≈  7.2 → must send ball toward -Z (HOME half)
          const forwardZ = p.team === 'HOME' ? 1 : -1;

          // 5 spread angles: 0°, ±20°, ±40° relative to the straight-ahead axis
          const spreadOptions = [0, 20, -20, 40, -40].map(deg => deg * Math.PI / 180);
          const chosenSpread = spreadOptions[Math.floor(Math.random() * spreadOptions.length)];

          // Base forward angle (0 = straight ahead toward opposite goal)
          const baseAngle = forwardZ === 1 ? 0 : Math.PI;
          const angle = baseAngle + chosenSpread;

          // Accumulate +3% per GK touch (capped at 4x) — same rule as field players
          nextSpeedMult = Math.min(nextSpeedMult * 1.03, 4.0);

          // Randomly pick deflection style: PASS (fast ground), CROSS (lob), SHOOT (power)
          const styleRoll = Math.random();
          if (styleRoll < 0.4) {
            // PASS: fast, low
            vx = Math.sin(angle) * 21.25 * nextSpeedMult;
            vz = Math.cos(angle) * 21.25 * nextSpeedMult;
            vy = 0.0;
            y = GROUND_Y;
          } else if (styleRoll < 0.7) {
            // CROSS: lobbed
            vx = Math.sin(angle) * 9.0 * nextSpeedMult;
            vz = Math.cos(angle) * 9.0 * nextSpeedMult;
            vy = 5.0;
            y = 0.2;
          } else {
            // SHOOT: powerful ground shot
            vx = Math.sin(angle) * 28.0 * nextSpeedMult;
            vz = Math.cos(angle) * 28.0 * nextSpeedMult;
            vy = 1.5;
            y = 0.2;
          }

          x = px + Math.sin(angle) * 0.38;
          z = pz + Math.cos(angle) * 0.38;

          console.log(`%c[GK Deflection] ${p.id} (${p.team}) spread ${(chosenSpread * 180 / Math.PI).toFixed(0)}° | SpeedMult: ${nextSpeedMult.toFixed(2)}x | vx=${vx.toFixed(2)} vz=${vz.toFixed(2)}`, 'color: #00d2ff; font-weight: bold;');
          break;
        }
        // ── END GOALKEEPER REFLECTION ────────────────────────────────────────────

        // Standard deflect/bounce logic - UNIVERSAL: Any player redirects the ball in their pointing direction!
        
        // 1. Calculate consecutive alternating hits count C
        let C = 0;
        if (collisionHistory && collisionHistory.length > 0) {
          const lastEntity = collisionHistory[collisionHistory.length - 1];
          if (lastEntity !== p.id) {
            C = 1; // Current hit is 1
            for (let idx = collisionHistory.length - 1; idx >= 0; idx--) {
              const stepsBack = collisionHistory.length - idx;
              const expected = (stepsBack % 2 === 1) ? lastEntity : p.id;
              if (collisionHistory[idx] === expected) {
                C++;
              } else {
                break;
              }
            }
          }
        }

        // 2. Trajectory never the same twice: add small random noise
        const angleNoise = (Math.random() - 0.5) * 0.06; // up to ±1.7 degrees (±0.03 rad)
        let angle = p.angle + angleNoise;

        // 3. Accumulate +3% speed per touch (capped at 4x) — dynamic bouncing feel
        nextSpeedMult = Math.min(nextSpeedMult * 1.03, 4.0);

        // 4. If in a loop (C >= 3), apply progressive 15 deg rotation and extra speed multiplier
        let loopSpeedBonus = 1.0;
        if (C >= 3) {
          const repeats = C - 2;
          const angleShift = repeats * (15 * Math.PI / 180);
          angle += angleShift;
          loopSpeedBonus = 1.0 + repeats * 0.20;
          console.log(`%c[Physics Evasion] Loop bounce detected! Alternation size: ${C}, Repeats: ${repeats}, Angle Shifted by: ${(repeats * 15).toFixed(0)}°, Loop Speed Bonus: ${loopSpeedBonus.toFixed(2)}x, Total Multiplier: ${(nextSpeedMult * loopSpeedBonus).toFixed(2)}x`, "color: #2ecc71; font-weight: bold;");
        }

        const totalMult = nextSpeedMult * loopSpeedBonus;
        console.log(`%c[Physics Bounce] Touch #${collisionHistory ? collisionHistory.length + 1 : 1} | SpeedMultiplier: ${nextSpeedMult.toFixed(2)}x`, 'color: #f39c12; font-weight: bold;');

        if (p.actionType === 'SHOOT') {
          vx = Math.sin(angle) * 30.0 * totalMult;
          vz = Math.cos(angle) * 30.0 * totalMult;
          vy = 2.5;
        } else if (p.actionType === 'PASS') {
          // Ground/low pass
          vx = Math.sin(angle) * 21.25 * totalMult;
          vz = Math.cos(angle) * 21.25 * totalMult;
          vy = 0.0;
        } else {
          // Lobbed Cross: elevated pass that ignores 1 house/row and lands in the second one
          vx = Math.sin(angle) * 9.0 * totalMult;
          vz = Math.cos(angle) * 9.0 * totalMult;
          vy = 5.0;
        }

        x = px + Math.sin(angle) * 0.38;
        z = pz + Math.cos(angle) * 0.38;
        y = p.actionType === 'PASS' ? GROUND_Y : 0.2;

        break;
      }
    }
  }

  return {
    nextBall: {
      position: [x, y, z],
      velocity: [vx, vy, vz],
      possession: currentBall.possession,
      lastTouchedByPlayerId: collisionPlayerId || currentBall.lastTouchedByPlayerId,
      isKickoff: currentBall.isKickoff,
      speedMultiplier: nextSpeedMult
    },
    collisionPlayerId,
    collisionType,
    isGoal,
    scoringTeam,
    isTackle,
    tackleTeam,
    collisionWall,
    collisionGoalpost,
    collisionGround
  };
};
