//=============================================================================
// RPG Maker MZ - Utils
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Utility methods.
 * @author Peter Dawson
 *
 * @help PDA_Utils.js
 *
 */

var py06pd = py06pd || {};
py06pd.Utils = py06pd.Utils || {};
py06pd.Utils.ReadJsonNote = (data, field, defaultValue) => {
    if (data.note && data.note.substring(0, 1) === "{") {
        const parsed = JSON.parse(data.note.replaceAll('\\n', ''));
        if (parsed[field]) {
            return parsed[field];
        }
    }

    return defaultValue;
};
