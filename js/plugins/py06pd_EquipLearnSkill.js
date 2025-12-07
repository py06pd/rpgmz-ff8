//=============================================================================
// RPG Maker MZ - Equip Learn Skill
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Equip Learn Skill
 * @author Peter Dawson
 *
 * @help py06pd_EquipLearnSkill.js
 *
 */

var py06pd = py06pd || {};
py06pd.EquipLearnSkill = py06pd.EquipLearnSkill || {};

py06pd.EquipLearnSkill.learnedIcon = 87;
py06pd.EquipLearnSkill.vocabGFAbilities = "GF Abilities";
py06pd.EquipLearnSkill.vocabJunctionGF = "Junction GF";
py06pd.EquipLearnSkill.vocabObtainAp = "%1 AP received!";

(function() {

//=============================================================================
// BattleManager
//=============================================================================

    py06pd.EquipLearnSkill.DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        if (!py06pd.EquipLearnSkill.DataManager_isDatabaseLoaded.call(this)) {
            return false;
        }
        if (!py06pd.EquipLearnSkill.DatabaseLoaded) {
            $dataArmors.forEach(item => {
                if (item) {
                    item.skills = py06pd.Utils.ReadJsonNote(item, 'skills', []);
                }
            });
            $dataEnemies.forEach(item => {
                if (item) {
                    item.ap = py06pd.Utils.ReadJsonNote(item, 'ap', 0);
                }
            });

            py06pd.EquipLearnSkill.DatabaseLoaded = true;
        }

        return true;
    };

//=============================================================================
// BattleManager
//=============================================================================

    py06pd.EquipLearnSkill.BattleManager_gainRewards = BattleManager.gainRewards;
    BattleManager.gainRewards = function() {
        py06pd.EquipLearnSkill.BattleManager_gainRewards.call(this);
        this.gainAp();
    };

    py06pd.EquipLearnSkill.BattleManager_makeRewards = BattleManager.makeRewards;
    BattleManager.makeRewards = function() {
        py06pd.EquipLearnSkill.BattleManager_makeRewards.call(this);
        this._rewards.ap = $gameTroop.apTotal();
    };

    py06pd.EquipLearnSkill.BattleManager_displayRewards = BattleManager.displayRewards;
    BattleManager.displayRewards = function() {
        py06pd.EquipLearnSkill.BattleManager_displayRewards.call(this);
        this.displayAp();
    };

//=============================================================================
// Game_Actor
//=============================================================================

    py06pd.EquipLearnSkill.Game_Actor_initEquips = Game_Actor.prototype.initEquips;
    Game_Actor.prototype.initEquips = function(equips) {
        py06pd.EquipLearnSkill.Game_Actor_initEquips.call(this, equips);
        this.armors().forEach(equip => {
            $gameParty.addGF(equip.id);
        });
    };

    py06pd.EquipLearnSkill.Game_Actor_skills = Game_Actor.prototype.skills;
    Game_Actor.prototype.skills = function() {
        const skills = py06pd.EquipLearnSkill.Game_Actor_skills.call(this);
        this.gfSkills().forEach(skill => {
            const found = $dataSkills.find(s => s && s.name === skill.name);
            if (found) {
                skills.push(found);
            }
        });
        return skills;
    };

//=============================================================================
// Game_Party
//=============================================================================

    py06pd.EquipLearnSkill.Game_Party_initMembers = Game_Party.prototype.initAllItems;
    Game_Party.prototype.initAllItems = function() {
        py06pd.EquipLearnSkill.Game_Party_initMembers.call(this);
        this._learningSkills = [];
    };

//=============================================================================
// Scene_Equip
//=============================================================================

    py06pd.EquipLearnSkill.Scene_Equip_create = Scene_Equip.prototype.create;
    Scene_Equip.prototype.create = function() {
        py06pd.EquipLearnSkill.Scene_Equip_create.call(this);
        this.createSkillWindow();
        this.refreshActor();
    };

    py06pd.EquipLearnSkill.Scene_Equip_createCommandWindow = Scene_Equip.prototype.createCommandWindow;
    Scene_Equip.prototype.createCommandWindow = function() {
        py06pd.EquipLearnSkill.Scene_Equip_createCommandWindow.call(this);
        this._commandWindow.setHandler("ability", this.commandEquip.bind(this));
    };

    py06pd.EquipLearnSkill.Scene_Equip_createSlotWindow = Scene_Equip.prototype.createSlotWindow;
    Scene_Equip.prototype.createSlotWindow = function() {
        const rect = this.slotWindowRect();
        this._slotWindow = new Window_GFSlot(rect);
        this._slotWindow.setHelpWindow(this._helpWindow);
        this._slotWindow.setHandler("ok", this.onSlotOk.bind(this));
        this._slotWindow.setHandler("cancel", this.onSlotCancel.bind(this));
        this.addWindow(this._slotWindow);
    };

    py06pd.EquipLearnSkill.Scene_Equip_onSlotOk = Scene_Equip.prototype.onSlotOk;
    Scene_Equip.prototype.onSlotOk = function() {
        this._slotWindow.hide();
        if (this._commandWindow.currentSymbol() === "ability") {
            this._skillWindow.setSlotId(this._slotWindow.index() + 1);
            this._skillWindow.show();
            this._skillWindow.activate();
            this._skillWindow.select(0);
        } else {
            this._itemWindow.setSlotId(this._slotWindow.index() + 1);
            this._itemWindow.show();
            this._itemWindow.activate();
            this._itemWindow.select(0);
        }
    };

    py06pd.EquipLearnSkill.Scene_Equip_hideItemWindow = Scene_Equip.prototype.hideItemWindow;
    Scene_Equip.prototype.hideItemWindow = function() {
        py06pd.EquipLearnSkill.Scene_Equip_hideItemWindow.call(this);
        if (this._skillWindow) {
            this._skillWindow.hide();
            this._skillWindow.deselect();
        }
    };

    py06pd.EquipLearnSkill.Scene_Equip_refreshActor = Scene_Equip.prototype.refreshActor;
    Scene_Equip.prototype.refreshActor = function() {
        py06pd.EquipLearnSkill.Scene_Equip_refreshActor.call(this);
        if (this._skillWindow) {
            this._skillWindow.setActor(this.actor());
        }
    };

    py06pd.EquipLearnSkill.Scene_Equip_executeEquipChange = Scene_Equip.prototype.executeEquipChange;
    Scene_Equip.prototype.executeEquipChange = function() {
        const actor = this.actor();
        const slotId = this._slotWindow.index() + 1;
        const item = this._itemWindow.item();
        actor.changeEquip(slotId, item);
    };

//=============================================================================
// Window_EquipCommand
//=============================================================================

    py06pd.EquipLearnSkill.Window_EquipCommand_maxCols = Window_EquipCommand.prototype.maxCols;
    Window_EquipCommand.prototype.maxCols = function() {
        return 2;
    };

    py06pd.EquipLearnSkill.Window_EquipCommand_makeCommandList = Window_EquipCommand.prototype.makeCommandList;
    Window_EquipCommand.prototype.makeCommandList = function() {
        this.addCommand(py06pd.EquipLearnSkill.vocabJunctionGF, "equip");
        this.addCommand(py06pd.EquipLearnSkill.vocabGFAbilities, "ability");
    };

//=============================================================================
// Window_EquipItem
//=============================================================================

    py06pd.EquipLearnSkill.Window_EquipItem_drawIcon = Window_EquipItem.prototype.drawIcon;
    Window_EquipItem.prototype.drawIcon = function(iconIndex, x, y) {
    };

    py06pd.EquipLearnSkill.Window_EquipItem_needsNumber = Window_EquipItem.prototype.needsNumber;
    Window_EquipItem.prototype.needsNumber = function() {
        return false;
    };

})(); // IIFE

//=============================================================================
// BattleManager
//=============================================================================

BattleManager.displayAp = function() {
    const ap = this._rewards.ap;
    if (ap > 0) {
        $gameMessage.add("\\." + py06pd.EquipLearnSkill.vocabObtainAp.format(ap));
    }
};

BattleManager.gainAp = function() {
    $gameParty.gainAp(this._rewards.ap);
};

//=============================================================================
// Game_Actor
//=============================================================================

Game_Actor.prototype.gfSkills = function() {
    const skills = [];
    this.armors().forEach(equip => {
        equip.skills.forEach(s => {
            if (this.isLearnedSkill(equip.id, s.name)) {
                skills.push(s.name);
            }
        });
    });
    return skills;
};

//=============================================================================
// Game_Party
//=============================================================================

Game_Party.prototype.addGF = function(id) {
    this.startLearningNext(id);
};

Game_Party.prototype.canLearn = function(id, name) {
    const skill = $dataArmors[id].skills.find(skill => skill.name === name);
    return !this.learnedSkill(id, skill.name) &&
        (!skill.require || this.learnedSkill(id, skill.require));
};

Game_Party.prototype.gainAp = function(ap) {
    this._learningSkills.filter(gf => gf.active).map(gf => gf.id).forEach(id => {
        let skillAp = ap;
        while (skillAp > 0) {
            const learn = this._learningSkills.find(gf => gf.id === id && gf.active);
            if (learn) {
                const max = $dataArmors[id].skills.find(skill => skill.name === learn.name).ap;
                const used = Math.min(skillAp, max - learn.value);
                learn.value = learn.value + used;
                skillAp = skillAp - used;
                if (this.learnedSkill(id, learn.name)) {
                    this.startLearningNext(id);
                }
            } else {
                skillAp = 0;
            }
        }
    });
};

Game_Party.prototype.isLearning = function(id, name) {
    return this._learningSkills.some(gf => gf.id === id && gf.name === name && gf.active);
};

Game_Party.prototype.learnedSkill = function(id, name) {
    const skill = $dataArmors[id].skills.find(skill => skill.name === name);
    if (!skill.ap) {
        return true;
    }

    const learn = this._learningSkills.find(gf => gf.id === id && gf.name === name);
    return learn && learn.value >= skill.ap;
};

Game_Party.prototype.learnProgress = function(id, name) {
    const learn = this._learningSkills.find(gf => gf.id === id && gf.name === name);
    return learn ? learn.value : 0;
};

Game_Party.prototype.startLearning = function(id, name) {
    const active = this._learningSkills.find(gf => gf.id === id && gf.active);
    if (active) {
        active.active = false;
    }
    const learn = this._learningSkills.find(gf => gf.id === id && gf.name === name);
    if (learn) {
        learn.active = true;
    } else {
        this._learningSkills.push({ id, name, value: 0, active: true });
    }
};

Game_Party.prototype.startLearningNext = function(id) {
    let initialSkill;
    $dataArmors[id].skills.forEach((skill) => {
        if (
            skill.ap > 0 && this.canLearn(id, skill.name) &&
            (!initialSkill || skill.ap < initialSkill.ap)
        ) {
            initialSkill = { name: skill.name, ap: skill.ap };
        }
    });
    if (initialSkill) {
        this.startLearning(id, initialSkill.name);
    }
};

//=============================================================================
// Game_Troop
//=============================================================================

Game_Troop.prototype.apTotal = function() {
    const members = this.deadMembers();
    return members.reduce((r, enemy) => r + enemy.enemy().ap, 0);
};

//=============================================================================
// Scene_Equip
//=============================================================================

Scene_Equip.prototype.createSkillWindow = function() {
    const rect = this.skillWindowRect();
    this._skillWindow = new Window_EquipSkills(rect);
    this._skillWindow.setHelpWindow(this._helpWindow);
    this._skillWindow.setHandler("ok", this.onSkillOk.bind(this));
    this._skillWindow.setHandler("cancel", this.onItemCancel.bind(this));
    this._skillWindow.hide();
    this.addWindow(this._skillWindow);
};

Scene_Equip.prototype.skillWindowRect = function() {
    return this.slotWindowRect();
};

Scene_Equip.prototype.onSkillOk = function() {
    SoundManager.playEquip();
    const item = this._skillWindow.item();
    $gameParty.startLearning(this._slotWindow.item().id, item.name);
    this._skillWindow.refresh();
    this._skillWindow.activate();
};

//=============================================================================
// Window_EquipSkills
//=============================================================================

function Window_EquipSkills() {
    this.initialize(...arguments);
}

Window_EquipSkills.prototype = Object.create(Window_ItemList.prototype);
Window_EquipSkills.prototype.constructor = Window_EquipSkills;

Window_EquipSkills.prototype.initialize = function(rect) {
    Window_ItemList.prototype.initialize.call(this, rect);
    this._actor = null;
    this._slotId = 0;
};

Window_EquipSkills.prototype.maxCols = function() {
    return 1;
};

Window_EquipSkills.prototype.colSpacing = function() {
    return 8;
};

Window_EquipSkills.prototype.setActor = function(actor) {
    if (this._actor !== actor) {
        this._actor = actor;
        this.refresh();
        this.scrollTo(0, 0);
    }
};

Window_EquipSkills.prototype.setSlotId = function(slotId) {
    if (this._slotId !== slotId) {
        this._slotId = slotId;
        this.refresh();
        this.scrollTo(0, 0);
    }
};

Window_EquipSkills.prototype.includes = function(item) {
    const id = this._actor.equips()[this._slotId]?.id;
    return $gameParty.learnedSkill(id, item.name) || $gameParty.canLearn(id, item.name);
};

Window_EquipSkills.prototype.etypeId = function() {
    if (this._actor && this._slotId >= 0) {
        return this._actor.equipSlots()[this._slotId];
    } else {
        return 0;
    }
};

Window_EquipSkills.prototype.isEnabled = function(item) {
    const equip = this._actor.equips()[this._slotId];
    if (equip) {
        return !$gameParty.learnedSkill(equip.id, item.name);
    }

    return false;
};

Window_EquipSkills.prototype.updateHelp = function() {
    this.setHelpWindowItem(this.item() && this.item().description ? this.item() : null);
};

Window_EquipSkills.prototype.makeItemList = function() {
    this._data = [];
    const item = this._actor.equips()[this._slotId];
    if (item && item.skills) {
        this._data = item.skills.map(skill => {
            const found = $dataSkills.find(s => s && s.name === skill.name);
            if (found) {
                return found;
            }

            return $dataStates.find(s => s && s.name === skill.name);
        }).filter(skill => this.includes(skill));
    }
};

Window_EquipSkills.prototype.changePaintOpacity = function(enabled) {
    this.contents.paintOpacity = 255;
};

Window_EquipSkills.prototype.drawItemName = function(item, x, y, width) {
    if (item) {
        const iconY = y + (this.lineHeight() - ImageManager.iconHeight) / 2;
        const textMargin = ImageManager.iconWidth + 4;
        const itemWidth = Math.max(0, width - textMargin);
        this.resetTextColor();
        const id = this._actor.equips()[this._slotId]?.id;
        if (item && $gameParty.isLearning(id, item.name)) {
            this.drawIcon(item.iconIndex, x, iconY);
        }
        this.drawText(item.name, x + textMargin, y, itemWidth);
    }
};

Window_EquipSkills.prototype.numberWidth = function() {
    return this.textWidth("000/000");
};

Window_EquipSkills.prototype.drawItemNumber = function(item, x, y, width) {
    const equip = this._actor.equips()[this._slotId];
    if ($gameParty.learnedSkill(equip.id, item.name)) {
        y = y + ((this.lineHeight() - ImageManager.iconHeight) / 2);
        this.drawIcon(py06pd.EquipLearnSkill.learnedIcon, x + width - ImageManager.iconWidth, y)
    } else {
        const maxAp = equip.skills.find(skill => skill.name === item.name).ap;
        const text = $gameParty.learnProgress(equip.id, item.name) + "/" + maxAp;
        this.drawText(text, x, y, width, "right");
    }
};

//=============================================================================
// Window_EquipSlot
//=============================================================================

function Window_GFSlot() {
    this.initialize(...arguments);
}

Window_GFSlot.prototype = Object.create(Window_ItemList.prototype);
Window_GFSlot.prototype.constructor = Window_EquipSlot;

Window_GFSlot.prototype.initialize = function(rect) {
    Window_ItemList.prototype.initialize.call(this, rect);
    this._actor = null;
    this.refresh();
};

Window_GFSlot.prototype.maxCols = function() {
    return 1;
};

Window_GFSlot.prototype.colSpacing = function() {
    return 8;
};

Window_GFSlot.prototype.setActor = function(actor) {
    if (this._actor !== actor) {
        this._actor = actor;
        this.refresh();
    }
};

Window_GFSlot.prototype.makeItemList = function() {
    this._data = this._actor ? this._actor.armors() : [];
};

Window_GFSlot.prototype.drawItem = function(index) {
    if (this._actor) {
        const item = this.itemAt(index);
        if (item) {
            this.resetTextColor();
            const rect = this.itemLineRect(index);
            this.drawText(item.name, rect.x, rect.y, rect.width);
        }
    }
};

Window_GFSlot.prototype.isCurrentItemEnabled = function() {
    return true;
};

Window_GFSlot.prototype.setItemWindow = function(itemWindow) {
};
