import { services } from '../../core/Services';
import { DialogueRunner } from '../../systems/dialogue/DialogueRunner';
import storyJson from './prototype.ink';

/** A dialogue runner for the prototype story, wired to the shared game state. */
export function createStoryRunner(): DialogueRunner {
  return new DialogueRunner(storyJson, {
    getFlag: (name) => services.state.getFlag(name),
    setFlag: (name, value) => services.state.setFlag(name, value),
    playerName: () => services.state.snapshot.playerName,
  });
}
