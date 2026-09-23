// Společné konstanty hry
export const LANES = [-2, 0, 2];          // x pozice drah (vlevo, střed, vpravo)
export const SPAWN_Z = -135;              // kde se rodí překážky (daleko před hráčem)
export const DESPAWN_Z = 12;              // za kamerou se objekty vrací do poolu

export const START_SPEED = 14;            // jednotky/s
export const MAX_SPEED = 36;
export const SPEED_RAMP = 1800;           // čím větší, tím pomaleji se zrychluje

export const BOX_POINTS = 10;             // bonus za jednu krabici

// Hitbox hráče (poloviční šířka/hloubka)
export const PLAYER_HW = 0.3;
export const PLAYER_HD = 0.3;
export const PLAYER_H = 1.9;
export const PLAYER_SLIDE_H = 0.85;

export function speedForDistance(d) {
  return START_SPEED + (MAX_SPEED - START_SPEED) * (1 - Math.exp(-d / SPEED_RAMP));
}
