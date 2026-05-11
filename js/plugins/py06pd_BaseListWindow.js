//=============================================================================
// RPG Maker MZ - Base List Window
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Base list window.
 * @author Peter Dawson
 *
 * @help Abstract common list methods
 *
 */

function Window_BaseList() {
    this.initialize(...arguments);
}

Window_BaseList.prototype = Object.create(Window_Selectable.prototype);
Window_BaseList.prototype.constructor = Window_BaseList;

Window_BaseList.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this._data = [];
};

Window_BaseList.prototype.maxItems = function() {
    return this._data ? this._data.length : 1;
};

Window_BaseList.prototype.item = function() {
    return this.itemAt(this.index());
};

Window_BaseList.prototype.itemAt = function(index) {
    return this._data && index >= 0 ? this._data[index] : null;
};

Window_BaseList.prototype.isCurrentItemEnabled = function() {
    return this.isEnabled(this.item());
};

Window_BaseList.prototype.isEnabled = function(item) {
    return true;
};

Window_BaseList.prototype.makeItemList = function() {
    this._data = [];
};

Window_BaseList.prototype.updateHelp = function() {
    this.setHelpWindowItem(this.item());
};

Window_BaseList.prototype.refresh = function() {
    this.makeItemList();
    Window_Selectable.prototype.refresh.call(this);
};
