/* ============================================================
   NEW FILE — "Wait for digit & buy" statement block.
   If the last X digits satisfy the comparison → capture the
   trigger digit → wait tick-by-tick for it to appear again →
   purchase (digit contracts auto-predict the trigger digit).
   Place inside Purchase conditions.
   ============================================================ */
import { localize } from '@deriv-com/translations';
import { modifyContextMenu } from '../../../utils';

window.Blockly.Blocks.wait_digit_buy = {
    init() {
        this.jsonInit(this.definition());
    },
    definition() {
        return {
            message0: localize(
                'If last {{ x }} digits are {{ comparison }} value {{ y }} then wait for that digit and purchase {{ contract_type }}',
                { x: '%1', comparison: '%2', y: '%3', contract_type: '%4' }
            ),
            args0: [
                {
                    type: 'input_value',
                    name: 'COUNT',
                    check: 'Number',
                },
                {
                    type: 'field_dropdown',
                    name: 'COMPARISON',
                    options: [
                        [localize('All Same'), 'all_same'],
                        [localize('All Different'), 'all_diff'],
                        [localize('Greater Than'), 'gt'],
                        [localize('Greater Than or Equal'), 'gte'],
                        [localize('Less Than'), 'lt'],
                        [localize('Less Than or Equal'), 'lte'],
                        [localize('Equal To'), 'eq'],
                        [localize('Not Equal To'), 'neq'],
                    ],
                },
                {
                    type: 'input_value',
                    name: 'DIGIT',
                    check: 'Number',
                },
                {
                    type: 'field_dropdown',
                    name: 'PURCHASE_LIST',
                    options: [
                        [localize('Matches'), 'DIGITMATCH'],
                        [localize('Differs'), 'DIGITDIFF'],
                        [localize('Over'), 'DIGITOVER'],
                        [localize('Under'), 'DIGITUNDER'],
                        [localize('Even'), 'DIGITEVEN'],
                        [localize('Odd'), 'DIGITODD'],
                        [localize('Rise'), 'CALL'],
                        [localize('Fall'), 'PUT'],
                    ],
                },
            ],
            inputsInline: true,
            previousStatement: null,
            nextStatement: null,
            colour: window.Blockly.Colours.Special1.colour,
            colourSecondary: window.Blockly.Colours.Special1.colourSecondary,
            colourTertiary: window.Blockly.Colours.Special1.colourTertiary,
            tooltip: localize(
                'Step 1: checks whether the last X digits satisfy the comparison (e.g. All Same for 777). Step 2: when met, captures the trigger digit and waits tick by tick for it to appear again. Step 3: purchases immediately; Matches/Differs/Over/Under automatically use the trigger digit as the prediction.'
            ),
            category: window.Blockly.Categories.Before_Purchase,
        };
    },
    meta() {
        return {
            display_name: localize('Wait for digit & buy'),
            description: localize(
                'If the last X digits are e.g. all the same, this block waits for that same digit to appear once more and then buys the selected contract — the classic "wait for a repeated digit" entry, in one block.'
            ),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
    restricted_parents: ['before_purchase'],
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.wait_digit_buy = block => {
    const count =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'COUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '3';
    const comparison = block.getFieldValue('COMPARISON');
    const digit =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'DIGIT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '0';
    const purchase_list = block.getFieldValue('PURCHASE_LIST');

    return `Bot.tkWaitDigitBuy(${count}, '${comparison}', ${digit}, '${purchase_list}');\n`;
};
