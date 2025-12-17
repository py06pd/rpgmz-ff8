//=============================================================================
// RPG Maker MZ - Battle Mechanics
//=============================================================================

/*:
 * @target MZ
 * @plugindesc FF8 battle mechanics
 * @author Peter Dawson
 *
 * @help py06pd_BattleMechanics.js
 */

var py06pd = py06pd || {};
py06pd.BattleMechanics = py06pd.BattleMechanics || {};
py06pd.BattleMechanics.BattleSpeed = 3; // 1 - Fastest, 5 - Slowest

(function() {

//=============================================================================
// Game_Action
//=============================================================================

    py06pd.BattleMechanics.Game_Action_applyCritical = Game_Action.prototype.applyCritical;
    Game_Action.prototype.applyCritical = function(damage) {
        return damage * 2;
    };

    py06pd.BattleMechanics.Game_Action_itemCri = Game_Action.prototype.itemCri;
    Game_Action.prototype.itemCri = function(target) {
        if (this.isPhysical()) {
            return (this.subject().luk + 1) / 256;
        }

        return py06pd.BattleMechanics.Game_Action_itemCri.call(this, target);
    };

    py06pd.BattleMechanics.Game_Action_itemEva = Game_Action.prototype.itemEva;
    Game_Action.prototype.itemEva = function(target) {
        return 0;
    };

    py06pd.BattleMechanics.Game_Action_itemHit = Game_Action.prototype.itemHit;
    Game_Action.prototype.itemHit = function(target) {
        if (this.isPhysical()) {
            const hit = (this.subject().hit * 1000) / 10;
            if (hit >= 255) {
                return true;
            }

            return ((this.subject().luk / 2) + hit - (target.eva * 100) - target.luk) * 0.01;
        }

        return py06pd.BattleMechanics.Game_Action_itemHit.call(this, target);
    };

//=============================================================================
// Game_Battler
//=============================================================================

    py06pd.BattleMechanics.Game_Battler_initTpbChargeTime = Game_Battler.prototype.initTpbChargeTime;
    Game_Battler.prototype.initTpbChargeTime = function(advantageous) {
        this._tpbState = "charging";
        if (advantageous) {
            this._tpbChargeTime = 1;
        } else {
            this._tpbChargeTime = ((this.agi / 4) + Math.randomInt(128) - 34).clamp(0, 100) / 100;
        }

        if (this.isRestricted()) {
            this._tpbChargeTime = 0;
        }
    };

    py06pd.BattleMechanics.Game_Battler_tpbBaseSpeed = Game_Battler.prototype.tpbBaseSpeed;
    Game_Battler.prototype.tpbBaseSpeed = function() {
        return 1;
    };

    py06pd.BattleMechanics.Game_Battler_tpbSpeed = Game_Battler.prototype.tpbSpeed;
    Game_Battler.prototype.tpbSpeed = function() {
        return (this.agi + 30) * this.paramRate(6) / 2;
    };

//=============================================================================
// Game_Party
//=============================================================================

    Game_Party.prototype.maxBattleMembers = function() {
        return 3;
    };

//=============================================================================
// Game_Unit
//=============================================================================

    py06pd.BattleMechanics.Game_Unit_tpbReferenceTime = Game_Unit.prototype.tpbReferenceTime;
    Game_Unit.prototype.tpbReferenceTime = function() {
        return py06pd.BattleMechanics.BattleSpeed * 4000;
    };

//=============================================================================
// Window_BattleStatus
//=============================================================================

    Window_BattleStatus.prototype.maxCols = function() {
        return $gameParty.maxBattleMembers();
    };

})();
