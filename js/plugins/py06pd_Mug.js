//=============================================================================
// RPG Maker MZ - Mug
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Mug command.
 * @author Peter Dawson
 *
 * @help Mug command.
 *
 * Use json data for note in $dataSkills to flag mug skill
 * {
 *   "mug": <mug skill flag>
 * }
 *
 * @param vocabCouldntSteal
 * @text Steal failed text
 * @default GF Abilities
 *
 * @param vocabHasNothing
 * @text Has nothing text for when item has already been stolen from an enemy
 * @default Has nothing
 *
 * @param vocabStoleItem
 * @text Stole item text
 * @default Stole %1 %2
 */

var py06pd = py06pd || {};
py06pd.Mug = py06pd.Mug || {};

(function() {

    const params = PluginManager.parameters('py06pd_Mug');
    py06pd.Mug.vocabCouldntSteal = params.vocabCouldntSteal || 'Couldn\'t steal';
    py06pd.Mug.vocabHasNothing = params.vocabHasNothing || 'Has nothing';
    py06pd.Mug.vocabStoleItem = params.vocabStoleItem || 'Stole %1 %2';

//=============================================================================
// DataManager
//=============================================================================

    py06pd.Mug.DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        if (!py06pd.Mug.DataManager_isDatabaseLoaded.call(this)) {
            return false;
        }
        if (!py06pd.Mug.DatabaseLoaded) {
            $dataSkills.forEach(item => {
                if (item) {
                    const data = py06pd.Utils.ReadJsonNote(item, 'Mug', {});
                    item.mug = data.mug ?? false;
                }
            });

            py06pd.Mug.DatabaseLoaded = true;
        }

        return true;
    };

//=============================================================================
// Game_Action
//=============================================================================

    py06pd.Mug.Game_ActionResult_clear = Game_ActionResult.prototype.clear;
    Game_ActionResult.prototype.clear = function() {
        py06pd.Mug.Game_ActionResult_clear.call(this);
        this.mugItem = null;
        this.mugEmpty = false;
        this.mugUsed = false;
    };

    py06pd.Mug.Game_Action_executeDamage = Game_Action.prototype.executeDamage;
    Game_Action.prototype.executeDamage = function(target, value) {
        py06pd.Mug.Game_Action_executeDamage.call(this, target, value);
        if (this._item.isMug()) {
            const result = target.result();
            result.mugUsed = true;
            if (target.isMugged()) {
                result.mugEmpty = true;
            } else {
                result.mugItem = target.makeMugItems(this.subject());
            }
        }
    };

//=============================================================================
// Game_Enemy
//=============================================================================

    py06pd.Mug.Game_Enemy_initMembers = Game_Enemy.prototype.initMembers;
    Game_Enemy.prototype.initMembers = function() {
        py06pd.Mug.Game_Enemy_initMembers.call(this);
        this._mugged = false;
    };

    py06pd.Mug.Game_Enemy_makeDropItems = Game_Enemy.prototype.makeDropItems;
    Game_Enemy.prototype.makeDropItems = function() {
        if (!this.isMugged()) {
            return py06pd.Mug.Game_Enemy_makeDropItems.call(this);
        }

        return [];
    };

//=============================================================================
// Window_BattleLog
//=============================================================================

    py06pd.Mug.Window_BattleLog_displayActionResults = Window_BattleLog.prototype.displayActionResults;
    Window_BattleLog.prototype.displayActionResults = function(subject, target) {
        py06pd.Mug.Window_BattleLog_displayActionResults.call(this, subject, target);
        this.displayMug(subject, target);
    };

})();

//=============================================================================
// Game_Enemy
//=============================================================================

Game_Enemy.prototype.mugDifficulty = function() {
    return 128;
};

Game_Enemy.prototype.isMugged = function() {
    return this._mugged;
};

Game_Enemy.prototype.mugItems = function() {
    return ["", "", "", ""];
};

Game_Enemy.prototype.mugSlot = function(actor, rand) {
    if (rand < 178) {
        return 0;
    }

    if (rand < 229) {
        return 1;
    }

    if (rand < 244) {
        return 2;
    }

    return 3;
};

Game_Enemy.prototype.makeMugItems = function(actor) {
    const rand1 = Math.randomInt(100);
    var diff = (this.mugDifficulty() + (actor.agi / 2) + 1) * 100 / 256;
    if (rand1 < diff) {
        this._mugged = true;
        const rand = Math.randomInt(256);
        const item = this.mugItems()[this.mugSlot(actor, rand)];

        const data = $dataItems.find(i => i && i.name === item.item);
        $gameParty.gainItem(data, item.amount);
        return [data, item.amount];
    }

    return null;
};

//=============================================================================
// Game_Item
//=============================================================================

Game_Item.prototype.isMug = function() {
    return this.isSkill() && this.object().mug;
};

//=============================================================================
// Window_BattleLog
//=============================================================================

Window_BattleLog.prototype.displayMug = function(subject, target) {
    if (target.result().mugUsed) {
        this.push("pushBaseLine");

        if (target.result().mugEmpty) {
            this.push("addText", py06pd.Mug.vocabHasNothing);
        } else {
            const item = target.result.mugItem;
            if (item) {
                this.push("addText", py06pd.Mug.vocabStoleItem.format(item[1], item[0]));
            } else {
                this.push("addText", py06pd.Mug.vocabCouldntSteal);
            }
        }

        this.push("waitForNewLine");
        this.push("popBaseLine");
    }
};