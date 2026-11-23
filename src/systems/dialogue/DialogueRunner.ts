import { Story } from 'inkjs';

/**
 * Thin, testable wrapper around an Ink story.
 *
 * Writing conventions (see docs/ARCHITECTURE.md#dialogue):
 *   Gus: Welcome to CyberTown.      -> speaker "Gus"
 *   PLAYER: Where am I?             -> speaker = the player's chosen name
 *   Plain lines have no speaker (narration).
 *   # anim: surprise                -> tags are passed to the scene (key: value)
 */
export type DialogueStep =
  | { kind: 'line'; text: string; speaker?: string; tags: Record<string, string> }
  | { kind: 'choices'; choices: { index: number; text: string }[] }
  | { kind: 'end' };

export interface DialogueHooks {
  getFlag: (name: string) => boolean | number | string | undefined;
  setFlag: (name: string, value: boolean | number | string) => void;
  playerName: () => string;
}

const SPEAKER_RE = /^([A-Za-z][\w .'-]{0,24}):\s+(.+)$/s;

export function parseTags(tags: string[] | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const tag of tags ?? []) {
    const i = tag.indexOf(':');
    if (i < 0) out[tag.trim()] = 'true';
    else out[tag.slice(0, i).trim()] = tag.slice(i + 1).trim();
  }
  return out;
}

export class DialogueRunner {
  readonly story: Story;

  constructor(storyJson: unknown, private readonly hooks: DialogueHooks) {
    this.story = new Story(storyJson as string);
    this.story.BindExternalFunction('getFlag', (name: string) => hooks.getFlag(name) ?? false, true);
    this.story.BindExternalFunction('setFlag', (name: string, value: boolean | number | string) => hooks.setFlag(name, value), false);
  }

  hasKnot(knot: string): boolean {
    return this.story.KnotContainerWithName(knot) !== null;
  }

  start(knot: string, args: (string | number | boolean)[] = []): void {
    if (this.story.variablesState.GlobalVariableExistsWithName('player_name')) {
      this.story.variablesState.$('player_name', this.hooks.playerName());
    }
    this.story.ChoosePathString(knot, true, args);
  }

  next(): DialogueStep {
    while (this.story.canContinue) {
      const raw = (this.story.Continue() ?? '').trim();
      const tags = parseTags(this.story.currentTags);
      if (!raw && Object.keys(tags).length === 0) continue;
      const m = SPEAKER_RE.exec(raw);
      if (m) {
        const speaker = m[1] === 'PLAYER' ? this.hooks.playerName() : m[1];
        return { kind: 'line', text: m[2], speaker, tags };
      }
      return { kind: 'line', text: raw, tags };
    }
    if (this.story.currentChoices.length > 0) {
      return { kind: 'choices', choices: this.story.currentChoices.map((c) => ({ index: c.index, text: c.text })) };
    }
    return { kind: 'end' };
  }

  choose(index: number): void {
    this.story.ChooseChoiceIndex(index);
  }
}
