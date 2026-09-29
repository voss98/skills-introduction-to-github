import { gameState } from '../core/gameState';
import { DecisionEngine } from '../core/decisions';
import { ShopController } from '../core/shop';

const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
const seedParam = Number(params.get('seed'));

/** The running game's shop controller, shared by scenes and kept across scene restarts. */
export const session = {
  shop: new ShopController(gameState, Number.isFinite(seedParam) && seedParam > 0 ? seedParam : Math.floor(Math.random() * 1e6)),
  decisions: new DecisionEngine(gameState),
  started: false,
  /** Dev/testing: ?job=trail_build puts that customer first in line on day 1. */
  debugJob: params.get('job'),
};
