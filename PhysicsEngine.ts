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
  isGkDefense?: boolean;
  isGkEstouro?: boolean;
}

export const updateBallPhysics = (
  currentBall: BallState,
  homePlayers: PlayerConfig[],
  awayPlayers: PlayerConfig[],
  turn: Team,
  dt: number,
  cooldownPlayerId: string | null,
  collisionHistory?: string[],
  isManualMode?: boolean
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
  let isGkDefense = false;
  let isGkEstouro = false;

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
  const currentSpeedMult = isManualMode ? 1.0 : (currentBall.speedMultiplier ?? 1.0);
  let nextSpeedMult = isManualMode ? 1.0 : currentSpeedMult;

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

      const isGK = p.number === 1;
      const currentRadius = (isGK && isManualMode) ? PLAYER_RADIUS * 1.3 : PLAYER_RADIUS;
      const currentCollisionDist = BALL_RADIUS + currentRadius;

      if (dist < currentCollisionDist) {
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
          x = px + nx * (currentCollisionDist + 0.01);
          z = pz + nz * (currentCollisionDist + 0.01);
          
          break;
        }

        collisionType = p.team === turn ? 'TEAMMATE' : 'OPPONENT';

        // ── GOALKEEPER SPECIAL REFLECTION ──────────────────────────────────────
        // Goalkeepers (number 1) always deflect the ball toward the opposite half
        // using 5 possible forward angles chosen at random, never backwards.
        // This prevents infinite loop traps between the GK and nearby defenders.
        const isGK = p.id.endsWith('-p1');
        if (isGK) {
          const isOpponentPlay = p.team !== turn;
          const roll = Math.random();

          let triggerDefense = false;
          let triggerEstouro = false;

          if (isOpponentPlay) {
            if (roll < 0.25) {
              triggerDefense = true;
            } else if (roll < 0.50) {
              triggerEstouro = true;
            }
          } else {
            // Own play: 40% chance of Estouro, 0% of Defense
            if (roll < 0.40) {
              triggerEstouro = true;
            }
          }

          const forwardZ = p.team === 'HOME' ? 1 : -1;
          const spreadOptions = [0, 20, -20, 40, -40].map(deg => deg * Math.PI / 180);
          const chosenSpread = spreadOptions[Math.floor(Math.random() * spreadOptions.length)];
          const baseAngle = forwardZ === 1 ? 0 : Math.PI;
          const angle = baseAngle + chosenSpread;

          if (triggerDefense) {
            // Defense functions identical to linear player block (blocking)
            isTackle = true;
            tackleTeam = p.team;
            isGkDefense = true;

            vx = 0;
            vy = 0;
            vz = 0;

            // Push slightly out of the goalkeeper at the collision contact point (where he saves)
            const nx = dist > 0.01 ? dx / dist : 1;
            const nz = dist > 0.01 ? dz / dist : 0;
            x = px + nx * (currentCollisionDist + 0.01);
            z = pz + nz * (currentCollisionDist + 0.01);
            y = GROUND_Y;

            collisionPlayerId = p.id;
            collisionType = p.team === turn ? 'TEAMMATE' : 'OPPONENT';
            break;
          } else if (triggerEstouro) {
            isGkEstouro = true;
            nextSpeedMult = Math.min(nextSpeedMult * 1.03, 4.0);

            // High ball (Majestic lob) landing near opponent attacking area (between midfield Z=0 and box Z=4.8)
            // Magnitude of landing Z is between 2.0 and 4.2
            const minZ = 2.0;
            const maxZ = 4.2;
            const targetZMag = minZ + Math.random() * (maxZ - minZ);
            const z_target = forwardZ * targetZMag;

            // Calculate distance D needed along chosen angle to hit z_target
            const D = Math.abs(z_target - pz) / Math.cos(chosenSpread);

            // Vertical launch velocity for a beautiful high curve
            const vy_launch = 6.5;

            // Flight time calculated from 7.5 * t^2 - vy_launch * t - 0.09 = 0
            const t_flight = (vy_launch + Math.sqrt(vy_launch * vy_launch + 2.7)) / 15;

            // Required horizontal speed to reach distance D
            const V_h = D / t_flight;

            vx = Math.sin(angle) * V_h;
            vz = Math.cos(angle) * V_h;
            vy = vy_launch;
            y = 0.2;

            x = px + Math.sin(angle) * (currentCollisionDist + 0.08);
            z = pz + Math.cos(angle) * (currentCollisionDist + 0.08);

            console.log(`%c[GK Estouro] ${p.id} (${p.team}) targetZ=${z_target.toFixed(2)} D=${D.toFixed(2)}m | vx=${vx.toFixed(2)} vz=${vz.toFixed(2)}`, 'color: #f39c12; font-weight: bold;');
            collisionPlayerId = p.id;
            collisionType = p.team === turn ? 'TEAMMATE' : 'OPPONENT';
            break;
          } else {
            // Standard deflection style: PASS (fast ground), CROSS (lob), SHOOT (power)
            // Accumulate +3% per GK touch (capped at 4x) — same rule as field players
            nextSpeedMult = Math.min(nextSpeedMult * 1.03, 4.0);

            const styleRoll = Math.random();
            let finalSpeed: number;
            let finalVy: number;

            if (isManualMode) {
              const incomingSpeed = Math.hypot(vx, vz);
              finalSpeed = Math.max(1.5, incomingSpeed * 0.8); // GK save deflection has a bit more restitution/push
              finalVy = styleRoll < 0.4 ? 0.0 : styleRoll < 0.7 ? 2.5 : 0.75;
            } else {
              if (styleRoll < 0.4) {
                // PASS: fast, low
                finalSpeed = 21.25 * nextSpeedMult;
                finalVy = 0.0;
              } else if (styleRoll < 0.7) {
                // CROSS: lobbed
                finalSpeed = 9.0 * nextSpeedMult;
                finalVy = 5.0;
              } else {
                // SHOOT: powerful ground shot
                finalSpeed = 28.0 * nextSpeedMult;
                finalVy = 1.5;
              }
            }

            vx = Math.sin(angle) * finalSpeed;
            vz = Math.cos(angle) * finalSpeed;
            vy = finalVy;
            y = finalVy === 0.0 ? GROUND_Y : 0.2;

            x = px + Math.sin(angle) * (currentCollisionDist + 0.08);
            z = pz + Math.cos(angle) * (currentCollisionDist + 0.08);

            console.log(`%c[GK Deflection] ${p.id} (${p.team}) spread ${(chosenSpread * 180 / Math.PI).toFixed(0)}° | SpeedMult: ${nextSpeedMult.toFixed(2)}x | vx=${vx.toFixed(2)} vz=${vz.toFixed(2)}`, 'color: #00d2ff; font-weight: bold;');
            collisionPlayerId = p.id;
            collisionType = p.team === turn ? 'TEAMMATE' : 'OPPONENT';
            break;
          }
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
        if (!isManualMode && C >= 3) {
          const repeats = C - 2;
          const angleShift = repeats * (15 * Math.PI / 180);
          angle += angleShift;
          loopSpeedBonus = 1.0 + repeats * 0.20;
          console.log(`%c[Physics Evasion] Loop bounce detected! Alternation size: ${C}, Repeats: ${repeats}, Angle Shifted by: ${(repeats * 15).toFixed(0)}°, Loop Speed Bonus: ${loopSpeedBonus.toFixed(2)}x, Total Multiplier: ${(nextSpeedMult * loopSpeedBonus).toFixed(2)}x`, "color: #2ecc71; font-weight: bold;");
        }

        if (isManualMode) {
          nextSpeedMult = 1.0;
          loopSpeedBonus = 1.0;
        }

        const totalMult = nextSpeedMult * loopSpeedBonus;
        console.log(`%c[Physics Bounce] Touch #${collisionHistory ? collisionHistory.length + 1 : 1} | SpeedMultiplier: ${nextSpeedMult.toFixed(2)}x`, 'color: #f39c12; font-weight: bold;');

        let finalSpeed: number;
        let finalVy: number;

        if (isManualMode) {
          // Keep incoming speed but attenuate it to lose inertia/momentum (e.g., 0.75x)
          const incomingSpeed = Math.hypot(vx, vz);
          finalSpeed = Math.max(1.2, incomingSpeed * 0.75); // Lose 25% speed, keep a minimum of 1.2 so it doesn't freeze on tiny hits
          
          if (p.actionType === 'PASS') {
            finalVy = 0.0;
          } else {
            // Slight manual vertical lift (half of standard)
            finalVy = p.actionType === 'SHOOT' ? 1.25 : 2.5;
          }
        } else {
          // Standard/automatic mode: boost to action-specific speed
          if (p.actionType === 'SHOOT') {
            finalSpeed = 30.0 * totalMult;
            finalVy = 2.5;
          } else if (p.actionType === 'PASS') {
            finalSpeed = 21.25 * totalMult;
            finalVy = 0.0;
          } else {
            finalSpeed = 9.0 * totalMult;
            finalVy = 5.0;
          }
        }

        vx = Math.sin(angle) * finalSpeed;
        vz = Math.cos(angle) * finalSpeed;
        vy = finalVy;

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
    collisionGround,
    isGkDefense,
    isGkEstouro
  };
};
