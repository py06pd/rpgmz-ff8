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
 * Use json data for note in $dataEnemies for enemy level data
 * {
 *   "level": <level for an enemy that has a fixed level>,
 *   "levelData": [
 *     {
 *       "min": <min level for associated data>,
 *       "max": <max level for associated data>,
 *       "dropChance": <percentage chance of any item drop>,
 *       "dropItems": [
 *         { "item": "<item name for 178/256>", "amount": <drop amount for 178/256> },
 *         { "item": "<item name for 51/256>", "amount": <drop amount for 51/256> },
 *         { "item": "<item name for 15/256>", "amount": <drop amount for 15/256> },
 *         { "item": "<item name for 12/256>", "amount": <drop amount for 12/256> }
 *       ],
 *       "mugDifficulty": <difficulty * 100/256 is base chance of any mug success>,
 *       "mugItems": [
 *         { "item": "<item name for 178/256>", "amount": <steal amount for 178/256> },
 *         { "item": "<item name for 51/256>", "amount": <steal amount for 51/256> },
 *         { "item": "<item name for 15/256>", "amount": <steal amount for 15/256> },
 *         { "item": "<item name for 12/256>", "amount": <steal amount for 12/256> }
 *       ]
 *     },
 *   ],
 *   "stats": {
 *     "hp": <hp formula, x = placeholder for level>,
 *     "str": <str formula, x = placeholder for level>,
 *     "def": <def formula, x = placeholder for level>,
 *     "mat": <mat formula, x = placeholder for level>,
 *     "mdf": <mdf formula, x = placeholder for level>,
 *     "agi": <agi formula, x = placeholder for level>,
 *     "eva": <eva formula, x = placeholder for level>
 *   }
 *     ...
 *   ]
 * }
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
                    const data = py06pd.Utils.ReadJsonNote(item, 'EnemyLevels', {});
                    item.level = data.level ?? null;
                    item.levelData = data.levelData ?? [];
                    item.stats = data.stats;
                }
            });

            py06pd.EnemyLevels.DatabaseLoaded = true;
        }

        return true;
    };

    py06pd.EnemyLevels.BattleManager_gainDropItems = DataManager.gainDropItems;
    BattleManager.gainDropItems = function() {
        const items = this._rewards.items;
        for (const item of items) {
            $gameParty.gainItem(item.item, item.amount);
        }
    };

//=============================================================================
// Game_Enemy
//=============================================================================

    py06pd.EnemyLevels.Game_Enemy_initMembers = Game_Enemy.prototype.initMembers;
    Game_Enemy.prototype.initMembers = function() {
        py06pd.EnemyLevels.Game_Enemy_initMembers.call(this);
        this._level = 1;
    };

    py06pd.EnemyLevels.Game_Enemy_paramBase = Game_Enemy.prototype.paramBase;
    Game_Enemy.prototype.paramBase = function(paramId) {
        const params = ["hp", null, "str","def","mat","mdf","agi"];
        if (params[paramId]) {
            const x = this._level;
            return eval(this.enemy().stats[params[paramId]]);
        }

        return py06pd.EnemyLevels.Game_Enemy_paramBase.call(this, paramId);
    };

    py06pd.EnemyLevels.Game_Enemy_xparam = Game_Enemy.prototype.xparam;
    Game_Enemy.prototype.xparam = function(xparamId) {
        const xparams = [null,"eva"];
        if (xparams[xparamId]) {
            const x = this._level;
            return eval(this.enemy().stats[xparams[xparamId]]);
        }

        return py06pd.EnemyLevels.Game_Enemy_xparam.call(this, xparamId);
    };

    py06pd.EnemyLevels.Game_Enemy_makeDropItems = Game_Enemy.prototype.makeDropItems;
    Game_Enemy.prototype.makeDropItems = function() {
        const rand1 = Math.randomInt(100);
        if (rand1 < this.levelData().dropChance) {
            const rand = Math.randomInt(256);
            const item = this.dropItems()[this.dropSlot(rand)];

            const data = $dataItems.find(i => i && i.name === item.item);
            return [{ item: data, amount: item.amount }];
        }

        return [];
    };

    py06pd.EnemyLevels.Game_Enemy_mugDifficulty = Game_Enemy.prototype.mugDifficulty;
    Game_Enemy.prototype.mugDifficulty = function() {
        return this.levelData().mugDifficulty;
    };

    py06pd.EnemyLevels.Game_Enemy_mugItems = Game_Enemy.prototype.mugItems;
    Game_Enemy.prototype.mugItems = function() {
        return this.levelData().mugItems;
    };

//=============================================================================
// Game_Troop
//=============================================================================

    py06pd.EnemyLevels.Game_Troop_setup = Game_Troop.prototype.setup;
    Game_Troop.prototype.setup = function(troopId) {
        py06pd.EnemyLevels.Game_Troop_setup.call(this, troopId);
        const members = $gameParty.allBattleMembers();
        const avg = members.reduce((r, actor) => r + actor.level, 0) / members.length;
        this._enemies.forEach(enemy => {
            if (enemy.enemy().level) {
                enemy.setLevel(enemy.enemy().level);
            } else {
                enemy.setLevel(Math.max(Math.floor(avg * (Math.randomInt(2) === 1 ? 1.2 : 0.8)), 1));
            }
        });
    };

})();

//=============================================================================
// BattleManager
//=============================================================================

BattleManager.rewards = function() {
    return this._rewards;
};

//=============================================================================
// Game_Enemy
//=============================================================================

Game_Enemy.prototype.dropItems = function() {
    return this.levelData().dropItems;
};

Game_Enemy.prototype.dropSlot = function(rand) {
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

Game_Enemy.prototype.levelData = function() {
    return this.enemy().levelData
        .find(data => data.min <= this._level && data.max >= this._level);
};

Game_Enemy.prototype.setLevel = function(level) {
    this._level = level;
};
