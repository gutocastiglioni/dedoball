import { Slot, Team, BallState } from './types';

// Constants for field bounds
export const FIELD_WIDTH = 10;
export const FIELD_LENGTH = 16;
export const HALF_WIDTH = FIELD_WIDTH / 2;
export const HALF_LENGTH = FIELD_LENGTH / 2;

// Dynamic Pegboard Slots Generation
export const ALL_SLOTS: Slot[] = [];

// 1. HOME SLOTS (27 slots total: 1 Goalkeeper + 2 rows of 5 slots + 2 rows of 6 slots + 1 row of 4 slots)
ALL_SLOTS.push({ id: 'home-gk', position: [0, 0.2, -7.2], team: 'HOME', lineType: 'GK' });
const homeRows = [
  { z: -5.5, lineType: 'DEF' as const, isAlternating: false }, // Defenders line (row 0)
  { z: -2.36, lineType: 'MID' as const, isAlternating: false }, // Midfielders 1 (row 1)
  { z: 0.79, lineType: 'MID' as const, isAlternating: false }, // Midfielders 2 (row 2)
  { z: 3.93, lineType: 'ATT' as const, isAlternating: false }, // Attackers (row 3)
  { z: -6.7, lineType: 'DEF' as const, isAlternating: true } // Alternating line in front of GK (row 4)
];
homeRows.forEach((row, rowIndex) => {
  const xCoords = row.lineType === 'MID' 
    ? [-4, -2.4, -0.8, 0.8, 2.4, 4] 
    : [-4, -2, 0, 2, 4];
  xCoords.forEach((x, colIndex) => {
    let slotTeam: Team = 'HOME';
    if (row.isAlternating) {
      if (x === 0) return; // Vazio / Penalty spot
      if (x === -4 || x === 4) {
        slotTeam = 'AWAY';
      } else {
        slotTeam = 'HOME';
      }
    }

    ALL_SLOTS.push({
      id: `home-slot-${rowIndex}-${colIndex}`,
      position: [x, 0.2, row.z],
      team: slotTeam,
      lineType: row.lineType
    });
  });
});

// 2. AWAY SLOTS (27 slots total: 1 Goalkeeper + 2 rows of 5 slots + 2 rows of 6 slots + 1 row of 4 slots)
ALL_SLOTS.push({ id: 'away-gk', position: [0, 0.2, 7.2], team: 'AWAY', lineType: 'GK' });
const awayRows = [
  { z: 5.5, lineType: 'DEF' as const, isAlternating: false }, // Defenders line (row 0)
  { z: 2.36, lineType: 'MID' as const, isAlternating: false }, // Midfielders 1 (row 1)
  { z: -0.79, lineType: 'MID' as const, isAlternating: false }, // Midfielders 2 (row 2)
  { z: -3.93, lineType: 'ATT' as const, isAlternating: false }, // Attackers (row 3)
  { z: 6.7, lineType: 'DEF' as const, isAlternating: true } // Alternating line in front of GK (row 4)
];
awayRows.forEach((row, rowIndex) => {
  const xCoords = row.lineType === 'MID' 
    ? [-4, -2.4, -0.8, 0.8, 2.4, 4] 
    : [-4, -2, 0, 2, 4];
  xCoords.forEach((x, colIndex) => {
    let slotTeam: Team = 'AWAY';
    if (row.isAlternating) {
      if (x === 0) return; // Vazio / Penalty spot
      if (x === -4 || x === 4) {
        slotTeam = 'HOME';
      } else {
        slotTeam = 'AWAY';
      }
    }

    ALL_SLOTS.push({
      id: `away-slot-${rowIndex}-${colIndex}`,
      position: [x, 0.2, row.z],
      team: slotTeam,
      lineType: row.lineType
    });
  });
});

export const ETHNICITIES = [
  { skin: '#4a3728', hair: '#0d0d0d' }, // Goleiro (index 0)
  { skin: '#f3d2c1', hair: '#4a2c11' }, // index 1
  { skin: '#c68642', hair: '#0d0d0d' }, // index 2
  { skin: '#f9d5b8', hair: '#e2b13c' }, // index 3
  { skin: '#2d1f18', hair: '#0d0d0d' }, // index 4
  { skin: '#d1a384', hair: '#301a08' }, // index 5
  { skin: '#f3d2c1', hair: '#d35400' }, // index 6
  { skin: '#9c724e', hair: '#0d0d0d' }, // index 7
  { skin: '#ffdbac', hair: '#f3e5ab' }, // index 8
  { skin: '#5c4033', hair: '#0d0d0d' }, // index 9
  { skin: '#f0d5be', hair: '#95a5a6' }  // index 10
];

export const INITIAL_BALL: BallState = {
  position: [0, 0.11, 0] as [number, number, number],
  velocity: [0, 0, 0] as [number, number, number],
  possession: 'HOME' as Team,
  lastTouchedByPlayerId: null as string | null,
  isKickoff: true,
  speedMultiplier: 1
};
