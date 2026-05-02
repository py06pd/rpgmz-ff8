//=============================================================================
// RPG Maker MZ - Junction Magic
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Junction magic to params.
 * @author Peter Dawson
 *
 * Requires py06pd_MagicStock plugin
 *
 * @help py06pd_JunctionMagic.js
 *
 * Use json data for note in $dataSkills for bonus magic gives to the param it
 * is junctioned to.
 * {
 *   "paramPlus": [
 *     <mhp bonus>,
 *     <mmp bonus (does nothing)>,
 *     <atk bonus>,
 *     <def bonus>,
 *     <mat bonus>,
 *     <mdf bonus>,
 *     <agi bonus>,
 *     <luk bonus>
 *   ],
 *   "xparamPlus": [
 *     <hit bonus>,
 *     <eva bonus>
 *   ]
 * }
 *
 * Use json data for note in $dataSkills to indicate which skill enables
 * junctioning magic to the param.
 * {
 *   "junction": "<param key eg. mhp, atk>"
 * }
 *
 * @param equippedIcon
 * @text Icon to display in skill list when magic is equipped to params
 * @default 160
 *
 * @param vocabATK
 * @text Abbreviation for assignment option for attack in status screen
 * @default Str
 *
 * @param vocabDEF
 * @text Abbreviation for assignment option for defence in status screen
 * @default Vit
 *
 * @param vocabMAT
 * @text Abbreviation for assignment option for magic attack in status screen
 * @default Mag
 *
 * @param vocabMDF
 * @text Abbreviation for assignment option for magic defence in status screen
 * @default Spr
 *
 * @param vocabAGI
 * @text Abbreviation for assignment option for agility in status screen
 * @default Spd
 *
 * @param vocabEVA
 * @text Abbreviation for assignment option for evasion in status screen
 * @default Eva
 *
 * @param vocabHIT
 * @text Abbreviation for assignment option for hit in status screen
 * @default Hit
 *
 * @param vocabLUK
 * @text Abbreviation for assignment option for luck in status screen
 * @default Luck
 *
 */

var py06pd = py06pd || {};
py06pd.JunctionMagic = py06pd.JunctionMagic || {};

(function() {

    const params = PluginManager.parameters('py06pd_JunctionMagic');
    py06pd.JunctionMagic.equippedIcon = Number(params.equippedIcon || 160);
    py06pd.JunctionMagic.vocabATK = params.vocabATK || 'Str';
    py06pd.JunctionMagic.vocabDEF = params.vocabDEF || 'Vit';
    py06pd.JunctionMagic.vocabMAT = params.vocabMAT || 'Mag';
    py06pd.JunctionMagic.vocabMDF = params.vocabMDF || 'Spr';
    py06pd.JunctionMagic.vocabAGI = params.vocabAGI || 'Spd';
    py06pd.JunctionMagic.vocabEVA = params.vocabEVA || 'Eva';
    py06pd.JunctionMagic.vocabHIT = params.vocabHIT || 'Hit';
    py06pd.JunctionMagic.vocabLUK = params.vocabLUK || 'Luck';

//=============================================================================
// BattleManager
//=============================================================================

    py06pd.JunctionMagic.DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        if (py06pd.JunctionMagic.DataManager_isDatabaseLoaded.call(this)) {
            $dataSkills.forEach(skill => {
                if (skill) {
                    const data = py06pd.Utils.ReadJsonNote(skill, 'JunctionMagic', {});
                    skill.paramPlus = data.paramPlus ?? [0,0,0,0,0,0,0,0];
                    skill.xparamPlus = data.xparamPlus ?? [0,0];
                    skill.junction = data.junction;
                }
            });

            return true;
        }

        return false;
    };

//=============================================================================
// Game_Actor
//=============================================================================

    py06pd.JunctionMagic.Game_Actor_initMembers =  Game_Actor.prototype.initMembers;
    Game_Actor.prototype.initMembers = function() {
        py06pd.JunctionMagic.Game_Actor_initMembers.call(this);
        this._paramMagic = [0, 0, 0, 0, 0, 0, 0, 0];
        this._xparamMagic = [0, 0];
    };

    py06pd.JunctionMagic.Game_Actor_paramPlus =  Game_Actor.prototype.paramPlus;
    Game_Actor.prototype.paramPlus = function(paramId) {
        const magic = this._paramMagic[paramId];
        const plus = magic ? $dataSkills[magic].paramPlus[paramId] * this.magicStock(magic) : 0;
        return py06pd.JunctionMagic.Game_Actor_paramPlus.call(this, paramId) + plus;
    };

    py06pd.JunctionMagic.Game_Actor_xparam =  Game_Actor.prototype.xparam;
    Game_Actor.prototype.xparam = function(paramId) {
        const magic = this._xparamMagic[paramId];
        const plus = magic ? $dataSkills[magic].xparamPlus[paramId] * this.magicStock(magic) / 100 : 0;
        return py06pd.JunctionMagic.Game_Actor_xparam.call(this, paramId) + plus;
    };

//=============================================================================
// Scene_Menu
//=============================================================================

    py06pd.JunctionMagic.Scene_Menu_onPersonalOk = Scene_Menu.prototype.onPersonalOk;
    Scene_Menu.prototype.onPersonalOk = function() {
        if (this._commandWindow.currentSymbol() === "status") {
            SceneManager.push(Scene_JunctionMagic);
        } else {
            py06pd.JunctionMagic.Scene_Menu_onPersonalOk.call(this);
        }
    };

//=============================================================================
// Window_SkillList
//=============================================================================

    py06pd.JunctionMagic.Window_SkillList_drawItem = Window_SkillList.prototype.drawItem;
    Window_SkillList.prototype.drawItem = function(index) {
        const skill = this.itemAt(index);
        if (skill) {
            const costWidth = this.costWidth();
            const iconWidth = 8 + ImageManager.iconWidth;
            const rect = this.itemLineRect(index);
            this.changePaintOpacity(this.isEnabled(skill));
            this.drawItemName(skill, rect.x, rect.y, rect.width - costWidth - iconWidth);
            this.drawSkillCost(skill, rect.x, rect.y, rect.width - iconWidth);
            this.drawEquippedIcon(skill, rect.width + 8 - iconWidth, rect.y);
            this.changePaintOpacity(1);
        }
    };

})();

//=============================================================================
// Game_Actor
//=============================================================================

Game_Actor.prototype.equippedMagic = function(type, index) {
    if (type === 'xparam') {
        return this._xparamMagic[index];
    }

    return this._paramMagic[index];
};

Game_Actor.prototype.equipMagic = function(type, index, skillId) {
    if (this._paramMagic.includes(skillId)) {
        this._paramMagic.splice(this._paramMagic.indexOf(skillId), 1);
    }
    if (this._xparamMagic.includes(skillId)) {
        this._xparamMagic.splice(this._xparamMagic.indexOf(skillId), 1);
    }

    if (type === 'xparam') {
        this._xparamMagic[index] = skillId;
    } else {
        this._paramMagic[index] = skillId;
    }
};

Game_Actor.prototype.isEquippedMagic = function(skillId) {
    return this._paramMagic.includes(skillId) ||
        this._xparamMagic.includes(skillId);
};

//=============================================================================
// Scene_JunctionMagic
//=============================================================================

function Scene_JunctionMagic() {
    this.initialize(...arguments);
}

Scene_JunctionMagic.prototype = Object.create(Scene_MenuBase.prototype);
Scene_JunctionMagic.prototype.constructor = Scene_JunctionMagic;

Scene_JunctionMagic.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_JunctionMagic.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createProfileWindow();
    this.createStatusWindow();
    this.createStatusParamsWindow();
    this.createHelpWindow();
    this.createMagicWindow();
};

Scene_JunctionMagic.prototype.helpAreaHeight = function() {
    return 0;
};

Scene_JunctionMagic.prototype.createProfileWindow = function() {
    const rect = this.profileWindowRect();
    this._profileWindow = new Window_Help(rect);
    this.addWindow(this._profileWindow);
};

Scene_JunctionMagic.prototype.profileWindowRect = function() {
    const ww = Graphics.boxWidth;
    const wh = this.profileHeight();
    const wx = 0;
    const wy = this.mainAreaBottom() - wh;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_JunctionMagic.prototype.createStatusWindow = function() {
    const rect = this.statusWindowRect();
    this._statusWindow = new Window_JunctionMagicStatus(rect);
    this._statusWindow.setHandler("cancel", this.popScene.bind(this));
    this._statusWindow.setHandler("pagedown", this.nextActor.bind(this));
    this._statusWindow.setHandler("pageup", this.previousActor.bind(this));
    this.addWindow(this._statusWindow);
};

Scene_JunctionMagic.prototype.statusWindowRect = function() {
    const wx = 0;
    const wy = this.mainAreaTop();
    const ww = Graphics.boxWidth;
    const wh = this.statusParamsWindowRect().y - wy;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_JunctionMagic.prototype.createStatusParamsWindow = function() {
    const rect = this.statusParamsWindowRect();
    this._statusParamsWindow = new Window_JunctionMagicParams(rect);
    this.addWindow(this._statusParamsWindow);
};

Scene_JunctionMagic.prototype.statusParamsWindowRect = function() {
    const typeWindowHeight = this.calcWindowHeight(1, true);
    const ww = Graphics.boxWidth;
    const wh = this.statusParamsHeight() - (typeWindowHeight / 2);
    const wx = 0;
    const wy = this.mainAreaBottom() - this.profileHeight() - wh;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_JunctionMagic.prototype.statusParamsHeight = function() {
    return this.calcWindowHeight(6, false);
};

Scene_JunctionMagic.prototype.profileHeight = function() {
    return this.calcWindowHeight(2, false);
};

Scene_JunctionMagic.prototype.start = function() {
    Scene_MenuBase.prototype.start.call(this);
    this.refreshActor();
};

Scene_JunctionMagic.prototype.needsPageButtons = function() {
    return true;
};

Scene_JunctionMagic.prototype.refreshActor = function() {
    const actor = this.actor();
    this._profileWindow.setText(actor.profile());
    this._statusWindow.setActor(actor);
    this._statusParamsWindow.setActor(actor);

    this._magicWindow.setActor(actor);
    this._statusParamsWindow.select(0);
    this._statusParamsWindow.activate();
};

Scene_JunctionMagic.prototype.onActorChange = function() {
    Scene_MenuBase.prototype.onActorChange.call(this);
    this.refreshActor();
    this._statusWindow.activate();
};

Scene_JunctionMagic.prototype.createMagicWindow = function() {
    const rect = this.magicWindowRect();
    this._magicWindow = new Window_JunctionMagic(rect);
    this._magicWindow.setStypeId(py06pd.MagicStock.magicTypeId);
    this._magicWindow.setHandler("ok", this.onMagicOk.bind(this));
    this._magicWindow.setHandler("cancel", this.onMagicCancel.bind(this));
    this._magicWindow.setHelpWindow(this._helpWindow);
    this._magicWindow.setParamsWindow(this._statusParamsWindow);
    this._statusWindow.deactivate();
    this._statusParamsWindow.setHandler("ok", this.onParamsOk.bind(this));
    this._statusParamsWindow.setHandler("cancel", this.popScene.bind(this));
    this.addWindow(this._magicWindow);
};

Scene_JunctionMagic.prototype.magicWindowRect = function() {
    const ww = Graphics.boxWidth - 300;
    const wh = this.statusParamsHeight();
    const wx = 300;
    const wy = this.mainAreaTop();
    return new Rectangle(wx, wy, ww, wh);
};

Scene_JunctionMagic.prototype.onParamsOk = function() {
    const item = this._statusParamsWindow.item();
    this._statusParamsWindow.deactivate();
    this._magicWindow.open(item.type, item.id);
};

Scene_JunctionMagic.prototype.onMagicOk = function() {
    const skill = this._magicWindow.item();
    const param = this._statusParamsWindow.item();
    this.actor().equipMagic(param.type, param.id, skill ? skill.id : null);
    this.hideMagicWindow();
    this._statusParamsWindow.refresh();
};

Scene_JunctionMagic.prototype.onMagicCancel = function() {
    this.hideMagicWindow();
};

Scene_JunctionMagic.prototype.hideMagicWindow = function() {
    this._magicWindow.hide();
    this._magicWindow.deactivate();
    this._statusParamsWindow.setTempActor(null);
    this._statusParamsWindow.activate();
};

//=============================================================================
// Window_JunctionMagicStatus
//=============================================================================

function Window_JunctionMagicStatus() {
    this.initialize(...arguments);
}

Window_JunctionMagicStatus.prototype = Object.create(Window_StatusBase.prototype);
Window_JunctionMagicStatus.prototype.constructor = Window_JunctionMagicStatus;

Window_JunctionMagicStatus.prototype.initialize = function(rect) {
    Window_StatusBase.prototype.initialize.call(this, rect);
    this._actor = null;
    this.refresh();
    this.activate();
};

Window_JunctionMagicStatus.prototype.setActor = function(actor) {
    if (this._actor !== actor) {
        this._actor = actor;
        this.refresh();
    }
};

Window_JunctionMagicStatus.prototype.refresh = function() {
    Window_StatusBase.prototype.refresh.call(this);
    if (this._actor) {
        this.drawActorName(this._actor, 192, 0, 168);
        this.drawActorFace(this._actor, 0, 0);
        const lineHeight = this.lineHeight();
        this.drawActorIcons(this._actor, 192, lineHeight * 1);
        this.placeGauge(this._actor, "hp", 192, lineHeight * 2);
        this.drawExpInfo(456, 0);
    }
};

Window_JunctionMagicStatus.prototype.drawExpInfo = function(x, y) {
    const lineHeight = this.lineHeight();
    const data = [
        { label:TextManager.levelA, value: this._actor.level },
        { label: TextManager.expTotal.format(TextManager.exp), value: this.expTotalValue() },
        { label: TextManager.expNext.format(TextManager.level), value: this.expNextValue() }
    ];

    data.forEach((line, index) => {
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(line.label, x, y + lineHeight * (index + 1), 270);
        this.resetTextColor();
        this.drawText(line.value, x, y + lineHeight * (index + 1), 270, "right");
    });
};

Window_JunctionMagicStatus.prototype.expTotalValue = function() {
    if (this._actor.isMaxLevel()) {
        return "-------";
    } else {
        return this._actor.currentExp();
    }
};

Window_JunctionMagicStatus.prototype.expNextValue = function() {
    if (this._actor.isMaxLevel()) {
        return "-------";
    } else {
        return this._actor.nextRequiredExp();
    }
};

//=============================================================================
// Window_JunctionMagicParams
//=============================================================================

function Window_JunctionMagicParams() {
    this.initialize(...arguments);
}

Window_JunctionMagicParams.prototype = Object.create(Window_StatusBase.prototype);
Window_JunctionMagicParams.prototype.constructor = Window_JunctionMagicParams;

Window_JunctionMagicParams.prototype.initialize = function(rect) {
    Window_StatusBase.prototype.initialize.call(this, rect);
    this._actor = null;
    this._tempActor = null;
    this._data = [];
};

Window_JunctionMagicParams.prototype.setActor = function(actor) {
    if (this._actor !== actor) {
        this._actor = actor;
        this.refresh();
    }
};

Window_JunctionMagicParams.prototype.maxCols = function() {
    return 2;
};

Window_JunctionMagicParams.prototype.maxItems = function() {
    return this._data.length;
};

Window_JunctionMagicParams.prototype.itemHeight = function() {
    return this.lineHeight();
};

Window_JunctionMagicParams.prototype.drawItem = function(index) {
    const rect = this.itemLineRect(index);
    const paramId = index + 2;
    const name = TextManager.param(paramId);
    const value = this._actor.param(paramId);
    this.changeTextColor(ColorManager.systemColor());
    this.drawText(name, rect.x, rect.y, 160);
    this.resetTextColor();
    this.drawText(value, rect.x + 160, rect.y, 60, "right");
};

Window_JunctionMagicParams.prototype.drawItemBackground = function(/*index*/) {
    //
};

Window_JunctionMagicParams.prototype.setTempActor = function(tempActor) {
    if (this._tempActor !== tempActor) {
        this._tempActor = tempActor;
        this.refresh();
    }
};

Window_JunctionMagicParams.prototype.item = function() {
    return this.itemAt(this.index());
};

Window_JunctionMagicParams.prototype.itemAt = function(index) {
    return this._data && index >= 0 ? this._data[index] : null;
};

Window_JunctionMagicParams.prototype.isCurrentItemEnabled = function() {
    return this.isEnabled(this._data[this.index()]);
};

Window_JunctionMagicParams.prototype.isEnabled = function(item) {
    return this._actor.skills().some(skill => skill.junction === item.key);
};

Window_JunctionMagicParams.prototype.makeItemList = function() {
    this._data = [
        { key: 'mhp', label: TextManager.basic(3), type: 'param', id: 0 },
        { key: 'agi', label: py06pd.JunctionMagic.vocabAGI, type: 'param', id: 6 },
        { key: 'atk', label: py06pd.JunctionMagic.vocabATK, type: 'param', id: 2 },
        { key: 'hit', label: py06pd.JunctionMagic.vocabHIT, type: 'xparam', id: 0 },
        { key: 'def', label: py06pd.JunctionMagic.vocabDEF, type: 'param', id: 3 },
        { key: 'eva', label: py06pd.JunctionMagic.vocabEVA, type: 'xparam', id: 1 },
        { key: 'mat', label: py06pd.JunctionMagic.vocabMAT, type: 'param', id: 4 },
        { key: 'luk', label: py06pd.JunctionMagic.vocabLUK, type: 'param', id: 7 },
        { key: 'mdf', label: py06pd.JunctionMagic.vocabMDF, type: 'param', id: 5 }
    ];
};

Window_JunctionMagicParams.prototype.drawItem = function(index) {
    const item = this.itemAt(index);
    if (item) {
        const rect = this.itemLineRect(index);
        const width = this.numberWidth();
        this.changePaintOpacity(this.isEnabled(item));
        this.changeTextColor(ColorManager.normalColor());

        let value = this._actor[item.key];
        if (this._tempActor) {
            const newValue = this._tempActor[item.key];
            const diff = newValue - value;
            value = newValue;
            this.changeTextColor(ColorManager.paramchangeTextColor(diff));
        }

        if (['hit', 'eva'].includes(item.key)) {
            value = Math.floor(Math.floor(value * 1000) / 10);
        }

        this.drawText(item.label, rect.x, rect.y, rect.width);

        const longest = this._data.map(a => a.label).sort((a, b) => b.length - a.length)[0];
        const offset = this.textWidth(longest + ' ');
        let skill = '----';
        const magic = (this._tempActor ? this._tempActor : this._actor)
            .equippedMagic(item.type, item.id);
        if (magic) {
            skill = $dataSkills[magic].name;
        }

        this.drawText(skill, rect.x + offset, rect.y, rect.width - width);
        this.drawText(value, rect.x, rect.y, rect.width, "right");
        this.changePaintOpacity(1);
    }
};

Window_JunctionMagicParams.prototype.numberWidth = function() {
    return this.textWidth("0000");
};

Window_JunctionMagicParams.prototype.drawItemBackground = function(index) {
    Window_Selectable.prototype.drawItemBackground.call(this, index);
};

Window_JunctionMagicParams.prototype.refresh = function() {
    this.makeItemList();
    Window_StatusBase.prototype.refresh.call(this);
};

//=============================================================================
// Window_JunctionMagic
//=============================================================================

function Window_JunctionMagic() {
    this.initialize(...arguments);
}

Window_JunctionMagic.prototype = Object.create(Window_SkillList.prototype);
Window_JunctionMagic.prototype.constructor = Window_JunctionMagic;

Window_JunctionMagic.prototype.initialize = function(rect) {
    Window_SkillList.prototype.initialize.call(this, rect);
    this.hide();
};

Window_JunctionMagic.prototype.maxCols = function() {
    return 1;
};

Window_JunctionMagic.prototype.colSpacing = function() {
    return 8;
};

Window_JunctionMagic.prototype.isEnabled = function(item) {
    return true;
};

Window_JunctionMagic.prototype.makeItemList = function() {
    Window_SkillList.prototype.makeItemList.call(this);
    this._data = [null].concat(this._data);
};

Window_JunctionMagic.prototype.setParamsWindow = function(window) {
    this._paramsWindow = window;
    this.callUpdateHelp();
};

Window_JunctionMagic.prototype.open = function(type, id) {
    this._paramType = type;
    this._paramId = id;
    this.refresh();
    this.show();
    this.activate();
    this.select(0);
};

Window_JunctionMagic.prototype.updateHelp = function() {
    Window_SkillList.prototype.updateHelp.call(this);
    if (this._paramType !== null) {
        const actor = JsonEx.makeDeepCopy(this._actor);
        actor.equipMagic(this._paramType, this._paramId, this.item() ? this.item().id : null);
        this._paramsWindow.setTempActor(actor);
    }
};

//=============================================================================
// Window_SkillList
//=============================================================================

Window_SkillList.prototype.drawEquippedIcon = function(skill, x, y, width) {
    if (this._actor.isEquippedMagic(skill.id)) {
        const iconY = (this.lineHeight() - ImageManager.iconHeight) / 2;
        this.drawIcon(py06pd.JunctionMagic.equippedIcon, x, y + iconY);
    }
};