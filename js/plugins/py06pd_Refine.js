//=============================================================================
// RPG Maker MZ - Refine magic / items from menu
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Refine magic / items from menu.
 * @author Peter Dawson
 *
 * @help Requires py06pd_MagicStock.js
 *
 * Use json data for note in $dataSkills for refine mappings.
 * {
 *   "from": "<type of input object ie. "item" or "magic">",
 *   "to": "<type of output object ie. "item" or "magic">",
 *   "items": [
 *     {
 *       "from": "<name of input object>",
 *       "fromAmount": <amount of input object required, 1 if not specified>,
 *       "to": "<name of output object>",
 *       "toAmount": <amount of output object produced, 1 if not specified>
 *     },
 *     ...
 *   ]
 * }
 *
 * @param menuSkillTypeId
 * @type number
 * @text Skill type id for menu commands
 * @default 4
 *
 * @param vocabRefineItem
 * @text Refine help text
 * @default %1 will refine into %2 %3s
 *
 * @param vocabRefineMenuOption
 * @text Label for menu option for refine commands
 * @default Ability
 */

var py06pd = py06pd || {};
py06pd.Refine = py06pd.Refine || {};

py06pd.Refine.vocabRefineMenuOption = "Ability";

(function() {

    const params = PluginManager.parameters('py06pd_Refine');
    py06pd.Refine.menuSkillTypeId = Number(params.menuSkillTypeId || 4);
    py06pd.Refine.vocabRefineItem = params.vocabRefineItem || '%1 will refine into %2 %3s';
    py06pd.Refine.vocabRefineMenuOption = params.vocabRefineMenuOption || 'Ability';

//=============================================================================
// DataManager
//=============================================================================

    py06pd.Refine.DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        if (py06pd.Refine.DataManager_isDatabaseLoaded.call(this)) {
            $dataSkills.forEach(item => {
                if (item) {
                    const data = py06pd.Utils.ReadJsonNote(item, 'Refine', {});
                    item.refineFrom = data.from;
                    item.refineTo = data.to;
                    item.refineItems = data.items;
                }
            });

            return true;
        }

        return false;
    };

//=============================================================================
// Scene_Menu
//=============================================================================

    py06pd.Refine.Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
    Scene_Menu.prototype.createCommandWindow = function() {
        py06pd.Refine.Scene_Menu_createCommandWindow.call(this);
        this._commandWindow.setHandler("refine", this.commandRefine.bind(this));
    };

//=============================================================================
// Window_MenuCommand
//=============================================================================

    py06pd.Refine.Window_MenuCommand_addMainCommands = Window_MenuCommand.prototype.addMainCommands;
    Window_MenuCommand.prototype.addMainCommands = function() {
        py06pd.Refine.Window_MenuCommand_addMainCommands.call(this);
        this.addCommand(py06pd.Refine.vocabRefineMenuOption, "refine", true);
    };

})();

//=============================================================================
// Scene_Menu
//=============================================================================

Scene_Menu.prototype.commandRefine = function() {
    SceneManager.push(Scene_Refine);
};

//=============================================================================
// Scene_Refine
//=============================================================================

function Scene_Refine() {
    this.initialize(...arguments);
}

Scene_Refine.prototype = Object.create(Scene_Base.prototype);
Scene_Refine.prototype.constructor = Scene_Refine;

Scene_Refine.prototype.initialize = function() {
    Scene_Base.prototype.initialize.call(this);
};

Scene_Refine.prototype.create = function() {
    Scene_Base.prototype.create.call(this);
    this.createBackground();
    this.createWindowLayer();
    this.createSkillsWindow();
    this.createHelpWindow();
    this.createActorWindow();
    this.createInputWindow();
    this.createOutputWindow();
};

Scene_Refine.prototype.createBackground = function() {
    this._backgroundFilter = new PIXI.filters.BlurFilter();
    this._backgroundSprite = new Sprite();
    this._backgroundSprite.bitmap = SceneManager.backgroundBitmap();
    this._backgroundSprite.filters = [this._backgroundFilter];
    this.addChild(this._backgroundSprite);
    this.setBackgroundOpacity(192);
};

Scene_Refine.prototype.setBackgroundOpacity = function(opacity) {
    this._backgroundSprite.opacity = opacity;
};

Scene_Refine.prototype.createHelpWindow = function() {
    const rect = this.helpWindowRect();
    this._helpWindow = new Window_Help(rect);
    this._helpWindow.close();
    this.addWindow(this._helpWindow);
};

Scene_Refine.prototype.helpWindowRect = function() {
    const wx = 0;
    const wh = this.calcWindowHeight(1, false);
    const wy = Graphics.boxHeight - wh;
    const ww = Graphics.boxWidth;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_Refine.prototype.createSkillsWindow = function() {
    const rect = this.skillsWindowRect();
    this._skillsWindow = new Window_RefineSkills(rect);
    this._skillsWindow.setHandler("ok", this.commandSkill.bind(this));
    this._skillsWindow.setHandler("cancel", this.popScene.bind(this));
    this._skillsWindow.select(0);
    this._skillsWindow.activate();
    this.addWindow(this._skillsWindow);
};

Scene_Refine.prototype.skillsWindowRect = function() {
    const wx = 0;
    const wy = 0;
    const ww = Graphics.boxWidth / 3;
    const wh = Graphics.boxHeight;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_Refine.prototype.createActorWindow = function() {
    const rect = this.actorWindowRect();
    this._actorsWindow = new Window_RefineActors(rect);
    this._actorsWindow.setHandler("ok", this.onActorOk.bind(this));
    this._actorsWindow.setHandler("cancel", this.onActorCancel.bind(this));
    this._actorsWindow.close();
    this.addWindow(this._actorsWindow);
};

Scene_Refine.prototype.actorWindowRect = function() {
    const wx = this._skillsWindow.x + this._skillsWindow.width;
    const wy = 0;
    const ww = Graphics.boxWidth - this._skillsWindow.width;
    const wh = this.calcWindowHeight(6, true);
    return new Rectangle(wx, wy, ww, wh);
};

Scene_Refine.prototype.createInputWindow = function() {
    const rect = this.inputWindowRect();
    this._inputWindow = new Window_RefineInput(rect);
    this._inputWindow.setHandler("ok", this.onRefineOk.bind(this));
    this._inputWindow.setHandler("cancel", this.onRefineCancel.bind(this));
    this._inputWindow.setHelpWindow(this._helpWindow);
    this._inputWindow.close();
    this.addWindow(this._inputWindow);
};

Scene_Refine.prototype.inputWindowRect = function() {
    const wx = 0;
    const wy = this._actorsWindow.y + this._actorsWindow.height;
    const ww = Graphics.boxWidth / 2;
    const wh = Graphics.boxHeight - wy - this._helpWindow.height;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_Refine.prototype.createOutputWindow = function() {
    const rect = this.outputWindowRect();
    this._outputWindow = new Window_RefineOutput(rect);
    this._outputWindow.close();
    this._inputWindow.setOutputWindow(this._outputWindow);
    this.addWindow(this._outputWindow);
};

Scene_Refine.prototype.outputWindowRect = function() {
    const wx = this._inputWindow.x + this._inputWindow.width;
    const wy = this._actorsWindow.y + this._actorsWindow.height;
    const ww = Graphics.boxWidth / 2;
    const wh = Graphics.boxHeight - wy - this._helpWindow.height;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_Refine.prototype.commandSkill = function() {
    const skill = this._skillsWindow.item();
    if (skill.refineFrom === "magic" || skill.refineTo === "magic") {
        this._actorsWindow.open();
        this._actorsWindow.activate();
        this._actorsWindow.select(0);
    } else {
        this._inputWindow.setSkill(skill);
        this._outputWindow.open();
        this._helpWindow.open();
    }
};

Scene_Refine.prototype.onActorOk = function() {
    const actor = this._actorsWindow.item();
    const skill = this._skillsWindow.item();
    this._inputWindow.setSkill(skill, actor);
    this._outputWindow.open();
    this._helpWindow.open();
};

Scene_Refine.prototype.onActorCancel = function() {
    this._actorsWindow.close();
    this._skillsWindow.activate();
};

Scene_Refine.prototype.onRefineOk = function() {
    const skill = this._skillsWindow.item();
    const from = this._inputWindow.item();
    const data = skill.refineItems.find(i => i.from === from.name);
    if (skill.refineFrom === "magic") {
        this._actorsWindow.item().addMagicStock(from.id, -(data.fromAmount ?? 1));
    }
    if (skill.refineFrom === "item") {
        $gameParty.gainItem(from, -(data.fromAmount ?? 1));
    }
    if (skill.refineTo === "magic") {
        const to = $dataSkills.find(i => i && i.name === data.to);
        this._actorsWindow.item().addMagicStock(to.id, data.toAmount ?? 1);
    }
    if (skill.refineTo === "item") {
        const to = $dataItems.find(i => i && i.name === data.to);
        $gameParty.gainItem(to, data.toAmount ?? 1);
    }

    this._inputWindow.refresh();
    this._outputWindow.refresh();
    this._inputWindow.activate();
};

Scene_Refine.prototype.onRefineCancel = function() {
    this._inputWindow.close();
    this._outputWindow.close();
    this._helpWindow.close();
    const skill = this._skillsWindow.item();
    if (skill.refineFrom === "magic" || skill.refineTo === "magic") {
        this._actorsWindow.activate();
    } else {
        this._skillsWindow.activate();
    }
};

//=============================================================================
// Window_RefineActors
//=============================================================================

function Window_RefineActors() {
    this.initialize(...arguments);
}

Window_RefineActors.prototype = Object.create(Window_BaseList.prototype);
Window_RefineActors.prototype.constructor = Window_RefineActors;

Window_RefineActors.prototype.initialize = function(rect) {
    Window_BaseList.prototype.initialize.call(this, rect);
    this.refresh();
};

Window_RefineActors.prototype.makeItemList = function() {
    this._data = $gameParty.allMembers().map(actor => actor);
};

Window_RefineActors.prototype.drawItem = function(index) {
    const actor = this.itemAt(index);
    if (actor) {
        const rect = this.itemLineRect(index);
        this.changePaintOpacity(this.isEnabled(actor));
        this.drawText(actor.name(), rect.x, rect.y, rect.width);
        this.changePaintOpacity(1);
    }
};

//=============================================================================
// Window_RefineItems
//=============================================================================

function Window_RefineInput() {
    this.initialize(...arguments);
}

Window_RefineInput.prototype = Object.create(Window_BaseList.prototype);
Window_RefineInput.prototype.constructor = Window_RefineInput;

Window_RefineInput.prototype.initialize = function(rect) {
    Window_BaseList.prototype.initialize.call(this, rect);
    this._actor = null;
    this._skill = null;
};

Window_RefineInput.prototype.setSkill = function(skill, actor) {
    this._actor = actor;
    this._skill = skill;
    this.refresh();
    this.open();
    this.activate();
    this.select(0);
};

Window_RefineInput.prototype.isEnabled = function(item) {
    if (item) {
        const data = this._skill.refineItems.find(i => i.from === item.name);
        const amount = data.fromAmount ?? 1;
        if (this.fromAmount(item) < amount) {
            return false;
        }

        const to = this.toItem(data);
        if (this._skill.refineTo === "item") {
            if ($gameParty.numItems(to) === $gameParty.maxItems(to)) {
                return false;
            }
        }
        if (this._skill.refineTo === "magic") {
            if (this._actor.magicStock(to.id) === this._actor.maxMagicStock(to.id)) {
                return false;
            }
        }

        return true;
    }

    return false;
};

Window_RefineInput.prototype.fromAmount = function(item) {
    if (this._skill.refineFrom === "item") {
        return $gameParty.numItems(item);
    }
    if (this._skill.refineFrom === "magic") {
        return this._actor.magicStock(item.id);
    }

    return 0;
};

Window_RefineInput.prototype.toItem = function(data) {
    if (this._skill.refineTo === "item") {
        return $dataItems.find(i => i && i.name === data.to);
    }

    return $dataSkills.find(i => i && i.name === data.to);
};

Window_RefineInput.prototype.makeItemList = function() {
    this._data = [];
    if (this._skill && this._skill.refineFrom === "item") {
        $gameParty.items().forEach(item => {
           if (this._skill.refineItems.some(i => i.from === item.name)) {
               this._data.push(item);
           }
        });
    }
    if (this._skill && this._skill.refineFrom === "magic") {
        $dataSkills.filter(item => item && item.stypeId === py06pd.MagicStock.magicTypeId)
            .forEach(item => {
                if (
                    this._skill.refineItems.some(i => i.from === item.name) &&
                    this._actor.magicStock(item.id) > 0
                ) {
                    this._data.push(item);
                }
            });
    }
};

Window_RefineInput.prototype.drawItem = function(index) {
    const skill = this.itemAt(index);
    if (skill) {
        const numberWidth = this.numberWidth();
        const rect = this.itemLineRect(index);
        this.changePaintOpacity(this.isEnabled(skill));
        this.drawItemName(skill, rect.x, rect.y, rect.width - numberWidth);
        this.drawItemNumber(skill, rect.x, rect.y, rect.width);
        this.changePaintOpacity(1);
    }
};

Window_RefineInput.prototype.numberWidth = function() {
    return this.textWidth("000");
};

Window_RefineInput.prototype.drawItemNumber = function(item, x, y, width) {
    this.drawText(":", x, y, width - this.textWidth("00"), "right");
    this.drawText(this.fromAmount(item), x, y, width, "right");
};

Window_RefineInput.prototype.setOutputWindow = function(window) {
    this._outputWindow = window;
};

Window_RefineInput.prototype.updateHelp = function() {
    Window_BaseList.prototype.updateHelp.call(this);
    if (this.item()) {
        const data = this._skill.refineItems.find(i => i.from === this.item().name);
        const fromAmount = data.fromAmount ?? 1;
        const toAmount = data.toAmount ?? 1;
        this._helpWindow.setText(py06pd.Refine.vocabRefineItem.format(fromAmount, toAmount, data.to));
        this._outputWindow.setItem(this.toItem(data), this._actor);
    }
};

//=============================================================================
// Window_RefineOutput
//=============================================================================

function Window_RefineOutput() {
    this.initialize(...arguments);
}

Window_RefineOutput.prototype = Object.create(Window_Base.prototype);
Window_RefineOutput.prototype.constructor = Window_RefineOutput;

Window_RefineOutput.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._actor = null;
    this._item = null;
};

Window_RefineOutput.prototype.toAmount = function(item) {
    if ($dataItems.includes(item)) {
        return $gameParty.numItems(item);
    }

    return this._actor.magicStock(item.id);
};

Window_RefineOutput.prototype.setItem = function(item, actor) {
    this._actor = actor;
    this._item = item;
    this.refresh();
};

Window_RefineOutput.prototype.numberWidth = function() {
    return this.textWidth("000");
};

Window_RefineOutput.prototype.drawItemNumber = function(item, x, y, width) {
    this.drawText(":", x, y, width - this.textWidth("00"), "right");
    this.drawText(this.toAmount(item), x, y, width, "right");
};

Window_RefineOutput.prototype.refresh = function() {
    if (this.contents) {
        this.contents.clear();
        this.contentsBack.clear();
        const numberWidth = this.numberWidth();
        const rect = this.baseTextRect();
        this.drawItemName(this._item, rect.x, rect.y, rect.width - numberWidth);
        this.drawItemNumber(this._item, rect.x, rect.y, rect.width);
    }
};

//=============================================================================
// Window_RefineSkills
//=============================================================================

function Window_RefineSkills() {
    this.initialize(...arguments);
}

Window_RefineSkills.prototype = Object.create(Window_BaseList.prototype);
Window_RefineSkills.prototype.constructor = Window_RefineSkills;

Window_RefineSkills.prototype.initialize = function(rect) {
    Window_BaseList.prototype.initialize.call(this, rect);
    this.refresh();
};

Window_RefineSkills.prototype.makeItemList = function() {
    this._data = [];
    $gameParty.allBattleMembers().forEach(member => {
        member.gfSkills().forEach(skillName => {
            const found = $dataSkills.find(s => s && s.name === skillName &&
                s.stypeId === py06pd.Refine.menuSkillTypeId);
            if (found) {
                this._data.push(found);
            }
        });
    });
};

Window_RefineSkills.prototype.drawItem = function(index) {
    const skill = this.itemAt(index);
    if (skill) {
        const rect = this.itemLineRect(index);
        this.changePaintOpacity(this.isEnabled(skill));
        this.drawItemName(skill, rect.x, rect.y, rect.width);
        this.changePaintOpacity(1);
    }
};
