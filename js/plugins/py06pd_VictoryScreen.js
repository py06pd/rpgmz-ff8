//=============================================================================
// RPG Maker MZ - Victory Screen
//=============================================================================

/*:
 * @target MZ
 * @plugindesc FF8 victory screen
 * @author Peter Dawson
 *
 * @help Requires py06pd_EnemyLevels
 * Requires py06pd_EquipLearnSkill
 *
 * @param vocabCurrentExp
 * @text Current EXP text
 * @default Current EXP
 *
 * @param vocabDidntReceiveExp
 * @text Text to show when the actor is dead and doesn't receive EXP
 * @default Didn't receive EXP
 *
 * @param vocabExpAcquired
 * @text EXP acquired text
 * @default EXP Acquired
 *
 * @param vocabExpReceived
 * @text EXP received text
 * @default EXP received
 *
 * @param vocabGFLearnedSkill
 * @text GF learned skil text
 * @default GF %1 learned %2!
 *
 * @param vocabGFReceivedAP
 * @text GF received AP text
 * @default GF received %1AP!
 *
 * @param vocabItemReceived
 * @text Item received text
 * @default Item received
 *
 * @param vocabNextLevel
 * @text EXP required to level up text
 * @default Next LEVEL
 *
 * @param vocabRaisingGF
 * @text Title for AP acquisition window
 * @default Raising GF
 */

var py06pd = py06pd || {};
py06pd.VictoryScreen = py06pd.VictoryScreen || {};

(function() {

    const params = PluginManager.parameters('py06pd_VictoryScreen');
    py06pd.VictoryScreen.vocabCurrentExp = params.vocabCurrentExp || "Current EXP";
    py06pd.VictoryScreen.vocabDidntReceiveExp = params.vocabDidntReceiveExp || "Didn't receive EXP";
    py06pd.VictoryScreen.vocabExpAcquired = params.vocabExpAcquired || "EXP Acquired";
    py06pd.VictoryScreen.vocabExpReceived = params.vocabExpReceived || "EXP received";
    py06pd.VictoryScreen.vocabGFLearnedSkill = params.vocabGFLearnedSkill || "GF %1 learned %2!";
    py06pd.VictoryScreen.vocabGFReceivedAP = params.vocabGFReceivedAP || "GF received %1AP!";
    py06pd.VictoryScreen.vocabItemReceived = params.vocabItemReceived || "Item received";
    py06pd.VictoryScreen.vocabNextLevel = params.vocabNextLevel || "Next LEVEL";
    py06pd.VictoryScreen.vocabRaisingGF = params.vocabRaisingGF || "Raising GF";

//=============================================================================
// BattleManager
//=============================================================================

    py06pd.VictoryScreen.BattleManager_processVictory = BattleManager.processVictory;
    BattleManager.processVictory = function() {
        $gameParty.removeBattleStates();
        $gameParty.performVictory();
        this.playVictoryMe();
        this.replayBgmAndBgs();
        this.makeRewards();
        this._phase = "victory";
    };

//=============================================================================
// Scene_Battle
//=============================================================================

    py06pd.VictoryScreen.Scene_Battle_createAllWindows = Scene_Battle.prototype.createAllWindows;
    Scene_Battle.prototype.createAllWindows = function() {
        py06pd.VictoryScreen.Scene_Battle_createAllWindows.call(this);
        this.createTitleWindow();
        this.createExpWindow();
        this.createVictoryItemWindow();
        this.createApWindow();
        this.createGFSkillWindow();
    };

    py06pd.VictoryScreen.Scene_Battle_updateVisibility = Scene_Battle.prototype.updateVisibility;
    Scene_Battle.prototype.updateVisibility = function() {
        py06pd.VictoryScreen.Scene_Battle_updateVisibility.call(this);

        if (BattleManager._phase === "victory" && !this._titleWindow.isOpen()) {
            this._titleWindow.setText(py06pd.VictoryScreen.vocabExpReceived);
            this._titleWindow.open();
            this._expWindow.open();
            this._statusWindow.close();
            this._partyCommandWindow.close();
            this._actorCommandWindow.close();
        }
    };

})();

//=============================================================================
// Scene_Battle
//=============================================================================

Scene_Battle.prototype.createApWindow = function() {
    const rect = this.apWindowRect();
    this._apWindow = new Window_BattleVictoryAp(rect);
    this._apWindow.setHandler(this.onApOk.bind(this));
    this._apWindow.close();
    this.addWindow(this._apWindow);
};

Scene_Battle.prototype.apWindowRect = function() {
    const wh = this.calcWindowHeight(1, false);
    const wx =  Graphics.boxWidth / 4;
    const wy = ((Graphics.boxHeight - this._titleWindow.height) - wh) / 2;
    const ww = Graphics.boxWidth / 2;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_Battle.prototype.createExpWindow = function() {
    const rect = this.expWindowRect();
    this._expWindow = new Window_BattleVictoryExp(rect);
    this._expWindow.close();
    this._expWindow.setHandler("ok", this.onExpOk.bind(this));
    this._expWindow.setHandler("cancel", this.onExpOk.bind(this));
    this.addWindow(this._expWindow);
};

Scene_Battle.prototype.expWindowRect = function() {
    const wy = this._titleWindow.x + this._titleWindow.height;
    const ww = Graphics.boxWidth;
    const wh = Graphics.boxHeight - this._titleWindow.height;
    return new Rectangle(0, wy, ww, wh);
};

Scene_Battle.prototype.createGFSkillWindow = function() {
    const rect = this.gfSkillWindowRect();
    this._gfSkillWindow = new Window_BattleVictoryGFSkill(rect);
    this._gfSkillWindow.close();
    this._gfSkillWindow.setHandler(this.onGFSkillOk.bind(this));
    this.addWindow(this._gfSkillWindow);
};

Scene_Battle.prototype.gfSkillWindowRect = function() {
    const wh = this.calcWindowHeight(1, false);
    const wx =  Graphics.boxWidth / 4;
    const wy = ((Graphics.boxHeight - this._titleWindow.height) - wh) / 2;
    const ww = Graphics.boxWidth / 2;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_Battle.prototype.createTitleWindow = function() {
    const rect = this.titleWindowRect();
    this._titleWindow = new Window_Help(rect);
    this._titleWindow.close();
    this.addWindow(this._titleWindow);
};

Scene_Battle.prototype.titleWindowRect = function() {
    const ww = Graphics.boxWidth;
    const wh = this.calcWindowHeight(1, false);
    return new Rectangle(0, 0, ww, wh);
};

Scene_Battle.prototype.createVictoryItemWindow = function() {
    const rect = this.victoryWindowItemRect();
    this._victoryItemWindow = new Window_BattleVictoryItem(rect);
    this._victoryItemWindow.setHandler("ok", this.onVictoryItemOk.bind(this));
    this._victoryItemWindow.setHandler("cancel", this.onVictoryItemOk.bind(this));
    this._victoryItemWindow.setHelpWindow(this._helpWindow);
    this._victoryItemWindow.close();
    this.addWindow(this._victoryItemWindow);
};

Scene_Battle.prototype.victoryWindowItemRect = function() {
    const wy = this.calcWindowHeight(1, false);
    const wx = Graphics.boxWidth / 4;
    const ww = Graphics.boxWidth / 2;
    const wh = this.calcWindowHeight(1, false);
    return new Rectangle(wx, wy, ww, wh);
};

Scene_Battle.prototype.onApOk = function() {
    this._apWindow.close();
    const newSkills = [];
    const ap = BattleManager.rewards().ap;
    $gameParty.allBattleMembers().forEach(actor => {
       if (!actor.isDeathStateAffected()) {
           actor.gfs().forEach(equip => {
               const learning = $gameParty.currentLearning(equip.id);
               if (learning) {
                   const learn = equip.skills.find(skill => skill.name === learning.name);
                   if (learning.value + ap >= learn.ap) {
                       newSkills.push([equip, learning]);
                   }
               }
           });
       }
    });
    if (newSkills.length > 0) {
        this._gfSkillWindow.setNewSkills(newSkills);
    } else {
        this.onGFSkillOk();
    }
};

Scene_Battle.prototype.onExpOk = function() {
    if (this._expWindow.isDone()) {
        this._expWindow.close();
        const numItems = BattleManager.rewards().items.length;
        if (numItems > 0) {
            const wh2 = this._helpWindow.height;
            this._helpWindow.move(0, Graphics.boxHeight - wh2, Graphics.boxWidth, wh2);
            const wx = this._victoryItemWindow.x;
            const ww = this._victoryItemWindow.width;
            const wh = this.calcWindowHeight(numItems, true);
            const wy = ((Graphics.boxHeight - this._titleWindow.height) - wh) / 2;
            this._victoryItemWindow.move(wx, wy, ww, wh);
            this._titleWindow.setText(py06pd.VictoryScreen.vocabItemReceived);
            this._victoryItemWindow.select(0);
            this._victoryItemWindow.open();
            this._helpWindow.show();
        } else {
            this.onVictoryItemOk();
        }
    } else {
        this._expWindow.run();
    }
};

Scene_Battle.prototype.onGFSkillOk = function() {
    if (this._gfSkillWindow.isDone()) {
        this._titleWindow.close();
        this._gfSkillWindow.close();
        BattleManager.gainRewards();
        BattleManager.endBattle(0);
    } else {
        this._gfSkillWindow.nextSkill();
    }
};

Scene_Battle.prototype.onVictoryItemOk = function() {
    this._titleWindow.setText(py06pd.VictoryScreen.vocabRaisingGF);
    this._victoryItemWindow.close();
    this._helpWindow.close();
    this._apWindow.open();
};

//=============================================================================
// Window_BattleVictory
//=============================================================================

function Window_BattleVictory() {
    this.initialize(...arguments);
}

Window_BattleVictory.prototype = Object.create(Window_Base.prototype);
Window_BattleVictory.prototype.constructor = Window_BattleVictory;

Window_BattleVictory.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._handler = null;
    this._text = "";
};

Window_BattleVictory.prototype.drawItem = function() {
    const rect = this.baseTextRect();
    this.drawTextEx(this._text, rect.x, rect.y, rect.width);
};

Window_BattleVictory.prototype.open = function() {
    this.refresh();
    Window_Base.prototype.open.call(this);
};

Window_BattleVictory.prototype.setHandler = function(method) {
    this._handler = method;
};

Window_BattleVictory.prototype.refresh = function() {
    if (this.contents) {
        this.contents.clear();
        this.contentsBack.clear();
        this.drawItem();
    }
};

Window_BattleVictory.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (!this.isOpening() && !this.isClosing() && this.isOpen()) {
    }
    if (
        !this.isOpening() && !this.isClosing() && this.isOpen() && (
            Input.isRepeated("ok") ||
            Input.isRepeated("cancel") ||
            TouchInput.isRepeated())
    ) {
        this.playCursorSound();
        Input.update();
        TouchInput.update();
        this._handler();
    }
};

//=============================================================================
// Window_BattleVictoryAp
//=============================================================================

function Window_BattleVictoryAp() {
    this.initialize(...arguments);
}

Window_BattleVictoryAp.prototype = Object.create(Window_BattleVictory.prototype);
Window_BattleVictoryAp.prototype.constructor = Window_BattleVictoryAp;

Window_BattleVictoryAp.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
};

Window_BattleVictoryAp.prototype.refresh = function() {
    this._text = py06pd.VictoryScreen.vocabGFReceivedAP
        .format(BattleManager.rewards().ap);
    Window_BattleVictory.prototype.refresh.call(this);
};

//=============================================================================
// Window_BattleVictoryExp
//=============================================================================

function Window_BattleVictoryExp() {
    this.initialize(...arguments);
}

Window_BattleVictoryExp.prototype = Object.create(Window_StatusBase.prototype);
Window_BattleVictoryExp.prototype.constructor = Window_BattleVictoryExp;

Window_BattleVictoryExp.prototype.initialize = function(rect) {
    Window_StatusBase.prototype.initialize.call(this, rect);
    this._running = false;
    this._exp = 0;
};

Window_BattleVictoryExp.prototype.itemHeight = function() {
    return Math.floor(this.innerHeight / 3);
};

Window_BattleVictoryExp.prototype.maxItems = function() {
    return $gameParty.allBattleMembers().length;
};

Window_BattleVictoryExp.prototype.actor = function(index) {
    return $gameParty.allBattleMembers()[index];
};

Window_BattleVictoryExp.prototype.isDone = function() {
    return this._exp === BattleManager.rewards().exp;
};

Window_BattleVictoryExp.prototype.run = function() {
    if (this._running) {
        this._exp = BattleManager.rewards().exp;
        this._running = false;
    } else {
        this._running = true;
    }
};

Window_BattleVictoryExp.prototype.drawItem = function(index) {
    const actor = this.actor(index);
    const rect = this.itemRect(index);

    const x = rect.x + this.itemPadding();
    let y = rect.y + this.itemPadding();
    const width = rect.width - (this.itemPadding() * 2);
    const textWidth = this.textWidth(py06pd.VictoryScreen.vocabExpAcquired + " 000000");
    const offset = width - textWidth;
    if (actor.isDeathStateAffected()) {
        this.changePaintOpacity(actor.isDeathStateAffected());
        this.drawActorName(actor, x, y);
        this.changePaintOpacity(1);
        this.drawText(py06pd.VictoryScreen.vocabDidntReceiveExp, x, y, width, "center");
    } else {
        this.drawActorName(actor, x, y);
        this.drawText(py06pd.VictoryScreen.vocabExpAcquired, offset, y);
        const exp = actor.isDeathStateAffected() ?
            0 : (BattleManager.rewards().exp - this._exp);
        this.drawText(exp, offset, y, textWidth, "right");
    }
    y += this.lineHeight();
    const levelWidth = this.textWidth("Lv. 000");
    this.drawText(TextManager.levelA, x, y, levelWidth);
    this.drawText(actor.level, x, y, levelWidth, "right");
    this.drawText(py06pd.VictoryScreen.vocabCurrentExp, offset, y);
    const current = actor.isDeathStateAffected() ?
        actor.currentExp() : (actor.currentExp() + this._exp);
    this.drawText(current, offset, y, textWidth, "right");
    y += this.lineHeight();
    this.drawText(py06pd.VictoryScreen.vocabNextLevel, offset, y);
    const next = actor.isDeathStateAffected() ?
        actor.nextLevelExp() : (actor.nextLevelExp() - this._exp);
    this.drawText(next, offset, y, textWidth, "right");
};

Window_BattleVictoryExp.prototype.processOk = function() {
    this.playCursorSound();
    this.updateInputData();
    this.callOkHandler();
};

Window_BattleVictoryExp.prototype.processCancel = function() {
    this.processOk();
};

Window_BattleVictoryExp.prototype.update = function() {
    Window_StatusBase.prototype.update.call(this);
    if (this._running) {
        if (this._exp + 1 <= BattleManager.rewards().exp) {
            this._exp += 1;
            this.refresh();
        } else {
            this._running = false;
        }
    }
};

Window_BattleVictoryExp.prototype.open = function() {
    this.refresh();
    Window_StatusBase.prototype.open.call(this);
    this.activate();
};

//=============================================================================
// Window_BattleVictoryGFSkill
//=============================================================================

function Window_BattleVictoryGFSkill() {
    this.initialize(...arguments);
}

Window_BattleVictoryGFSkill.prototype = Object.create(Window_BattleVictory.prototype);
Window_BattleVictoryGFSkill.prototype.constructor = Window_BattleVictoryGFSkill;

Window_BattleVictoryGFSkill.prototype.initialize = function(rect) {
    Window_BattleVictory.prototype.initialize.call(this, rect);
    this._newSkills = [];
    this._index = -1;
};

Window_BattleVictoryGFSkill.prototype.isDone = function() {
    return this._index === -1 || this._index + 1 === this._newSkills.length;
};

Window_BattleVictoryGFSkill.prototype.nextSkill = function() {
    this._index = this._index + 1;
};

Window_BattleVictoryGFSkill.prototype.setNewSkills = function(newSkills) {
    this._newSkills = newSkills;
    this._index = 0;
    this.refresh();
    Window_Selectable.prototype.open.call(this);
    this.activate();
};

Window_BattleVictoryGFSkill.prototype.refresh = function() {
    const item = this._newSkills[this._index];
    this._text = py06pd.VictoryScreen.vocabGFLearnedSkill
        .format(item[0].name, item[1].name);
    Window_BattleVictory.prototype.refresh.call(this);
};

//=============================================================================
// Window_BattleVictoryItem
//=============================================================================

function Window_BattleVictoryItem() {
    this.initialize(...arguments);
}

Window_BattleVictoryItem.prototype = Object.create(Window_BaseList.prototype);
Window_BattleVictoryItem.prototype.constructor = Window_BattleVictoryItem;

Window_BattleVictoryItem.prototype.initialize = function(rect) {
    Window_BaseList.prototype.initialize.call(this, rect);
};

Window_BattleVictoryItem.prototype.makeItemList = function() {
    this._data = BattleManager.rewards().items;
};

Window_BattleVictoryItem.prototype.drawItem = function(index) {
    const item = this.itemAt(index);
    if (item) {
        const rect = this.itemLineRect(index);
        const numberWidth = this.textWidth("000");
        this.drawItemName(item.item, rect.x, rect.y, rect.width - numberWidth);
        this.drawText(":", rect.x, rect.y, rect.width - this.textWidth("00"), "right");
        this.drawText(item.amount, rect.x, rect.y, rect.width, "right");
    }
};

Window_BattleVictoryItem.prototype.processOk = function() {
    this.playCursorSound();
    this.updateInputData();
    this.callOkHandler();
};

Window_BattleVictoryItem.prototype.processCancel = function() {
    this.processOk();
};

Window_BattleVictoryItem.prototype.open = function() {
    this.refresh();
    Window_BaseList.prototype.open.call(this);
    this.activate();
};

Window_BattleVictoryItem.prototype.updateHelp = function() {
    this.setHelpWindowItem(this.item().item);
};
