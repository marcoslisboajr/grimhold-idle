import { QUEUE_MAX, isProductionSkill, itemById, nodeById, recipeById, type ClientMessage, type PlayerState, type QueuedActivity, type SkillId } from '@grimhold/shared';
import { itemName, t, tr } from './i18n.ts';

/** Horas que dá para escolher (vazio = até acabar o material). */
const HOURS = [0.5, 1, 2, 4, 8, 12, 24];

/** Nome curto de uma tarefa: profissão e o que ela faz. */
export function queueLabel(q: { skill: SkillId; node: string }): string {
  const skill = t('skill.' + q.skill, q.skill);
  const r = isProductionSkill(q.skill) ? recipeById(q.skill, q.node) : undefined;
  if (r) return `${skill}: ${itemName(itemById(r.output)?.name ?? r.output)}`;
  return `${skill}: ${nodeById(q.skill, q.node)?.name ?? q.node}`;
}

/** Põe uma tarefa no fim da fila (coleta entra com 1 h, porque não acaba sozinha). */
export function queueAdd(state: PlayerState, skill: SkillId, node: string, send: (cmd: ClientMessage) => void) {
  const queue = state.queue ?? [];
  if (queue.length >= QUEUE_MAX) return;
  send({ type: 'queue_set', queue: [...queue, { skill, node, ...(isProductionSkill(skill) ? {} : { hours: 1 }) }] });
}

function HoursSelect(props: { value: number | undefined; allowUntilDone: boolean; onChange: (h: number | undefined) => void }) {
  return (
    <select value={props.value ?? ''} onChange={(e) => props.onChange(e.target.value === '' ? undefined : Number(e.target.value))}>
      {props.allowUntilDone && <option value="">{tr('até acabar o material', 'until materials run out')}</option>}
      {HOURS.map((h) => (
        <option key={h} value={h}>
          {h < 1 ? '30 min' : `${h} h`}
        </option>
      ))}
    </select>
  );
}

/**
 * Fila de profissões (18/10): o que o personagem faz quando a profissão atual acaba
 * (material ou hora marcada), uma depois da outra, mesmo com o jogo fechado.
 */
export function ActivityQueue(props: { state: PlayerState; now: number; send: (cmd: ClientMessage) => void }) {
  const { state, send } = props;
  const queue = state.queue ?? [];
  const act = state.activity && state.activity.skill !== 'combat' ? state.activity : null;
  const set = (next: QueuedActivity[]) => send({ type: 'queue_set', queue: next });
  const leftMin = state.queueUntil ? Math.max(0, Math.round((state.queueUntil - props.now) / 60_000)) : null;
  return (
    <div className="panel activity-queue">
      <b>{tr('Fila de profissões', 'Profession queue')}</b>{' '}
      <span className="small muted">
        {tr(
          `Quando a tarefa atual acaba, começa a próxima, mesmo com o jogo fechado (até ${QUEUE_MAX}). Use "+ Fila" nas tarefas abaixo.`,
          `When the current task ends, the next one starts, even with the game closed (up to ${QUEUE_MAX}). Use "+ Queue" on the tasks below.`,
        )}
      </span>
      {act && (
        <div className="small">
          {tr('Agora', 'Now')}: <b>{queueLabel(act)}</b> · {tr('para', 'stops')}:{' '}
          <select
            value=""
            onChange={(e) => send({ type: 'queue_limit', hours: e.target.value === 'done' ? null : Number(e.target.value) })}
          >
            <option value="" disabled>
              {leftMin !== null ? tr(`em ${Math.floor(leftMin / 60)}h ${leftMin % 60}min`, `in ${Math.floor(leftMin / 60)}h ${leftMin % 60}min`) : isProductionSkill(act.skill) ? tr('quando acabar o material', 'when materials run out') : tr('nunca (coleta)', 'never (gathering)')}
            </option>
            <option value="done">{tr('quando acabar o material', 'when materials run out')}</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {tr('daqui a', 'in')} {h < 1 ? '30 min' : `${h} h`}
              </option>
            ))}
          </select>
        </div>
      )}
      {queue.length > 0 && (
        <ol className="small">
          {queue.map((q, i) => (
            <li key={i}>
              {queueLabel(q)} ·{' '}
              <HoursSelect
                value={q.hours}
                allowUntilDone={isProductionSkill(q.skill)}
                onChange={(h) => set(queue.map((x, k) => (k === i ? { skill: x.skill, node: x.node, ...(h ? { hours: h } : {}) } : x)))}
              />{' '}
              {i > 0 && (
                <button className="link-btn" title={tr('Subir', 'Move up')} onClick={() => set(queue.map((x, k) => (k === i - 1 ? queue[i] : k === i ? queue[i - 1] : x)))}>
                  ↑
                </button>
              )}
              <button className="link-btn" title={tr('Tirar da fila', 'Remove')} onClick={() => set(queue.filter((_, k) => k !== i))}>
                ×
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
