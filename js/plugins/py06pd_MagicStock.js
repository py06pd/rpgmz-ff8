//=============================================================================
// RPG Maker MZ - Magic Stock
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Magic stock.
 * @author Peter Dawson
 *
 * @help py06pd_MagicStock.js
 *
 */

var py06pd = py06pd || {};
py06pd.MagicStock = py06pd.MagicStock || {};

py06pd.MagicStock.equippedIcon = 160;
py06pd.MagicStock.magicTypeId = 2;
py06pd.MagicStock.vocabCast = "Cast";
py06pd.MagicStock.vocabDraw = "Draw";
py06pd.MagicStock.vocabDrawResult = "%1 stocked %2 %3";
py06pd.MagicStock.vocabStock = "Stock";

(function() {

//=============================================================================
// DataManager
//=============================================================================

    py06pd.MagicStock.DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        if (!py06pd.MagicStock.DataManager_isDatabaseLoaded.call(this)) {
            return false;
        }
        if (!py06pd.MagicStock.DatabaseLoaded) {
            $dataEnemies.forEach(item => {
                if (item) {
                    item.levelData = py06pd.Utils.ReadJsonNote(item, 'levelData', []);
                }
            });
            $dataSkills.forEach(item => {
                if (item) {
                    item.drawResist = py06pd.Utils.ReadJsonNote(item, 'drawResist', 0);
                }
            });

            py06pd.MagicStock.DatabaseLoaded = true;
        }

        return true;
    };

//=============================================================================
// Game_Action
//=============================================================================

    py06pd.MagicStock.Game_Action_clear = Game_Action.prototype.clear;
    Game_Action.prototype.clear = function() {
        py06pd.MagicStock.Game_Action_clear.call(this);
        this._draw = null;
        this._cast = false;
    };

    py06pd.MagicStock.Game_Action_apply = Game_Action.prototype.apply;
    Game_Action.prototype.apply = function(target) {
        if (this._draw) {
            this.executeDraw(target);
        } else {
            py06pd.MagicStock.Game_Action_apply.call(this, target);
        }
    };

//=============================================================================
// Game_ActionResult
//=============================================================================

    py06pd.MagicStock.Game_ActionResult_clear = Game_ActionResult.prototype.clear;
    Game_ActionResult.prototype.clear = function() {
        py06pd.MagicStock.Game_ActionResult_clear.call(this);
        this.drawn = null;
        this.drawnSkillId = null;
    };

//=============================================================================
// Game_BattlerBase
//=============================================================================

    py06pd.MagicStock.Game_BattlerBase_initMembers = Game_BattlerBase.prototype.initMembers;
    Game_BattlerBase.prototype.initMembers = function() {
        py06pd.MagicStock.Game_BattlerBase_initMembers.call(this);
        this._magicStock = [];
    };

    py06pd.MagicStock.Game_BattlerBase_paySkillCost = Game_BattlerBase.prototype.paySkillCost;
    Game_BattlerBase.prototype.paySkillCost = function(skill) {
        py06pd.MagicStock.Game_BattlerBase_paySkillCost.call(this, skill);
        const stock = this._magicStock.find(magic => magic.id === skill.id);
        if (stock) {
            stock.stock = stock.stock - 1;
        }
    };

//=============================================================================
// Game_Enemy
//=============================================================================

    py06pd.MagicStock.Game_Enemy_initMembers = Game_Enemy.prototype.initMembers;
    Game_Enemy.prototype.initMembers = function() {
        py06pd.MagicStock.Game_Enemy_initMembers.call(this);
        this.level = 1;
    };

//=============================================================================
// Scene_Battle
//=============================================================================

    py06pd.MagicStock.Scene_Battle_isAnyInputWindowActive = Scene_Battle.prototype.isAnyInputWindowActive;
    Scene_Battle.prototype.isAnyInputWindowActive = function() {
        return py06pd.MagicStock.Scene_Battle_isAnyInputWindowActive.call(this) ||
            this._drawSkillWindow.active || this._drawWindow.active;
    };

    py06pd.MagicStock.Scene_Battle_createAllWindows = Scene_Battle.prototype.createAllWindows;
    Scene_Battle.prototype.createAllWindows = function() {
        py06pd.MagicStock.Scene_Battle_createAllWindows.call(this);
        this.createDrawSkillWindow();
        this.createDrawWindow();
    };

    py06pd.MagicStock.Scene_Battle_hideSubInputWindows = Scene_Battle.prototype.hideSubInputWindows;
    Scene_Battle.prototype.hideSubInputWindows = function() {
        py06pd.MagicStock.Scene_Battle_hideSubInputWindows.call(this);
        this._drawSkillWindow.deactivate();
        this._drawSkillWindow.hide();
        this._drawWindow.deactivate();
        this._drawWindow.hide();
    };

    py06pd.MagicStock.Scene_Battle_createActorCommandWindow = Scene_Battle.prototype.createActorCommandWindow;
    Scene_Battle.prototype.createActorCommandWindow = function() {
        py06pd.MagicStock.Scene_Battle_createActorCommandWindow.call(this);
        this._actorCommandWindow.setHandler("draw", this.commandDraw.bind(this));
    };

    py06pd.MagicStock.Scene_Battle_onEnemyOk = Scene_Battle.prototype.onEnemyOk;
    Scene_Battle.prototype.onEnemyOk = function() {
        if (
            !this._drawWindow.visible &&
            this._actorCommandWindow.currentSymbol() === "draw"
        ) {
            this._drawSkillWindow.setActor(BattleManager.actor());
            this._drawSkillWindow.setEnemy(this._enemyWindow.enemy());
            this._drawSkillWindow.show();
            this._drawSkillWindow.activate();
            this._drawSkillWindow.select(0);
        } else {
            py06pd.MagicStock.Scene_Battle_onEnemyOk.call(this);
        }
    };

//=============================================================================
// Window_ActorCommand
//=============================================================================

    py06pd.MagicStock.Window_ActorCommand_makeCommandList = Window_ActorCommand.prototype.makeCommandList;
    Window_ActorCommand.prototype.makeCommandList = function() {
        if (this._actor) {
            this.addAttackCommand();
            this.addSkillCommands();
            this.addDrawCommand();
            //this.addGuardCommand();
            this.addItemCommand();
        }
    };

//=============================================================================
// Window_BattleLog
//=============================================================================

    Window_BattleLog.prototype.displayActionResults = function(subject, target) {
        if (target.result().used) {
            this.push("pushBaseLine");
            this.displayCritical(target);
            this.push("popupDamage", target);
            this.push("popupDamage", subject);
            this.displayDamage(target);
            this.displayDraw(subject, target);
            this.displayAffectedStatus(target);
            this.displayFailure(target);
            this.push("waitForNewLine");
            this.push("popBaseLine");
        }
    };

    Window_BattleLog.prototype.displayDraw = function(subject, target) {
        const result = target.result();
        if (result.drawnSkillId) {
            const item = $dataSkills[result.drawnSkillId];
            const message = py06pd.MagicStock.vocabDrawResult.format(subject.name(), result.drawn, item.name);
            this.push("addText", message);
        }
    };

//=============================================================================
// Window_SkillList
//=============================================================================

    py06pd.MagicStock.Window_SkillList_makeItemList = Window_SkillList.prototype.makeItemList;
    Window_SkillList.prototype.makeItemList = function() {
        if (this._actor && this._stypeId === py06pd.MagicStock.magicTypeId) {
            this._data = this._actor.magic().filter(item => item.stock > 0).map(item => $dataSkills[item.id]);
        } else {
            py06pd.MagicStock.Window_SkillList_makeItemList.call(this);
        }
    };

    py06pd.MagicStock.Window_SkillList_drawSkillCost = Window_SkillList.prototype.drawSkillCost;
    Window_SkillList.prototype.drawSkillCost = function(skill, x, y, width) {
        if (this._actor && this._stypeId === py06pd.MagicStock.magicTypeId) {
            this.changeTextColor(ColorManager.mpCostColor());
            this.drawText(this._actor.magicStock(skill.id), x, y, width, "right");
        } else {
            py06pd.MagicStock.Window_SkillList_drawSkillCost.call(this, skill, x, y, width);
        }
    };
})();

//=============================================================================
// Game_Action
//=============================================================================

Game_Action.prototype.setDraw = function(skill) {
    this._draw = skill;
};

Game_Action.prototype.setCast = function(cast) {
    this._cast = cast;
};

Game_Action.prototype.executeDraw = function(target) {
    const result = target.result();
    this.subject().clearResult();
    result.clear();
    result.used = true;

    const skill = this._draw;
    const drawResist = skill.drawResist;
    const amount = ((this.subject().level - target.level) / 2) + 4;
    const amount2 = Math.min(9, Math.floor((amount + this.subject().mat +
        1 + Math.randomInt(32) - drawResist) / 5));
    if (amount2 >= 1) {
        result.drawn = amount2;
        result.drawnSkillId = skill.id;
        this.subject().addMagicStock(skill.id, amount2);
        this.makeSuccess(target);
    }
};

//=============================================================================
// Game_Actor
//=============================================================================

Game_Actor.prototype.magic = function() {
    return this._magicStock;
};

Game_Actor.prototype.addMagicStock = function(skillId, value) {
    const stock = this._magicStock.find(magic => magic.id === skillId);
    if (stock) {
        stock.stock = stock.stock + value;
    } else {
        this._magicStock.push({ id: skillId, stock: value });
    }
};

Game_Actor.prototype.magicStock = function(skillId) {
    const stock = this._magicStock.find(magic => magic.id === skillId);
    return stock ? stock.stock : 0;
};

//=============================================================================
// Game_Enemy
//=============================================================================

Game_Enemy.prototype.drawMagic = function() {
    return this.enemy().levelData
        .find(data => data.min <= this.level && data.max >= this.level)
        .draw.map(name => $dataSkills.find(skill => skill && skill.name === name));
};

//=============================================================================
// Scene_Battle
//=============================================================================

Scene_Battle.prototype.commandDraw = function() {
    this.startEnemySelection();
};

Scene_Battle.prototype.createDrawSkillWindow = function() {
    const rect = this.skillWindowRect();
    this._drawSkillWindow = new Window_BattleDrawSkill(rect);
    this._drawSkillWindow.setHelpWindow(this._helpWindow);
    this._drawSkillWindow.setHandler("ok", this.onDrawSkillOk.bind(this));
    this._drawSkillWindow.setHandler("cancel", this.onDrawSkillCancel.bind(this));
    this._drawSkillWindow.hide();
    this.addWindow(this._drawSkillWindow);
};

Scene_Battle.prototype.onDrawSkillOk = function() {
    this._drawSkillWindow.hide();
    this._drawSkillWindow.deactivate();
    this._drawWindow.show();
    this._drawWindow.activate();
    this._drawWindow.select(0);
};

Scene_Battle.prototype.onDrawSkillCancel = function() {
    this._drawSkillWindow.hide();
    this._drawSkillWindow.deactivate();
    this._enemyWindow.show();
    this._enemyWindow.activate();
};

Scene_Battle.prototype.createDrawWindow = function() {
    const rect = this.actorCommandWindowRect();
    this._drawWindow = new Window_BattleDraw(rect);
    this._drawWindow.setHandler("ok", this.onDrawOk.bind(this));
    this._drawWindow.setHandler("cancel", this.onDrawCancel.bind(this));
    this._drawWindow.hide();
    this.addWindow(this._drawWindow);
};

Scene_Battle.prototype.onDrawOk = function() {
    const skill = this._drawSkillWindow.item();
    const action = BattleManager.inputtingAction();
    if (this._drawWindow.index() === 0) {
        action.setTarget(this._enemyWindow.enemyIndex());
        action.setDraw(skill);
        BattleManager.selectNextCommand();
        this.changeInputWindow();
    } else {
        action.setCast(true);
        action.setSkill(skill.id);
        this.onSelectAction();
    }
};

Scene_Battle.prototype.onDrawCancel = function() {
    this._drawWindow.hide();
    this._drawWindow.deactivate();
    this._drawSkillWindow.show();
    this._drawSkillWindow.activate();
};

//=============================================================================
// Window_ActorCommand
//=============================================================================

Window_ActorCommand.prototype.addDrawCommand = function() {
    this.addCommand(py06pd.MagicStock.vocabDraw, "draw");
};

//=============================================================================
// Window_BattleDraw
//=============================================================================

function Window_BattleDraw() {
    this.initialize(...arguments);
}

Window_BattleDraw.prototype = Object.create(Window_Selectable.prototype);
Window_BattleDraw.prototype.constructor = Window_BattleDraw;

Window_BattleDraw.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this.refresh();
};

Window_BattleDraw.prototype.maxItems = function() {
    return 2;
};

Window_BattleDraw.prototype.drawItem = function(index) {
    const rect = this.itemLineRect(index);
    if (index === 0) {
        this.drawText(py06pd.MagicStock.vocabStock, rect.x, rect.y, rect.width);
    } else {
        this.drawText(py06pd.MagicStock.vocabCast, rect.x, rect.y, rect.width);
    }
};

//=============================================================================
// Window_BattleDrawSkill
//=============================================================================

function Window_BattleDrawSkill() {
    this.initialize(...arguments);
}

Window_BattleDrawSkill.prototype = Object.create(Window_SkillList.prototype);
Window_BattleDrawSkill.prototype.constructor = Window_BattleDrawSkill;

Window_BattleDrawSkill.prototype.initialize = function(rect) {
    Window_SkillList.prototype.initialize.call(this, rect);
    this._enemy = null;
    this._stypeId = py06pd.MagicStock.magicTypeId;
};

Window_BattleDrawSkill.prototype.setEnemy = function(enemy) {
    if (this._enemy !== enemy) {
        this._enemy = enemy;
        this.refresh();
        this.scrollTo(0, 0);
    }
};

Window_BattleDrawSkill.prototype.maxCols = function() {
    return 1;
};

Window_BattleDrawSkill.prototype.colSpacing = function() {
    return 8;
};

Window_BattleDrawSkill.prototype.isEnabled = function(item) {
    return this._actor && this._actor.magicStock(item.id) < 100;
};

Window_BattleDrawSkill.prototype.makeItemList = function() {
    if (this._enemy) {
        this._data = this._enemy.drawMagic();
    } else {
        this._data = [];
    }
};
