import { useState, useEffect } from 'react';
import { Pix } from './Pix.tsx';
import { PETS, petById, PET_XP_BONUS, SKILLS, isKidsShopOpen, type Bonus, type SkillId } from '@grimhold/shared';
import { t, tr, onLangChange, getLang } from './i18n.ts';

const petIcon = (sprite: string) => `/assets/pets/${sprite}.png`;
const skillIcon = (skill: SkillId | undefined) => {
  const s = SKILLS.find((sk) => sk.id === skill);
  return s ? `/assets/icons/${s.icon}.png` : '';
};

export function PetsPanel(props: {
  unlockedPets?: string[];
  activePet?: string | null;
  onSetPet: (petId: string | null) => void;
  /** Mascote de combate equipado (o bônus só vale com ele; um por vez). */
  combatPet?: string | null;
  onSetCombatPet?: (petId: string | null) => void;
}) {
  const [, setLangState] = useState(getLang());
  useEffect(() => onLangChange(setLangState), []);
  const { unlockedPets = [], activePet = null, onSetPet } = props;
  const shopOpen = isKidsShopOpen(Date.now());
  const [selectedId, setSelectedId] = useState<string>(activePet || PETS[0].id);

  const selectedPet = petById(selectedId) ?? PETS[0];
  const isUnlocked = unlockedPets.includes(selectedPet.id);
  const isActive = activePet === selectedPet.id;

  return (
    <div className="pets-panel">
      <div className="pets-header">
        <span className="small">
          {t('pets.collection')} <strong>{unlockedPets.length}/{PETS.length}</strong> {t('pets.unlocked_count')}
        </span>
      </div>

      <p className="pets-info-note small">
        {t('pets.desc')}
      </p>

      {/* Grid de seleção com ícones */}
      <div className="pets-grid">
        {PETS.map((pet) => {
          const unlocked = unlockedPets.includes(pet.id);
          const active = activePet === pet.id;
          const isSel = selectedPet.id === pet.id;

          return (
            <button
              key={pet.id}
              type="button"
              className={`pet-card ${unlocked ? 'unlocked' : 'locked'} ${active ? 'active' : ''} ${isSel ? 'selected' : ''}`}
              onClick={() => setSelectedId(pet.id)}
              title={`${pet.name} (${unlocked ? t('pets.unlocked') : t('pets.locked')})`}
            >
              <div className="pet-card-preview">
                <div
                  className="pet-sprite-thumb"
                  style={{
                    backgroundImage: `url(${petIcon(pet.sprite)})`,
                    backgroundPosition: '0 0',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '300% 400%',
                    filter: unlocked ? 'none' : 'brightness(0) opacity(0.3)',
                  }}
                />
              </div>
              <span className="pet-card-name">{t('pet.' + pet.id + '.name', pet.name)}</span>
              {active && <span className="pet-badge-active">{t('pets.equipped')}</span>}
              {props.combatPet === pet.id && <span className="pet-badge-active">{tr('Combate', 'Combat')}</span>}
            </button>
          );
        })}
      </div>

      {/* Detalhe do pet selecionado */}
      {selectedPet && (
        <div className="pet-detail-card">
          <div className="pet-detail-header">
            <div
              className="pet-detail-sprite-box"
              style={{
                filter: isUnlocked ? 'none' : 'brightness(0) opacity(0.25)',
              }}
            >
              <div
                className="pet-sprite-large"
                style={{
                  backgroundImage: `url(${petIcon(selectedPet.sprite)})`,
                  backgroundPosition: '0 0',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '300% 400%',
                }}
              />
            </div>
            <div className="pet-detail-info">
              <h4>{t('pet.' + selectedPet.id + '.name', selectedPet.name)}</h4>
              {selectedPet.combat ? (
                <div className="pet-bonus-tag">
                  <Pix name="ui_star" /> {tr('Mascote de combate (equipado):', 'Combat pet (equipped):')} {combatPetText(selectedPet.combat)}
                </div>
              ) : selectedPet.halloween ? (
                <div className="pet-skill-tag">{tr('Mascote do Halloween (enfeite, sem bônus)', 'Halloween pet (cosmetic, no bonus)')}</div>
              ) : selectedPet.vote ? (
                <div className="pet-skill-tag">{tr('Mascote da Loja de Votos (enfeite, sem bônus)', 'Vote Shop pet (cosmetic, no bonus)')}</div>
              ) : selectedPet.event ? (
                <div className="pet-bonus-tag">
                  <Pix name="ui_star" /> {tr(`+${Math.round((selectedPet.loot ?? 0) * 100)}% de loot nas caçadas (sempre ativo)`, `+${Math.round((selectedPet.loot ?? 0) * 100)}% hunt loot (always on)`)}
                </div>
              ) : selectedPet.kids ? (
                <div className="pet-skill-tag">{tr('Mascote do Dia das Crianças (enfeite, sem bônus)', "Children's Day pet (cosmetic, no bonus)")}</div>
              ) : (
              <>
              <div className="pet-skill-tag">
                {skillIcon(selectedPet.skill) && (
                  <img src={skillIcon(selectedPet.skill)} alt="" className="icon tiny" />
                )}
                <span>{t('pets.profession')} {t('skill.' + selectedPet.skill, SKILLS.find((s) => s.id === selectedPet.skill)?.name ?? selectedPet.skill)}</span>
              </div>
              <div className="pet-bonus-tag">
                <Pix name="ui_star" /> +{Math.round(PET_XP_BONUS * 100)}% {t('pets.xp_bonus')}
              </div>
              </>
              )}
            </div>
          </div>

          <p className="pet-desc small">{t('pet.' + selectedPet.id + '.desc', selectedPet.description)}</p>

          <div className="pet-actions">
            {selectedPet.combat && isUnlocked && props.onSetCombatPet && (
              <button type="button" className={`primary small-btn ${props.combatPet === selectedPet.id ? 'danger-btn' : ''}`} onClick={() => props.onSetCombatPet!(props.combatPet === selectedPet.id ? null : selectedPet.id)}>
                {props.combatPet === selectedPet.id ? tr('Tirar o bônus de combate', 'Remove combat bonus') : tr('Equipar o bônus de combate', 'Equip combat bonus')}
              </button>
            )}
            {!isUnlocked && selectedPet.combat ? (
              <div className="pet-locked-hint small">
                <Pix name="ui_lock" /> {tr(`Cai com chance rara de: ${selectedPet.source}.`, `Rare drop from: ${t('pet.' + selectedPet.id + '.src', selectedPet.source ?? '')}.`)}
              </div>
            ) : !isUnlocked && selectedPet.halloween ? (
              <div className="pet-locked-hint small">{tr('Compre com o Jack, na praça (Halloween).', 'Buy it from Jack, in the square (Halloween).')}</div>
            ) : !isUnlocked && selectedPet.vote ? (
              <div className="pet-locked-hint small">
                {tr('Compre na Loja de Votos (botão Votar no topo).', 'Buy it in the Vote Shop (Vote button at the top).')}
              </div>
            ) : !isUnlocked && selectedPet.kids ? (
              <div className="pet-locked-hint small">
                {shopOpen
                  ? tr('Compre com a Tia Jujuba, na frente da fonte da praça (200 doces).', 'Buy it from Aunt Jujuba, in front of the square fountain (200 candies).')
                  : tr('Era da loja do Dia das Crianças (11 a 14/10).', "It was sold in the Children's Day shop (Oct 11–14).")}
              </div>
            ) : !isUnlocked && selectedPet.event ? (
              <div className="pet-locked-hint small">
                {tr('Recompensa de quem ajudou a derrubar o Mímico Rei, o último Mímico do Dia das Crianças (14/10).', "Reward for helping defeat the Mimic King, the last Mimic of Children's Day (Oct 14).")}
              </div>
            ) : !isUnlocked ? (
              <div className="pet-locked-hint small">
                <Pix name="ui_lock" /> {t('pets.how_to_find')} {t('skill.' + selectedPet.skill, SKILLS.find((s) => s.id === selectedPet.skill)?.name ?? selectedPet.skill)} {t('pets.rare_chance')}
              </div>
            ) : isActive ? (
              <button
                type="button"
                className="primary small-btn danger-btn"
                onClick={() => onSetPet(null)}
              >
                {t('pets.dismiss')}
              </button>
            ) : (
              <button
                type="button"
                className="primary small-btn"
                onClick={() => onSetPet(selectedPet.id)}
              >
                {t('pets.equip')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Bônus do mascote de combate em texto (o bonusText do jogo não tem os percentuais de ataque/defesa/vida/dano crítico). */
function combatPetText(c: Partial<Bonus>): string {
  const p = (n: number) => `+${Number((n * 100).toFixed(1))}%`;
  const parts: string[] = [];
  if (c.attackPct) parts.push(`${p(c.attackPct)} ${tr('de ataque', 'attack')}`);
  if (c.defensePct) parts.push(`${p(c.defensePct)} ${tr('de defesa', 'defense')}`);
  if (c.hpPct) parts.push(`${p(c.hpPct)} ${tr('de vida', 'HP')}`);
  if (c.crit) parts.push(`${p(c.crit)} ${tr('de crítico', 'crit')}`);
  if (c.critMult) parts.push(`${p(c.critMult)} ${tr('de dano crítico', 'crit damage')}`);
  if (c.lifesteal) parts.push(`${p(c.lifesteal)} ${tr('de roubo de vida', 'lifesteal')}`);
  if (c.regen) parts.push(`${p(c.regen)} ${tr('de regeneração', 'regeneration')}`);
  if (c.mana) parts.push(`${p(c.mana)} ${tr('de mana', 'mana')}`);
  return parts.join(', ');
}
