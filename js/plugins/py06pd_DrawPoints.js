//=============================================================================
// RPG Maker MZ - Draw Points
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Draw points.
 * @author Peter Dawson
 *
 * Requires py06pd_MagicStock plugin
 *
 * @help py06pd_DrawPoints.js
 *
 * @param resetStepCount
 * @text Steps after which 50% chance to refill 50% of draw point stock
 * @default 10240
 *
 * @param vocabDrawPointIntro1
 * @text Found a draw point text
 * @default Found a draw point!
 *
 * @param vocabDrawPointIntro2
 * @text Found magic text
 * @default %1 found.
 *
 * @param vocabDrawPointIntro3
 * @text Who will draw text
 * @default Who will draw?
 *
 * @param vocabDrawResult
 * @text Draw result text
 * @default %1 stocked %2 %3
 *
 * @param vocabDontDraw
 * @text Don't draw option text
 * @default Don't draw
 *
 * @param vocabEmptyDrawPoint
 * @text Empty draw point text
 * @default Empty
 *
 */

var py06pd = py06pd || {};
py06pd.DrawPoints = py06pd.DrawPoints || {};

(function() {

    const params = PluginManager.parameters('py06pd_DrawPoints');
    py06pd.DrawPoints.resetStepCount = Number(params.resetStepCount || 10240);
    py06pd.DrawPoints.vocabDefaults = {
        'vocabDrawPointIntro1': "Found a draw point!",
        'vocabDrawPointIntro2':  "%1 found.",
        'vocabDrawPointIntro3': "Who will draw?",
        'vocabEmptyDrawPoint': "Empty",
        'vocabDrawResult': "%1 stocked %2 %3",
        'vocabDontDraw': "Don't draw"
    };
    Object.keys(py06pd.DrawPoints.vocabDefaults).forEach(key => {
        py06pd.DrawPoints[key] = params[key] || py06pd.DrawPoints.vocabDefaults[key];
    });

//=============================================================================
// Game_Party
//=============================================================================

    py06pd.DrawPoints.Game_Party_initialize = Game_Party.prototype.initialize;
    Game_Party.prototype.initialize = function() {
        py06pd.DrawPoints.Game_Party_initialize.call(this);
        this._drawPoints = {};
    };

    py06pd.DrawPoints.Game_Party_increaseSteps = Game_Party.prototype.increaseSteps;
    Game_Party.prototype.increaseSteps = function() {
        py06pd.DrawPoints.Game_Party_increaseSteps.call(this);
        if ((this._steps % py06pd.DrawPoints.resetStepCount) === 0) {
            Object.values(this._drawPoints).forEach(p => p.restock());
        }
    };

})();

//=============================================================================
// Game_Party
//=============================================================================

Game_Party.prototype.addDrawPoint = function(id, point) {
    this._drawPoints[id] = point;
};

Game_Party.prototype.drawPoint = function(id) {
    return this._drawPoints[id];
};

//=============================================================================
// Game_DrawPoint
//=============================================================================

function Game_DrawPoint() {
    this.initialize(...arguments);
}

Game_DrawPoint.prototype.initialize = function(skillId, rich, refills) {
    this._stock = 2;
    this._skillId = skillId;
    this._rich = rich;
    this._refills = refills;
};

Game_DrawPoint.prototype.drawAmount = function() {
    return Math.floor((((Math.randomInt(256) + 128) * this.drawMod()) / 512) + 1);
};

Game_DrawPoint.prototype.drawMod = function() {
    return (this._rich ? 20 : 10) * (this._stock / 2);
};

Game_DrawPoint.prototype.executeDraw = function(actor, amount) {
    actor.addMagicStock(this._skillId, amount);
    this._stock = 0;
};

Game_DrawPoint.prototype.canDraw = function() {
    return this._stock > 0;
};

Game_DrawPoint.prototype.skillId = function() {
    return this._skillId;
};

Game_DrawPoint.prototype.restock = function() {
    if (this._refills && this._stock < 2 && Math.randomInt(2) === 1) {
        this._stock++;
    }
};

//=============================================================================
// Scene_DrawPoint
//=============================================================================

function Scene_DrawPoint() {
    this.initialize(...arguments);
}

Scene_DrawPoint.prototype = Object.create(Scene_MenuBase.prototype);
Scene_DrawPoint.prototype.constructor = Scene_DrawPoint;

Scene_DrawPoint.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_DrawPoint.prototype.helpAreaHeight = function() {
    return 0;
};

Scene_DrawPoint.prototype.prepare = function(skillName, rich, refills) {
    const mapId = $gameMap.mapId();
    const eventId = $gameMap._interpreter.eventId();
    const id = mapId + "|" + eventId;
    const skill = $dataSkills.find(s => s && s.name === skillName);
    let point = $gameParty.drawPoint(id);
    if (!point) {
        point = new Game_DrawPoint(skill.id, rich, refills);
        $gameParty.addDrawPoint(id, point);
    }
    this._point = point;
};

Scene_DrawPoint.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createMessageWindow();
    this.createChoiceWindow();
};

Scene_DrawPoint.prototype.createMessageWindow = function() {
    const rect = this.messageWindowRect();
    const messageWindow = new Window_DrawPointMessage(rect);
    messageWindow.setHandler("ok", this.onMessageOk.bind(this));
    this.addWindow(messageWindow);
    this._messageWindow = messageWindow;
    if (this._point.canDraw()) {
        const skill = $dataSkills[this._point.skillId()];
        this._messageWindow.setText([
            py06pd.DrawPoints.vocabDrawPointIntro1,
            py06pd.DrawPoints.vocabDrawPointIntro2.format(skill.name),
            py06pd.DrawPoints.vocabDrawPointIntro3,
        ]);
    } else {
        this._messageWindow.setText([py06pd.DrawPoints.vocabEmptyDrawPoint]);
    }
};

Scene_DrawPoint.prototype.messageWindowRect = function() {
    const ww = Graphics.boxWidth;
    const wh = this.calcWindowHeight(3, true);
    return new Rectangle(0, 0, ww, wh);
};

Scene_DrawPoint.prototype.createChoiceWindow = function() {
    const rect = this.choiceWindowRect();
    this._choicesWindow = new Window_DrawPointChoices(rect);
    this._choicesWindow.setSkill(this._point.skillId());
    this._choicesWindow.setHandler("ok", this.onChoiceOk.bind(this));
    this._choicesWindow.setHandler("cancel", this.popScene.bind(this));
    this._choicesWindow.close();
    this.addWindow(this._choicesWindow);
};

Scene_DrawPoint.prototype.choiceWindowRect = function() {
    const ww = this.mainCommandWidth();
    const wx = Graphics.boxWidth - ww - 8;
    const wh = this.calcWindowHeight($gameParty.battleMembers().length + 1, true);
    const wy = (Graphics.boxHeight - wh) / 2;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_DrawPoint.prototype.onMessageOk = function() {
    if (this._point.canDraw()) {
        this._messageWindow.close();
        this._choicesWindow.open();
    } else {
        this.popScene();
    }
};

Scene_DrawPoint.prototype.onChoiceOk = function() {
    if (this._choicesWindow.index() === 0) {
        this.popScene();
    } else {
        const actor = $gameParty.battleMembers()[this._choicesWindow.index() - 1];
        const amount = this._point.drawAmount();
        const skill = $dataSkills[this._point.skillId()];
        this._point.executeDraw(actor, amount);
        this._choicesWindow.close();
        this._messageWindow.setText([
            py06pd.DrawPoints.vocabDrawResult.format(actor.name(), amount, skill.name)
        ]);
    }
};

//=============================================================================
// Window_DrawPointMessage
//=============================================================================

function Window_DrawPointMessage() {
    this.initialize(...arguments);
}

Window_DrawPointMessage.prototype = Object.create(Window_Selectable.prototype);
Window_DrawPointMessage.prototype.constructor = Window_DrawPointMessage;

Window_DrawPointMessage.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this.setBackgroundType(1);
    this._text = [];
};

Window_DrawPointMessage.prototype.colSpacing = function() {
    return 0;
};

Window_DrawPointMessage.prototype.refresh = function() {
    const rect = this.itemLineRect(0);
    const x = rect.x;
    const y = rect.y;
    const width = rect.width;
    this.contents.clear();
    this._text.forEach((line, index) => {
        this.drawText(line, x, y + (index * this.lineHeight()), width);
    });
};

Window_DrawPointMessage.prototype.setText = function(text) {
    this._text = text;
    this.refresh();
    this.open();
    this.activate();
};

//=============================================================================
// Window_DrawPointChoices
//=============================================================================

function Window_DrawPointChoices() {
    this.initialize(...arguments);
}

Window_DrawPointChoices.prototype = Object.create(Window_Selectable.prototype);
Window_DrawPointChoices.prototype.constructor = Window_DrawPointChoices;

Window_DrawPointChoices.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this.setBackgroundType(1);
    this._skillId = null;
};

Window_DrawPointChoices.prototype.setSkill = function(skillId) {
    this._skillId = skillId;
};

Window_DrawPointChoices.prototype.colSpacing = function() {
    return 0;
};

Window_DrawPointChoices.prototype.maxItems = function() {
    return $gameParty.battleMembers().length + 1;
};

Window_DrawPointChoices.prototype.drawItem = function(index) {
    const rect = this.itemLineRect(index);
    if (index === 0) {
        this.drawText(py06pd.DrawPoints.vocabDontDraw, rect.x, rect.y, rect.width);
    } else {
        const actor = $gameParty.battleMembers()[index - 1];
        const textWidth = rect.width - 8 - ImageManager.iconWidth;
        this.drawText(actor.name(), rect.x, rect.y, textWidth);

        if (py06pd.JunctionMagic && actor.isEquippedMagic(this._skillId)) {
            const iconY = (this.lineHeight() - ImageManager.iconHeight) / 2;
            this.drawIcon(py06pd.JunctionMagic.equippedIcon, textWidth + 8, rect.y + iconY);
        }
    }
};

Window_DrawPointChoices.prototype.open = function() {
    this.refresh();
    this.select(0);
    this.activate();
    Window_Selectable.prototype.open.call(this);
};
