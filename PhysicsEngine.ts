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
}

export const updateBallPhysics = (
  currentBall: BallState,
  homePlayers: PlayerConfig[],
  awayPlayers: PlayerConfig[],
  turn: Team,
  dt: number,
  cooldownPlayerId: string | null
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

  // 1. Apply Gravity if in the air
  if (y > GROUND_Y) {
    vy -= GRAVITY * dt;
    x += vx * dt;
    y += vy * dt;
    z += vz * dt;

    // Land on ground
    if (y <= GROUND_Y) {
      y = GROUND_Y;
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

  // 2. Goal Detection
  if (Math.abs(x) < 1.1) {
    if (z < -8.1) {
      isGoal = true;
      scoringTeam = 'AWAY';
    } else if (z > 8.1) {
      isGoal = true;
      scoringTeam = 'HOME';
    }
  }

  // 3. Wall Boundaries Rebound (Table borders)
  const wallLimitX = 4.8;
  if (x < -wallLimitX) {
    x = -wallLimitX;
    vx = -vx * 0.7;
    collisionWall = true;
  } else if (x > wallLimitX) {
    x = wallLimitX;
    vx = -vx * 0.7;
    collisionWall = true;
  }

  const wallLimitZ = 7.8;
  if (Math.abs(x) >= 1.1) {
    if (z < -wallLimitZ) {
      z = -wallLimitZ;
      vz = -vz * 0.7;
      collisionWall = true;
    } else if (z > wallLimitZ) {
      z = wallLimitZ;
      vz = -vz * 0.7;
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

        // NEW TACKLE (Desarme) MECHANIC:
        // If the player is configured as TACKLE, the ball instantly dies on contact,
        // and possession changes immediately to their team!
        if (p.actionType === 'TACKLE') {
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

        // Standard deflect/bounce logic
        if (p.team === turn) {
          collisionType = 'TEAMMATE';
          const angle = p.angle;
          
          if (p.actionType === 'SHOOT') {
            vx = Math.sin(angle) * 12.0;
            vz = Math.cos(angle) * 12.0;
            vy = 1.0;
          } else if (p.actionType === 'PASS') {
            // Ground/low pass
            vx = Math.sin(angle) * 8.5;
            vz = Math.cos(angle) * 8.5;
            vy = 0.0;
          } else {
            // Lobbed Cross
            vx = Math.sin(angle) * 6.5;
            vz = Math.cos(angle) * 6.5;
            vy = 5.5;
          }

          x = px + Math.sin(angle) * 0.38;
          z = pz + Math.cos(angle) * 0.38;
          y = p.actionType === 'PASS' ? GROUND_Y : 0.2;

          break;
        } else {
          collisionType = 'OPPONENT';
          
          // Rebate no adversário e continua com força total (Elastic = 1.0!)
          const nx = dx / dist;
          const nz = dz / dist;

          const dot = vx * nx + vz * nz;
          
          if (dot < 0) {
            vx = (vx - 2 * dot * nx) * 1.0; // Keep full force on opponent rebounds!
            vz = (vz - 2 * dot * nz) * 1.0;
          }

          x = px + nx * (COLLISION_DIST + 0.02);
          z = pz + nz * (COLLISION_DIST + 0.02);
          
          break;
        }
      }
    }
  }

  return {
    nextBall: {
      position: [x, y, z],
      velocity: [vx, vy, vz],
      possession: currentBall.possession,
      lastTouchedByPlayerId: collisionPlayerId || currentBall.lastTouchedByPlayerId
    },
    collisionPlayerId,
    collisionType,
    isGoal,
    scoringTeam,
    isTackle,
    tackleTeam,
    collisionWall
  };
};
