/* ============================================================
   NEW FILE — "Trigger digit" value block.
   Returns the digit captured by the most recent wait-for-digit
   block run (useful in Restart conditions / notifications).
   ============================================================ */
import { localize } from '@deriv-com/translations';
import { modifyContextMenu } from '../../../utils';

window.Blockly.Blocks.trigger_digit = {
    init() {
        this.jsonInit(this.definition());
    },
    definition() {
        return {
            message0: localize('Trigger digit (last wait-for-digit)'),
            output: 'Number',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: window.Blockly.Colours.Base.colour,
            colourSecondary: window.Blockly.Colours.Base.colourSecondary,
            colourTertiary: window.Blockly.Colours.Base.colourTertiary,
            tooltip: localize('The digit captured by the most recent "Wait for digit & buy" block.'),
            category: window.Blockly.Categories.Tick_Analysis,
        };
    },
    meta() {
        return {
            display_name: localize('Trigger digit'),
            description: localize(
                'Returns the repeated/trigger digit that the last "Wait for digit & buy" block armed on. Returns -1 if no wait has run yet.'
            ),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.trigger_digit = () => [
    'Bot.tkGetTriggerDigit()',
    window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC,
];
