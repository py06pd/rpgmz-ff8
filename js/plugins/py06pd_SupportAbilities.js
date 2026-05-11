//=============================================================================
// RPG Maker MZ - Support Abilities
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Support abilities.
 * @author Peter Dawson
 *
 * @help Requires py06pd_BattleMechanics
 * Requires py06pd_EquipLearnSkill
 *
 * Use json data for note in $dataStates for ability settings.
 * {
 *   "characterAbility": <flag for identifying a character ability eg. HP+20%. true or false.>
 *   "xparamRate": [<hit rate>, <eva rate>, <cri rate>, <cev rate>, <mev rate>, <mrf rate>, <cnt rate>, <hrg rate>, <mrg rate>, <trg rate>]
 *   "levelBonus": [<hp bonus>, <mp bonus>, <atk bonus>, <def bonus>, <mat rate>, <mdf rate>, <agi rate>, <luck rate>]
 *   "autoState": <status to give to actor eg. Auto-Haste, Auto-Protect>
 *   "autoStateAffected": "<name of additional states actor should be affected by when using autoState eg. Haste for Auto-Haste, so casting Haste has no effect if target already has Auto-Haste>"
 *   "sparamRate": [<tpb charge rate>]
 *   "initiative": <flag for indicating if tpb bar is full at start of battle>
 *   "moveHpUp": <number of steps to recover 1 HP>
 *   "alert": <flag for cancel surprise attacks on party>
 *   "replaceCommand": {"<name of command to replace>": "<name of command to replace with>"}
 *   "switch": <id of switch to enabled when the ability is assigned for eg. Move-Find>
 * }
 *
 */

var py06pd = py06pd || {};
py06pd.SupportAbilities = py06pd.SupportAbilities || {};

(function() {

//=============================================================================
// DataManager
//=============================================================================

    py06pd.SupportAbilities.DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        if (py06pd.SupportAbilities.DataManager_isDatabaseLoaded.call(this)) {
            $dataStates.forEach(item => {
                if (item) {
                    const data = py06pd.Utils.ReadJsonNote(item, 'SupportAbilities', {});
                    item.characterAbility = data.characterAbility ?? false;
                    item.xparamRate = data.xparamRate;
                    item.levelBonus = data.levelBonus;
                    item.autoState = data.autoState ?? false;
                    item.sparamRate = data.sparamRate;
                    item.moveHpUp = data.moveHpUp ?? 0;
                    item.alert = data.alert ?? false;
                    item.replaceCommand = data.replaceCommand;
                    item.initiative = data.initiative;
                    item.switch = data.switch;
                }
            });

            return true;
        }

        return false;
    };

//=============================================================================
// BattleManager
//=============================================================================

    py06pd.SupportAbilities.BattleManager_encounterMod = BattleManager.encounterMod;
    BattleManager.encounterMod = function() {
        if (
            $gameParty.allBattleMembers().some(member =>
                member.supportAbilities().some(ability => ability.alert))
        ) {
            return 20;
        }

        return py06pd.SupportAbilities.BattleManager_encounterMod.call(this);
    };

//=============================================================================
// Game_Party
//=============================================================================

    py06pd.SupportAbilities.Game_Party_increaseSteps = Game_Party.prototype.increaseSteps;
    Game_Party.prototype.increaseSteps = function() {
        py06pd.SupportAbilities.Game_Party_increaseSteps.call(this);
        this.allBattleMembers().forEach(member => {
           member.increaseSteps();
        });
    };

//=============================================================================
// Game_Actor
//=============================================================================

    py06pd.SupportAbilities.Game_Actor_initMembers = Game_Actor.prototype.initMembers;
    Game_Actor.prototype.initMembers = function() {
        py06pd.SupportAbilities.Game_Actor_initMembers.call(this);
        this._steps = 0;
    };

    py06pd.SupportAbilities.Game_Actor_levelUp = Game_Actor.prototype.levelUp;
    Game_Actor.prototype.levelUp = function() {
        py06pd.SupportAbilities.Game_Actor_levelUp.call(this);
        const bonuses = this.supportAbilities().filter(ability => ability.levelBonus);
        if (bonuses.length > 0) {
            bonuses.forEach(ability => {
               ability.levelBonus.forEach((increment, index) => {
                   this.addParam(index, increment);
               });
            });
        }
    };

    py06pd.SupportAbilities.Game_Actor_traitObjects = Game_Actor.prototype.traitObjects;
    Game_Actor.prototype.traitObjects = function() {
        const objects = py06pd.SupportAbilities.Game_Actor_traitObjects.call(this);
        this.supportAbilities().forEach(ability => {
            objects.push(ability);
        });
        return objects;
    };

//=============================================================================
// Game_Switches
//=============================================================================

    py06pd.SupportAbilities.Game_Switches_value = Game_Switches.prototype.value;
    Game_Switches.prototype.value = function(switchId) {
        return py06pd.SupportAbilities.Game_Switches_value.call(this, switchId) ||
            $gameParty.allBattleMembers().some(member =>
                member.supportAbilities().some(ability =>
                    ability.switch === switchId));
    };

//=============================================================================
// Window_ActorCommand
//=============================================================================

    py06pd.SupportAbilities.Window_ActorCommand_makeCommandList = Window_ActorCommand.prototype.makeCommandList;
    Window_ActorCommand.prototype.makeCommandList = function() {
        py06pd.SupportAbilities.Window_ActorCommand_makeCommandList.call(this);
        if (this._actor) {
            this._list = this.replaceCommands(this._list);
        }
    };

})();

//=============================================================================
// Game_Actor
//=============================================================================

Game_Actor.prototype.increaseSteps = function() {
    const ability = this.supportAbilities().find(a => a.moveHpUp)
    if (ability) {
        this._steps++;
        if (this._steps >= ability.moveHpUp) {
            this._steps = 0;
            this.gainHp(1);
        }
    }
};

Game_Actor.prototype.onBattleStart = function(advantageous) {
    const initiative = this.supportAbilities().some(ability => ability.initiative);
    Game_Battler.prototype.onBattleStart.call(this, advantageous || initiative);
    this.updatePassiveStates();
};

Game_Actor.prototype.revive = function() {
    Game_BattlerBase.prototype.revive.call(this);
    this.updatePassiveStates();
};

Game_Actor.prototype.isStateAffected = function(stateId) {
    if (Game_BattlerBase.prototype.isStateAffected.call(this, stateId)) {
        return true;
    }

    const state = $dataStates[stateId];

    return this.supportAbilities()
        .some(ability => ability.autoStateAffected === state.name);
};

Game_Actor.prototype.supportAbilities = function() {
    const skills = [];
    this.gfSkills().forEach(skillName => {
        const found = $dataStates.find(s => s && s.name === skillName);
        if (found && found.characterAbility) {
            skills.push(found);
        }
    });

    return skills;
};

Game_Actor.prototype.xparam = function(xparamId) {
    let value = Game_BattlerBase.prototype.xparam.call(this, xparamId);
    this.supportAbilities().forEach(ability => {
        if (ability.xparamRate && ability.xparamRate[xparamId]) {
            value = value * ability.xparamRate[xparamId];
        }
    });
    return value;
};

Game_Actor.prototype.sparam = function(sparamId) {
    let value = Game_BattlerBase.prototype.sparam.call(this, sparamId);
    this.supportAbilities().forEach(ability => {
        if (ability.sparamRate && ability.sparamRate[sparamId - 10]) {
            value = value * ability.sparamRate[sparamId - 10];
        }
    });
    return value;
};

Game_Actor.prototype.updatePassiveStates = function() {
    this.supportAbilities().forEach(ability => {
        if (ability.autoState && !this.isStateAffected(ability.id)) {
            this.addState(ability.id);
        }
    });
};

Game_Actor.prototype.initTpbChargeTime = function(advantageous) {
    Game_Battler.prototype.initTpbChargeTime.call(this, advantageous);
    if (this.supportAbilities().some(ability => ability.initiative)) {
        this._tpbChargeTime = 1;
    }
};

//=============================================================================
// Window_ActorCommand
//=============================================================================

Window_ActorCommand.prototype.replaceCommands = function(commands) {
    return commands.map(option => {
        const replace = this._actor.supportAbilities()
            .find(ability => ability.replaceCommand && ability.replaceCommand[option.symbol]);
        if (replace) {
            return {
                name: replace.name,
                symbol: replace.replaceCommand[option.symbol],
                enabled: option.enabled,
                ext: option.ext
            };
        }

        return option;
    });
};
