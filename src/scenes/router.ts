import type Phaser from 'phaser';
import { SceneKeys } from '../config/game';
import { services } from '../core/Services';
import type { Action } from '../systems/scene/SceneDefinition';

/** Central place for scene transitions, so scenes never hard-code each other. */
export function gotoLocation(from: Phaser.Scene, sceneId: string, entry = 'default'): void {
  services.state.update({ sceneId });
  from.scene.start(SceneKeys.Explore, { sceneId, entry });
}

export function playCinematic(from: Phaser.Scene, id: string): void {
  from.scene.start(SceneKeys.Cinematic, { id });
}

export function playMission(from: Phaser.Scene, missionId: string): void {
  from.scene.start(SceneKeys.Defense, { missionId });
}

export function gotoTitle(from: Phaser.Scene): void {
  from.scene.start(SceneKeys.Title);
}

export function runTransition(from: Phaser.Scene, action: Action): boolean {
  if (action.type === 'goto') {
    gotoLocation(from, action.scene, action.entry);
    return true;
  }
  if (action.type === 'mission') {
    playMission(from, action.id);
    return true;
  }
  if (action.type === 'cinematic') {
    playCinematic(from, action.id);
    return true;
  }
  return false;
}

/** `?scene=` deep links for development and review: title, riglab, bedroom, cybertown, portal. */
export function startFromUrl(from: Phaser.Scene): void {
  const target = services.params.get('scene');
  switch (target) {
    case null:
    case 'title':
      return gotoTitle(from);
    case 'riglab':
      from.scene.start(SceneKeys.RigLab);
      return;
    case 'portal':
      return playCinematic(from, 'portal');
    case 'defense':
      return playMission(from, services.params.get('mission') ?? 'ch1_phishing');
    default:
      return gotoLocation(from, target, services.params.get('entry') ?? 'default');
  }
}
