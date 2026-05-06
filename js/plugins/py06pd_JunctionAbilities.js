//=============================================================================
// RPG Maker MZ - Junction Abilities
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Junction commands and support abilities for actors.
 * @author Peter Dawson
 *
 * @help Requires py06pd_JunctionMagic
 * Requires py06pd_SupportAbilities
 *
 * Use json data for note in $dataSkills for bonus magic gives to the param it
 * is junctioned to.
 * {
 *   "supportSlots": <max slots for support abilities>
 * }
 *
 * @param commandSkillType
 * @type number
 * @text Id of skill type for command skills
 * @default 1
 *
 * @param vocabJunction
 * @text Label for junction magic option
 * @default Junction
 *
 * @param vocabAbility
 * @text Label for junction abilities option
 * @default Ability
 *
 * @param vocabCommand
 * @text Label for command ability slot
 * @default Command
 *
 * @param vocabSupport
 * @text Label for character/party abilities option
 * @default Ability
 */

var py06pd = py06pd || {};
py06pd.JunctionAbilities = py06pd.JunctionAbilities || {};

(function() {

    const params = PluginManager.parameters('py06pd_JunctionAbilities');
    py06pd.JunctionAbilities.commandSkillType = Number(params.commandSkillType || 1);
    py06pd.JunctionAbilities.vocabJunction = params.vocabJunction || 'Junction';
    py06pd.JunctionAbilities.vocabAbility = params.vocabAbility || 'Ability';
    py06pd.JunctionAbilities.vocabCommand = params.vocabCommand || 'Command';
    py06pd.JunctionAbilities.vocabSupport = params.vocabSupport || 'Ability';

//=============================================================================
// DataManager
//=============================================================================

    py06pd.JunctionAbilities.DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        if (py06pd.JunctionAbilities.DataManager_isDatabaseLoaded.call(this)) {
            $dataSkills.forEach(skill => {
                if (skill) {
                    const data = py06pd.Utils.ReadJsonNote(skill, 'JunctionAbilities', {});
                    skill.supportSlots = data.supportSlots ?? 0;
                }
            });

            return true;
        }

        return false;
    };

//=============================================================================
// Game_Actor
//=============================================================================

    py06pd.JunctionAbilities.Game_Actor_initMembers =  Game_Actor.prototype.initMembers;
    Game_Actor.prototype.initMembers = function() {
        py06pd.JunctionAbilities.Game_Actor_initMembers.call(this);
        this._commandSlots = [1, "Magic", "Draw", "Item"];
        this._supportSlots = [0, 0, 0, 0];
    };

//=============================================================================
// Scene_JunctionMagic
//=============================================================================

    py06pd.JunctionAbilities.Scene_JunctionMagic_create = Scene_JunctionMagic.prototype.create;
    Scene_JunctionMagic.prototype.create = function() {
        py06pd.JunctionAbilities.Scene_JunctionMagic_create.call(this);
        this.createCommandWindow();
        this.createAbilityWindow();
        this.createAbilitySlotWindow();
    };

    py06pd.JunctionAbilities.Scene_JunctionMagic_refreshActor = Scene_JunctionMagic.prototype.refreshActor;
    Scene_JunctionMagic.prototype.refreshActor = function() {
        py06pd.JunctionAbilities.Scene_JunctionMagic_refreshActor.call(this);
        const actor = this.actor();
        this._abilityWindow.setActor(actor);
        this._abilitySlotWindow.setActor(actor);
        this._statusParamsWindow.deselect();
        this._statusParamsWindow.deactivate();
        this._abilitySlotWindow.hide();
        this._abilityWindow.hide();
        this._commandWindow.activate();
    };
})();

//=============================================================================
// Game_Actor
//=============================================================================

Game_Actor.prototype.commandSlots = function() {
    return this._commandSlots;
};

Game_Actor.prototype.supportSlots = function() {
    return this._supportSlots;
};

Game_Actor.prototype.setCommandSlot = function(index, id) {
    this._commandSlots[index] = id;
};

Game_Actor.prototype.setSupportSlot = function(index, id) {
    this._supportSlots[index] = id;
};

//=============================================================================
// Scene_JunctionMagic
//=============================================================================

Scene_JunctionMagic.prototype.createAbilityWindow = function() {
    const rect = this.abilityWindowRect();
    this._abilityWindow = new Window_JunctionAbility(rect);
    this._abilityWindow.setHandler("ok", this.onAbilityOk.bind(this));
    this._abilityWindow.setHandler("cancel", this.onAbilityCancel.bind(this));
    this.addWindow(this._abilityWindow);
    this._abilityWindow.hide();
};

Scene_JunctionMagic.prototype.abilityWindowRect = function() {
    const wx = Graphics.boxWidth / 2;
    const wh = this.calcWindowHeight(8, true);
    const wy = Graphics.boxHeight - wh;
    const ww = Graphics.boxWidth / 2;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_JunctionMagic.prototype.createAbilitySlotWindow = function() {
    const rect = this.abilitySlotWindowRect();
    this._abilitySlotWindow = new Window_JunctionAbilitySlot(rect);
    this._abilitySlotWindow.setHandler("ok", this.onSlotOk.bind(this));
    this._abilitySlotWindow.setHandler("cancel", this.onSlotCancel.bind(this));
    this.addWindow(this._abilitySlotWindow);
    this._abilitySlotWindow.hide();
};

Scene_JunctionMagic.prototype.abilitySlotWindowRect = function() {
    const wh = this.calcWindowHeight(8, true);
    const wy = Graphics.boxHeight - wh;
    const ww = Graphics.boxWidth / 2;
    return new Rectangle(0, wy, ww, wh);
};

Scene_JunctionMagic.prototype.createCommandWindow = function() {
    const rect = this.commandWindowRect();
    this._commandWindow = new Window_JunctionCommand(rect);
    this._commandWindow.setHelpWindow(this._helpWindow);
    this._commandWindow.setHandler("magic", this.commandMagic.bind(this));
    this._commandWindow.setHandler("ability", this.commandAbility.bind(this));
    this._commandWindow.setHandler("cancel", this.popScene.bind(this));
    this._commandWindow.setHandler("pagedown", this.nextActor.bind(this));
    this._commandWindow.setHandler("pageup", this.previousActor.bind(this));
    this.addWindow(this._commandWindow);
    this._statusWindow.y = this.mainAreaTop() + rect.height;
    this._statusWindow.height = this.statusParamsWindowRect().y - this._statusWindow.y;
};

Scene_JunctionMagic.prototype.commandWindowRect = function() {
    const wy = this.mainAreaTop();
    const ww = Graphics.boxWidth;
    const wh = this.calcWindowHeight(1, true);
    return new Rectangle(0, wy, ww, wh);
};

Scene_JunctionMagic.prototype.commandMagic = function() {
    this._statusParamsWindow.activate();
    this._statusParamsWindow.select(0);
};

Scene_JunctionMagic.prototype.commandAbility = function() {
    this._abilitySlotWindow.show();
    this._abilitySlotWindow.activate();
    this._abilitySlotWindow.select(0);
};

Scene_JunctionMagic.prototype.onSlotOk = function() {
    this._abilityWindow.open(this._abilitySlotWindow.index());
};

Scene_JunctionMagic.prototype.onSlotCancel = function() {
    this._commandWindow.activate();
    this._abilitySlotWindow.hide();
};

Scene_JunctionMagic.prototype.onAbilityOk = function() {
    if (this._abilitySlotWindow.index() < 4) {
        this._actor.setCommandSlot(
            this._abilitySlotWindow.index(),
            this._abilityWindow.item().id > 0 ?
                this._abilityWindow.item().id :
                this._abilityWindow.item().name);
    } else if (this._abilityWindow.item()) {
        this._actor.setSupportSlot(
            this._abilitySlotWindow.index() - 4,
            this._abilityWindow.item().id);
    }

    this._abilityWindow.hide();
    this._abilitySlotWindow.refresh();
    this._abilitySlotWindow.activate();
};

Scene_JunctionMagic.prototype.onAbilityCancel = function() {
    this._abilitySlotWindow.activate();
    this._abilityWindow.hide();
};

//=============================================================================
// Window_JunctionAbilitySlot
//=============================================================================

function Window_JunctionAbility() {
    this.initialize(...arguments);
}

Window_JunctionAbility.prototype = Object.create(Window_Selectable.prototype);
Window_JunctionAbility.prototype.constructor = Window_JunctionAbility;

Window_JunctionAbility.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this._actor = null;
    this._data = [];
    this._slotIndex = 0;
};

Window_JunctionAbility.prototype.setActor = function(actor) {
    if (this._actor !== actor) {
        this._actor = actor;
        this.refresh();
    }
};

Window_JunctionAbility.prototype.maxItems = function() {
    return this._data.length;
};

Window_JunctionAbility.prototype.item = function() {
    return this.itemAt(this.index());
};

Window_JunctionAbility.prototype.itemAt = function(index) {
    return this._data[index];
};

Window_JunctionAbility.prototype.drawItem = function(index) {
    if (this._actor) {
        const item = this.itemAt(index);
        if (item) {
            const rect = this.itemLineRect(index);
            this.changeTextColor(ColorManager.systemColor());
            this.changePaintOpacity(this.isEnabled(index));
            this.drawItemName(item, rect.x, rect.y, rect.width);
            this.changePaintOpacity(true);
        }
    }
};

Window_JunctionAbility.prototype.isEnabled = function(index) {
    return true;
};

Window_JunctionAbility.prototype.isCurrentItemEnabled = function() {
    return this.isEnabled(this.index());
};

Window_JunctionAbility.prototype.makeItemList = function() {
    if (this._slotIndex < 4) {
        const options = [
            { id: 0, name: "Magic", iconIndex: 0 },
            { id: 0, name: "Item", iconIndex: 0 },
            { id: 0, name: "Draw", iconIndex: 0 },
            { id: 0, name: "GF", iconIndex: 0 }
        ];

        this._actor.gfSkills().forEach(skillName => {
            const skill = $dataSkills.find(s => s &&
                s.stypeId === py06pd.JunctionAbilities.commandSkillType &&
                s.name === skillName);
            if (skill) {
                options.push(skill);
            }
        });
        this._data = options.filter(opt =>
            !this._actor.commandSlots().includes(opt.id) &&
            !this._actor.commandSlots().includes(opt.name));
    } else {
        const options = [];
        this._actor.gfSkills().forEach(skillName => {
            const found = $dataStates.find(s => s && s.name === skillName);
            if (found && found.characterAbility) {
                options.push(found);
            }
        });
        this._data = options.filter(opt =>
            !this._actor.supportSlots().includes(opt.id));
    }
};

Window_JunctionAbility.prototype.open = function(slotIndex) {
    this._slotIndex = slotIndex;
    this.refresh();
    this.show();
    this.select(0);
    this.activate();
};

Window_JunctionAbility.prototype.refresh = function() {
    this.makeItemList();
    Window_Selectable.prototype.refresh.call(this);
};

//=============================================================================
// Window_JunctionAbilitySlot
//=============================================================================

function Window_JunctionAbilitySlot() {
    this.initialize(...arguments);
}

Window_JunctionAbilitySlot.prototype = Object.create(Window_Selectable.prototype);
Window_JunctionAbilitySlot.prototype.constructor = Window_JunctionAbilitySlot;

Window_JunctionAbilitySlot.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this._actor = null;
    this._data = [];
};

Window_JunctionAbilitySlot.prototype.setActor = function(actor) {
    if (this._actor !== actor) {
        this._actor = actor;
        this.refresh();
    }
};

Window_JunctionAbilitySlot.prototype.maxItems = function() {
    let slots = 2;
    this._actor.gfSkills().forEach(skillName => {
        const found = $dataSkills.find(s => s && s.name === skillName);
        if (found && found.supportSlots && found.supportSlots > slots) {
            slots = found.supportSlots;
        }
    });
    return slots + 4;
};

Window_JunctionAbilitySlot.prototype.item = function() {
    return this.itemAt(this.index());
};

Window_JunctionAbilitySlot.prototype.itemAt = function(index) {
    return this._data[index];
};

Window_JunctionAbilitySlot.prototype.drawItem = function(index) {
    if (this._actor) {
        const item = this.itemAt(index);
        const rect = this.itemLineRect(index);
        this.changeTextColor(ColorManager.systemColor());
        this.changePaintOpacity(this.isEnabled(index));
        const slotName = index < 4 ? py06pd.JunctionAbilities.vocabCommand :
            py06pd.JunctionAbilities.vocabSupport;

        const slotNameWidth = this.slotNameWidth();
        this.drawText(slotName, rect.x, rect.y, slotNameWidth, rect.height);
        if (item) {
            this.drawItemName(item, rect.x + slotNameWidth, rect.y, rect.width - slotNameWidth);
        }
        this.changePaintOpacity(true);
    }
};

Window_JunctionAbilitySlot.prototype.slotNameWidth = function() {
    return 138;
};

Window_JunctionAbilitySlot.prototype.isEnabled = function(index) {
    return index > 0;
};

Window_JunctionAbilitySlot.prototype.isCurrentItemEnabled = function() {
    return this.isEnabled(this.index());
};

Window_JunctionAbilitySlot.prototype.makeItemList = function() {
    this._data = this._actor.commandSlots().map(slot => {
        if (["Magic", "Item", "Draw", "GF"].includes(slot)) {
            return { id: 0, name: slot, iconIndex: 0 };
        }

        if (slot) {
            return { id: slot, name: $dataSkills[slot].name, iconIndex: 0 };
        }

        return null;
    }).concat(this._actor.supportSlots().map(slot => {
        if (slot) {
            return { id: slot, name: $dataStates[slot].name, iconIndex: 0 };
        }

        return null;
    }));
};

Window_JunctionAbilitySlot.prototype.refresh = function() {
    this.makeItemList();
    Window_Selectable.prototype.refresh.call(this);
};

//=============================================================================
// Window_JunctionCommand
//=============================================================================

function Window_JunctionCommand() {
    this.initialize(...arguments);
}

Window_JunctionCommand.prototype = Object.create(Window_HorzCommand.prototype);
Window_JunctionCommand.prototype.constructor = Window_JunctionCommand;

Window_JunctionCommand.prototype.initialize = function(rect) {
    Window_HorzCommand.prototype.initialize.call(this, rect);
};

Window_JunctionCommand.prototype.maxCols = function() {
    return 2;
};

Window_JunctionCommand.prototype.makeCommandList = function() {
    this.addCommand(py06pd.JunctionAbilities.vocabJunction, "magic");
    this.addCommand(py06pd.JunctionAbilities.vocabAbility, "ability");
};
