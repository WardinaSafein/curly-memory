import type { SceneDef } from '../../systems/scene/SceneDefinition';
import { bedroom } from './bedroom';
import { cybertown } from './cybertown';

/** Registry of explorable locations, by id. */
export const SCENES: Record<string, SceneDef> = {
  [bedroom.id]: bedroom,
  [cybertown.id]: cybertown,
};
