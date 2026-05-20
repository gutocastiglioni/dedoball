export enum GamePhase {
  MENU = 'MENU',
  PREPARATION = 'PREPARATION',
  ACTION = 'ACTION',
  GOAL_CELEBRATION = 'GOAL_CELEBRATION',
  GAME_OVER = 'GAME_OVER'
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export type Team = 'HOME' | 'AWAY';
export type ActionType = 'PASS' | 'CROSS' | 'SHOOT' | 'TACKLE';

export interface PlayerConfig {
  id: string;
  team: Team;
  slotId: string | null;
  angle: number; // in radians
  actionType: ActionType;
  isCaptain: boolean;
  number: number;
  position: [number, number, number]; // [x, y, z]
  skinColor?: string;
  hairColor?: string;
}

export interface UniformConfig {
  primaryColor: string;
  secondaryColor: string;
  pattern: 'solid' | 'vertical' | 'horizontal' | 'center-band' | 'side-stripes' | 'x' | 'sash' | 'three-stripes-v' | 'three-stripes-h' | 'cross' | 'sash-cross';
  shortsColor: string;
  shortsSecondaryColor?: string;
  shortsPattern?: 'solid' | 'side-stripes' | 'three-stripes' | 'two-tone';
  socksColor: string;
  socksSecondaryColor?: string;
  socksPattern?: 'solid' | 'hoops' | 'three-stripes' | 'two-tone';
}

export interface UserProfile {
  uid: string;
  username: string;
  teamName: string;
  logoUrl?: string;
  uniform?: UniformConfig;
}

export interface Slot {
  id: string;
  position: [number, number, number]; // [x, y, z]
  team: Team;
  lineType: 'GK' | 'DEF' | 'MID' | 'ATT';
}

export interface BallState {
  position: [number, number, number];
  velocity: [number, number, number];
  possession: Team;
  lastTouchedByPlayerId: string | null;
}

export enum MovementState {
  STANDING = 'Standing',
  WALKING = 'Walking',
  RUNNING = 'Running',
  THROTTLING = 'Throttling',
  SLIDING = 'Sliding',
  JUMPING_HEADING = 'Jumping & Heading',
  PASS_LEFT = 'Pass (Left)',
  PASS_RIGHT = 'Pass (Right)',
  CROSS_LEFT = 'Cross (Left)',
  CROSS_RIGHT = 'Cross (Right)',
  SHOOT_LEFT = 'Shoot (Left)',
  SHOOT_RIGHT = 'Shoot (Right)',
  AIM_PISTOL = 'Aim Pistol',
  AIM_RIFLE = 'Aim Rifle',
  RUNNING_GUN = 'Running Gun',
  CROUCHING = 'Crouching'
}
