//=============================================================================
// RPG Maker MZ - Enemy Levels
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Enemy levels.
 * @author Peter Dawson
 *
 * @help py06pd_EnemyLevels.js
 *
 */

var py06pd = py06pd || {};
py06pd.EnemyLevels = py06pd.EnemyLevels || {};

(function() {

//=============================================================================
// DataManager
//=============================================================================

    py06pd.EnemyLevels.DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        if (!py06pd.EnemyLevels.DataManager_isDatabaseLoaded.call(this)) {
            return false;
        }
        if (!py06pd.EnemyLevels.DatabaseLoaded) {
            $dataEnemies.forEach(item => {
                if (item) {
                    item.levelData = py06pd.Utils.ReadJsonNote(item, 'levelData', []);
                }
            });

            py06pd.EnemyLevels.DatabaseLoaded = true;
        }

        return true;
    };

//=============================================================================
// Game_Enemy
//=============================================================================

    py06pd.EnemyLevels.Game_Enemy_initMembers = Game_Enemy.prototype.initMembers;
    Game_Enemy.prototype.initMembers = function() {
        py06pd.EnemyLevels.Game_Enemy_initMembers.call(this);
        this.level = 1;
    };

    py06pd.EnemyLevels.Game_Enemy_paramBase = Game_Enemy.prototype.paramBase;
    Game_Enemy.prototype.paramBase = function(paramId) {
        const params = ["hp", null, "str","def","mat","mdf","agi"];
        if (params[paramId]) {
            const x = this.level;
            const stats = py06pd.Utils.ReadJsonNote(this.enemy(), 'stats', {});
            return eval(stats[params[paramId]]);
        }

        return py06pd.EnemyLevels.Game_Enemy_paramBase.call(this, paramId);
    };

    py06pd.EnemyLevels.Game_Enemy_xparam = Game_Enemy.prototype.xparam;
    Game_Enemy.prototype.xparam = function(xparamId) {
        const xparams = [null,"eva"];
        if (xparams[xparamId]) {
            const x = this.level;
            const stats = py06pd.Utils.ReadJsonNote(this.enemy(), 'stats', {});
            return eval(stats[xparams[xparamId]]);
        }

        return py06pd.EnemyLevels.Game_Enemy_xparam.call(this, xparamId);
    };

//=============================================================================
// Game_Troop
//=============================================================================

    py06pd.EnemyLevels.Game_Troop_setup = Game_Troop.prototype.setup;
    Game_Troop.prototype.setup = function(troopId) {
        py06pd.EnemyLevels.Game_Troop_setup.call(this, troopId);
        const members = $gameParty.battleMembers();
        const avg = members.reduce((r, actor) => r + actor.level, 0) / members.length;
        this._enemies.forEach(enemy => {
            enemy.level = Math.floor(avg * (Math.randomInt(2) === 1 ? 1.2 : 0.8));
        });
    };

})();

//=============================================================================
// Game_Enemy
//=============================================================================

Game_Enemy.prototype.levelData = function() {
    return this.enemy().levelData
        .find(data => data.min <= this.level && data.max >= this.level);
};
