//=============================================================================
// RPG Maker MZ - Junk Shop
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Junk shop.
 * @author Peter Dawson
 *
 * @help py06pd_JunkShop.js
 *
 * Use json data for note in $dataWeapons to specify items for synthesis
 * {
 *   "synth": {
 *     "vis":"<name of item that make the weapon visible in junk shop ie. weapon magazine name>",
 *     "req": [
 *       {
 *         "name": "<name of item required>",
 *         "amount": <amount of item required>
 *       },
 *       ...
 *     ]
 *   }
 * }
 */

var py06pd = py06pd || {};
py06pd.JunkShop = py06pd.JunkShop || {};

(function() {

//=============================================================================
// BattleManager
//=============================================================================

    py06pd.JunkShop.DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        if (!py06pd.JunkShop.DataManager_isDatabaseLoaded.call(this)) {
            return false;
        }
        if (!py06pd.JunkShop.DatabaseLoaded) {
            $dataWeapons.forEach(item => {
                if (item) {
                    item.synth = py06pd.Utils.ReadJsonNote(item, 'synth');
                }
            });

            py06pd.JunkShop.DatabaseLoaded = true;
        }

        return true;
    };
})();

//=============================================================================
// Scene_JunkShop
//=============================================================================

function Scene_JunkShop() {
    this.initialize(...arguments);
}

Scene_JunkShop.prototype = Object.create(Scene_MenuBase.prototype);
Scene_JunkShop.prototype.constructor = Scene_JunkShop;

Scene_JunkShop.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_JunkShop.prototype.prepare = function() {
    this._item = null;
};

Scene_JunkShop.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createHelpWindow();
    this.createGoldWindow();
    this.createStatusWindow();
    this.createBuyWindow();
};

Scene_JunkShop.prototype.createGoldWindow = function() {
    const rect = this.goldWindowRect();
    this._goldWindow = new Window_Gold(rect);
    this.addWindow(this._goldWindow);
};

Scene_JunkShop.prototype.goldWindowRect = function() {
    const ww = this.mainCommandWidth();
    const wh = this.calcWindowHeight(1, true);
    const wx = Graphics.boxWidth - ww;
    const wy = this.mainAreaTop();
    return new Rectangle(wx, wy, ww, wh);
};

Scene_JunkShop.prototype.createStatusWindow = function() {
    const rect = this.statusWindowRect();
    this._statusWindow = new Window_JunkShopStatus(rect);
    this._statusWindow.hide();
    this.addWindow(this._statusWindow);
};

Scene_JunkShop.prototype.statusWindowRect = function() {
    const ww = this.statusWidth();
    const wh = this.mainAreaHeight();
    const wx = Graphics.boxWidth - ww;
    const wy = this.mainAreaTop();
    return new Rectangle(wx, wy, ww, wh);
};

Scene_JunkShop.prototype.createBuyWindow = function() {
    const rect = this.buyWindowRect();
    this._buyWindow = new Window_JunkShopBuy(rect);
    this._buyWindow.setHelpWindow(this._helpWindow);
    this._buyWindow.setStatusWindow(this._statusWindow);
    this._buyWindow.hide();
    this._buyWindow.setHandler("ok", this.onBuyOk.bind(this));
    this._buyWindow.setHandler("cancel", this.popScene.bind(this));
    this.addWindow(this._buyWindow);
    this.activateBuyWindow();
};

Scene_JunkShop.prototype.buyWindowRect = function() {
    const wx = 0;
    const wy = this.mainAreaTop();
    const ww = Graphics.boxWidth - this.statusWidth();
    const wh = this.mainAreaHeight();
    return new Rectangle(wx, wy, ww, wh);
};

Scene_JunkShop.prototype.statusWidth = function() {
    return 352;
};

Scene_JunkShop.prototype.activateBuyWindow = function() {
    this._buyWindow.show();
    this._buyWindow.activate();
    this._statusWindow.show();
};

Scene_JunkShop.prototype.onBuyOk = function() {
    this._item = this._buyWindow.item();
    SoundManager.playShop();
    $gameParty.loseGold(this._item.price);
    $gameParty.gainItem(this._item, 1);
    this.activateBuyWindow();
    this._goldWindow.refresh();
    this._statusWindow.refresh();
};

//=============================================================================
// Window_JunkShopBuy
//=============================================================================

function Window_JunkShopBuy() {
    this.initialize(...arguments);
}

Window_JunkShopBuy.prototype = Object.create(Window_Selectable.prototype);
Window_JunkShopBuy.prototype.constructor = Window_JunkShopBuy;

Window_JunkShopBuy.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this.refresh();
    this.select(0);
};

Window_JunkShopBuy.prototype.maxItems = function() {
    return this._data ? this._data.length : 1;
};

Window_JunkShopBuy.prototype.item = function() {
    return this.itemAt(this.index());
};

Window_JunkShopBuy.prototype.itemAt = function(index) {
    return this._data && index >= 0 ? this._data[index] : null;
};

Window_JunkShopBuy.prototype.isCurrentItemEnabled = function() {
    return this.isEnabled(this._data[this.index()]);
};

Window_JunkShopBuy.prototype.isEnabled = function(item) {
    return item.price <= $gameParty.gold() && this.hasItems(item);
};

Window_JunkShopBuy.prototype.hasItems = function(item) {
    return item &&
        !item.synth.req.some(i => $gameParty.numItems($dataItems.find(j => j && j.name === i.name)) < i.amount);
};

Window_JunkShopBuy.prototype.refresh = function() {
    this.makeItemList();
    Window_Selectable.prototype.refresh.call(this);
};

Window_JunkShopBuy.prototype.includes = function(item) {
    if (item && item.synth) {
        const item1 = $dataItems.find(i => i && i.name === item.synth.vis);
        return this.hasItems(item) || $gameParty.numItems(item1) > 0;
    }

    return false;
};

Window_JunkShopBuy.prototype.makeItemList = function() {
    this._data = $dataWeapons.filter(item => this.includes(item));
};

Window_JunkShopBuy.prototype.drawItem = function(index) {
    const item = this.itemAt(index);
    const price = item.price;
    const rect = this.itemLineRect(index);
    const priceWidth = this.priceWidth();
    const priceX = rect.x + rect.width - priceWidth;
    const nameWidth = rect.width - priceWidth;
    this.changePaintOpacity(this.isEnabled(item));
    this.drawItemName(item, rect.x, rect.y, nameWidth);
    this.drawText(price, priceX, rect.y, priceWidth, "right");
    this.changePaintOpacity(true);
};

Window_JunkShopBuy.prototype.priceWidth = function() {
    return 96;
};

Window_JunkShopBuy.prototype.setStatusWindow = function(statusWindow) {
    this._statusWindow = statusWindow;
    this.callUpdateHelp();
};

Window_JunkShopBuy.prototype.updateHelp = function() {
    this.setHelpWindowItem(this.item());
    if (this._statusWindow) {
        this._statusWindow.setItem(this.item());
    }
};

//=============================================================================
// Window_JunkShopStatus
//=============================================================================

function Window_JunkShopStatus() {
    this.initialize(...arguments);
}

Window_JunkShopStatus.prototype = Object.create(Window_StatusBase.prototype);
Window_JunkShopStatus.prototype.constructor = Window_JunkShopStatus;

Window_JunkShopStatus.prototype.initialize = function(rect) {
    Window_StatusBase.prototype.initialize.call(this, rect);
    this._item = null;
    this.refresh();
};

Window_JunkShopStatus.prototype.refresh = function() {
    this.contents.clear();
    if (this._item) {
        const actor = $gameParty.members().find(member => member.canEquip(this._item));
        if (actor) {
            this.drawActorEquipInfo(actor);
        }

        const x = this.itemPadding();
        this._item.synth.req.forEach((item, i) => {
            const item1 = $dataItems.find(j => j && j.name === item.name);
            const numItems = $gameParty.numItems(item1);
            this.changePaintOpacity(numItems >= item.amount);
            this.drawItemInfo(x, (5 + i) * this.lineHeight(), item);
            this.changePaintOpacity(true);
        });
    }
};

Window_JunkShopStatus.prototype.setItem = function(item) {
    this._item = item;
    this.refresh();
};

Window_JunkShopStatus.prototype.drawActorEquipInfo = function(actor) {
    const item1 = actor.weapons()[0];
    const x = this.itemPadding();
    const width = this.innerWidth - x - this.itemPadding();
    const enabled = actor.canEquip(this._item);
    this.resetTextColor();
    this.drawText(actor.name(), x, 0, width);
    this.drawItemName(item1, x, this.lineHeight(), width);
    const y = 2 * this.lineHeight();
    if (enabled) {
        this.drawActorParamChange(x, y, actor, 2);
        this.drawActorParamChange(x, y + this.lineHeight(), actor, -1, 0);
    }
};

Window_JunkShopStatus.prototype.drawActorParamChange = function(x, y, actor, paramId, xParamId) {
    const paramX = this.paramX();
    const paramWidth = this.paramWidth();
    const rightArrowWidth = this.rightArrowWidth();
    this.drawParamName(x, y, paramId, xParamId);
    this.drawCurrentParam(paramX, y, actor, paramId, xParamId);
    this.drawRightArrow(paramX + paramWidth, y);
    this.drawNewParam(paramX + paramWidth + rightArrowWidth, y, actor, paramId, xParamId);
};

Window_JunkShopStatus.prototype.drawParamName = function(x, y, paramId, xParamId) {
    const width = this.paramX() - this.itemPadding() * 2;
    this.changeTextColor(ColorManager.systemColor());
    if (paramId >= 0) {
        this.drawText(TextManager.param(paramId), x, y, width);
    } else {
        this.drawText(TextManager.param(8 + xParamId), x, y, width);
    }
};

Window_JunkShopStatus.prototype.drawCurrentParam = function(x, y, actor, paramId, xParamId) {
    const paramWidth = this.paramWidth();
    this.resetTextColor();
    this.drawText(this.paramValue(actor.weapons()[0], paramId, xParamId), x, y, paramWidth, "right");
};

Window_JunkShopStatus.prototype.drawRightArrow = function(x, y) {
    const rightArrowWidth = this.rightArrowWidth();
    this.changeTextColor(ColorManager.systemColor());
    this.drawText("\u2192", x, y, rightArrowWidth, "center");
};

Window_JunkShopStatus.prototype.drawNewParam = function(x, y, actor, paramId, xParamId) {
    const paramWidth = this.paramWidth();
    const newValue = this.paramValue(this._item, paramId, xParamId);
    const diffvalue = newValue - this.paramValue(actor.weapons()[0], paramId, xParamId);
    this.changeTextColor(ColorManager.paramchangeTextColor(diffvalue));
    this.drawText(newValue, x, y, paramWidth, "right");
};

Window_JunkShopStatus.prototype.rightArrowWidth = function() {
    return 32;
};

Window_JunkShopStatus.prototype.paramWidth = function() {
    return 48;
};

Window_JunkShopStatus.prototype.paramX = function() {
    const itemPadding = this.itemPadding();
    const rightArrowWidth = this.rightArrowWidth();
    const paramWidth = this.paramWidth();
    return this.innerWidth - itemPadding - paramWidth * 2 - rightArrowWidth;
};

Window_JunkShopStatus.prototype.paramValue = function(item, paramId, xParamId) {
    return paramId >= 0 ?
        $dataWeapons[item.id].params[paramId] :
        Math.round(($dataWeapons[item.id].traits
            .find(t => t.code === Game_BattlerBase.TRAIT_XPARAM &&
                t.dataId === xParamId)?.value ?? 0) * 100);
};

Window_JunkShopStatus.prototype.drawItemInfo = function(x, y, item) {
    const width = this.innerWidth - x - this.itemPadding();
    this.resetTextColor();
    const item1 = $dataItems.find(i => i && i.name === item.name);
    const numItems = $gameParty.numItems(item1);
    const value = numItems + "/" + item.amount;
    const textWidth = this.textWidth(value);
    this.drawText(value, x, y, width, "right");
    this.drawItemName(item1, x, y, width - textWidth - 8);
};